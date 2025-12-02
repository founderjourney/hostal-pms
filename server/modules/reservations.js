// ============================================
// ALMANIK PMS - RESERVATIONS MODULE
// Sistema completo de gestión de reservas
// ============================================

const express = require('express');
const router = express.Router();
const DatabaseAdapter = require('../db-adapter');

const db = new DatabaseAdapter();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generar código de confirmación único
 * Formato: ALM-YYYYMMDD-HHMM
 */
function generateConfirmationCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `ALM-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Calcular número de noches entre dos fechas
 */
function calculateNights(checkIn, checkOut) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate - checkInDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Validar rango de fechas
 */
function validateDateRange(checkIn, checkOut) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check-in debe ser hoy o en el futuro
  if (checkInDate < today) {
    return { valid: false, error: 'Check-in date cannot be in the past' };
  }

  // Check-out debe ser después de check-in
  if (checkOutDate <= checkInDate) {
    return { valid: false, error: 'Check-out date must be after check-in date' };
  }

  return { valid: true };
}

/**
 * Verificar disponibilidad de cama para fechas específicas
 * INCLUYE reservas internas (bookings) Y externas (Booking.com, Airbnb via iCal)
 */
async function checkBedAvailability(bedId, checkIn, checkOut, excludeBookingId = null) {
  await db.ensureConnection();

  // 1. Query para buscar conflictos en reservas INTERNAS
  const internalQuery = `
    SELECT id, confirmation_code, check_in, check_out, status, 'internal' as source
    FROM bookings
    WHERE bed_id = $1
      AND status IN ('pending', 'confirmed', 'checked_in', 'active')
      AND (
        (check_in <= $2 AND check_out > $2) OR
        (check_in < $3 AND check_out >= $3) OR
        (check_in >= $2 AND check_out <= $3)
      )
      ${excludeBookingId ? 'AND id != $4' : ''}
  `;

  const internalParams = excludeBookingId
    ? [bedId, checkIn, checkOut, excludeBookingId]
    : [bedId, checkIn, checkOut];

  const internalConflicts = await db.query(internalQuery, internalParams);

  // 2. Query para buscar conflictos en reservas EXTERNAS (Booking.com, Airbnb via iCal)
  let externalConflicts = [];
  try {
    const externalQuery = `
      SELECT
        er.id,
        er.external_id as confirmation_code,
        er.check_in,
        er.check_out,
        er.status,
        'external' as source,
        is2.name as platform_name
      FROM external_reservations er
      JOIN ical_sources is2 ON er.source_id = is2.id
      WHERE is2.bed_id = $1
        AND er.status IN ('confirmed', 'tentative')
        AND (
          (er.check_in <= $2 AND er.check_out > $2) OR
          (er.check_in < $3 AND er.check_out >= $3) OR
          (er.check_in >= $2 AND er.check_out <= $3)
        )
    `;

    externalConflicts = await db.query(externalQuery, [bedId, checkIn, checkOut]);
  } catch (error) {
    // Si la tabla external_reservations no existe, ignorar el error
    console.log('Note: external_reservations table may not exist yet');
  }

  // 3. Combinar todos los conflictos
  const allConflicts = [...internalConflicts, ...externalConflicts];

  return {
    available: allConflicts.length === 0,
    conflictingBookings: allConflicts,
    internalConflicts: internalConflicts.length,
    externalConflicts: externalConflicts.length
  };
}

/**
 * Calcular precio total de la reserva
 */
async function calculateBookingTotal(bedId, nights) {
  await db.ensureConnection();

  const bed = await db.get('SELECT price FROM beds WHERE id = $1', [bedId]);

  if (!bed) {
    throw new Error('Bed not found');
  }

  return parseFloat(bed.price) * nights;
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /api/reservations
 * Listar todas las reservas con filtros opcionales
 */
router.get('/', async (req, res) => {
  try {
    await db.ensureConnection();

    const { status, guest_id, bed_id, date_from, date_to } = req.query;

    let query = `
      SELECT
        b.*,
        g.name as guest_name,
        g.document as guest_document,
        g.email as guest_email,
        g.phone as guest_phone,
        bd.name as bed_name,
        bd.room as room_name,
        bd.price as bed_price
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filtro por estado
    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Filtro por huésped
    if (guest_id) {
      query += ` AND b.guest_id = $${paramCount}`;
      params.push(guest_id);
      paramCount++;
    }

    // Filtro por cama
    if (bed_id) {
      query += ` AND b.bed_id = $${paramCount}`;
      params.push(bed_id);
      paramCount++;
    }

    // Filtro por rango de fechas
    if (date_from) {
      query += ` AND b.check_out >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND b.check_in <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += ` ORDER BY b.check_in DESC, b.created_at DESC`;

    const reservations = await db.query(query, params);

    res.json({
      success: true,
      count: reservations.length,
      reservations: reservations
    });

  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reservations',
      message: error.message
    });
  }
});

/**
 * POST /api/reservations
 * Crear nueva reserva
 */
router.post('/', async (req, res) => {
  try {
    await db.ensureConnection();

    const { guest_id, bed_id, check_in, check_out, source = 'walkin' } = req.body;

    // Validaciones básicas
    if (!guest_id || !bed_id || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: guest_id, bed_id, check_in, check_out'
      });
    }

    // Validar rango de fechas
    const dateValidation = validateDateRange(check_in, check_out);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error
      });
    }

    // Verificar que el huésped existe
    const guest = await db.get('SELECT id, name FROM guests WHERE id = $1', [guest_id]);
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    // Verificar que la cama existe
    const bed = await db.get('SELECT id, name, status FROM beds WHERE id = $1', [bed_id]);
    if (!bed) {
      return res.status(404).json({
        success: false,
        error: 'Bed not found'
      });
    }

    // Verificar disponibilidad
    const availability = await checkBedAvailability(bed_id, check_in, check_out);
    if (!availability.available) {
      return res.status(409).json({
        success: false,
        error: 'Bed is not available for the selected dates',
        conflictingBookings: availability.conflictingBookings
      });
    }

    // Calcular noches y total
    const nights = calculateNights(check_in, check_out);
    const total = await calculateBookingTotal(bed_id, nights);

    // Generar código de confirmación
    const confirmation_code = generateConfirmationCode();

    // Crear reserva
    const insertQuery = `
      INSERT INTO bookings (
        guest_id, bed_id, check_in, check_out, nights, total,
        confirmation_code, status, source, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const userId = req.session?.userId || null; // Si tenemos sesión con user ID

    const result = await db.run(insertQuery, [
      guest_id,
      bed_id,
      check_in,
      check_out,
      nights,
      total,
      confirmation_code,
      'pending', // Estado inicial
      source,
      userId
    ]);

    // Obtener la reserva creada con detalles
    const newReservation = await db.get(`
      SELECT
        b.*,
        g.name as guest_name,
        bd.name as bed_name,
        bd.room as room_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      WHERE b.id = $1
    `, [result.id]);

    // Log de actividad
    await db.run(`
      INSERT INTO activity_log (
        action_type, module, description, user_id, entity_type, entity_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      'create',
      'reservations',
      `Reservation created: ${guest.name} - Bed ${bed.name} (${confirmation_code})`,
      userId,
      'booking',
      result.id
    ]);

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      reservation: newReservation
    });

  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reservation',
      message: error.message
    });
  }
});

/**
 * GET /api/reservations/:id
 * Obtener una reserva específica por ID
 */
router.get('/:id', async (req, res) => {
  try {
    await db.ensureConnection();

    const { id } = req.params;

    const reservation = await db.get(`
      SELECT
        b.*,
        g.name as guest_name,
        g.document as guest_document,
        g.email as guest_email,
        g.phone as guest_phone,
        bd.name as bed_name,
        bd.room as room_name,
        bd.price as bed_price,
        u.name as created_by_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `, [id]);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }

    // Obtener transacciones asociadas
    const transactions = await db.query(`
      SELECT * FROM transactions
      WHERE booking_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      reservation: reservation,
      transactions: transactions
    });

  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reservation',
      message: error.message
    });
  }
});

/**
 * PUT /api/reservations/:id
 * Actualizar una reserva existente
 */
router.put('/:id', async (req, res) => {
  try {
    await db.ensureConnection();

    const { id } = req.params;
    const { check_in, check_out, bed_id, status } = req.body;

    // Verificar que la reserva existe
    const existingReservation = await db.get('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!existingReservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }

    // No permitir editar reservas ya completadas o canceladas
    if (['checked_out', 'cancelled', 'no_show'].includes(existingReservation.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify completed or cancelled reservations'
      });
    }

    // Si se están cambiando las fechas o la cama, validar
    const newCheckIn = check_in || existingReservation.check_in;
    const newCheckOut = check_out || existingReservation.check_out;
    const newBedId = bed_id || existingReservation.bed_id;

    // Validar rango de fechas
    if (check_in || check_out) {
      const dateValidation = validateDateRange(newCheckIn, newCheckOut);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: dateValidation.error
        });
      }
    }

    // Verificar disponibilidad (excluyendo esta reserva)
    const availability = await checkBedAvailability(newBedId, newCheckIn, newCheckOut, id);
    if (!availability.available) {
      return res.status(409).json({
        success: false,
        error: 'Bed is not available for the selected dates',
        conflictingBookings: availability.conflictingBookings
      });
    }

    // Recalcular noches y total si cambiaron las fechas
    const nights = calculateNights(newCheckIn, newCheckOut);
    const total = await calculateBookingTotal(newBedId, nights);

    // Actualizar reserva
    const updateQuery = `
      UPDATE bookings
      SET
        check_in = $1,
        check_out = $2,
        bed_id = $3,
        nights = $4,
        total = $5,
        status = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `;

    await db.run(updateQuery, [
      newCheckIn,
      newCheckOut,
      newBedId,
      nights,
      total,
      status || existingReservation.status,
      id
    ]);

    // Obtener reserva actualizada
    const updatedReservation = await db.get(`
      SELECT
        b.*,
        g.name as guest_name,
        bd.name as bed_name,
        bd.room as room_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      WHERE b.id = $1
    `, [id]);

    // Log de actividad
    const userId = req.session?.userId || null;
    await db.run(`
      INSERT INTO activity_log (
        action_type, module, description, user_id, entity_type, entity_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      'update',
      'reservations',
      `Reservation updated: ${updatedReservation.confirmation_code}`,
      userId,
      'booking',
      id
    ]);

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      reservation: updatedReservation
    });

  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reservation',
      message: error.message
    });
  }
});

/**
 * DELETE /api/reservations/:id
 * Cancelar una reserva
 */
router.delete('/:id', async (req, res) => {
  try {
    await db.ensureConnection();

    const { id } = req.params;
    const { reason } = req.body;

    // Verificar que la reserva existe
    const reservation = await db.get('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }

    // No permitir cancelar reservas ya completadas
    if (reservation.status === 'checked_out') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed reservations'
      });
    }

    // Ya cancelada
    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Reservation is already cancelled'
      });
    }

    // Actualizar estado a cancelado
    await db.run(`
      UPDATE bookings
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Si la cama estaba reservada/ocupada, liberarla
    if (reservation.status === 'confirmed' || reservation.status === 'checked_in') {
      await db.run(`
        UPDATE beds
        SET status = 'clean', guest_id = NULL
        WHERE id = $1
      `, [reservation.bed_id]);
    }

    // Log de actividad
    const userId = req.session?.userId || null;
    await db.run(`
      INSERT INTO activity_log (
        action_type, module, description, user_id, entity_type, entity_id, details, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      'delete',
      'reservations',
      `Reservation cancelled: ${reservation.confirmation_code}`,
      userId,
      'booking',
      id,
      JSON.stringify({ reason: reason || 'No reason provided' })
    ]);

    res.json({
      success: true,
      message: 'Reservation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel reservation',
      message: error.message
    });
  }
});

/**
 * POST /api/reservations/:id/confirm
 * Confirmar una reserva pendiente
 */
router.post('/:id/confirm', async (req, res) => {
  try {
    await db.ensureConnection();

    const { id } = req.params;

    // Verificar que la reserva existe
    const reservation = await db.get('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }

    // Solo se pueden confirmar reservas pendientes
    if (reservation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot confirm reservation with status: ${reservation.status}`
      });
    }

    // Verificar disponibilidad nuevamente (por si acaso)
    const availability = await checkBedAvailability(
      reservation.bed_id,
      reservation.check_in,
      reservation.check_out,
      id
    );

    if (!availability.available) {
      return res.status(409).json({
        success: false,
        error: 'Bed is no longer available',
        conflictingBookings: availability.conflictingBookings
      });
    }

    // Confirmar reserva
    await db.run(`
      UPDATE bookings
      SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Crear transacción automática (cargo por la reserva)
    await db.run(`
      INSERT INTO transactions (
        booking_id, type, description, amount, method, created_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [
      id,
      'charge',
      `Room charge - ${reservation.nights} nights`,
      reservation.total,
      'pending'
    ]);

    // Log de actividad
    const userId = req.session?.userId || null;
    await db.run(`
      INSERT INTO activity_log (
        action_type, module, description, user_id, entity_type, entity_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      'update',
      'reservations',
      `Reservation confirmed: ${reservation.confirmation_code}`,
      userId,
      'booking',
      id
    ]);

    // Obtener reserva actualizada
    const confirmedReservation = await db.get(`
      SELECT
        b.*,
        g.name as guest_name,
        bd.name as bed_name,
        bd.room as room_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      WHERE b.id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Reservation confirmed successfully',
      reservation: confirmedReservation
    });

  } catch (error) {
    console.error('Error confirming reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm reservation',
      message: error.message
    });
  }
});

/**
 * GET /api/reservations/availability/check
 * Verificar disponibilidad de camas para fechas específicas
 */
router.get('/availability/check', async (req, res) => {
  try {
    await db.ensureConnection();

    const { check_in, check_out, bed_id } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: check_in, check_out'
      });
    }

    // Validar fechas
    const dateValidation = validateDateRange(check_in, check_out);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error
      });
    }

    // Si se especifica una cama, verificar solo esa
    if (bed_id) {
      const availability = await checkBedAvailability(bed_id, check_in, check_out);

      const bed = await db.get('SELECT * FROM beds WHERE id = $1', [bed_id]);

      return res.json({
        success: true,
        bed_id: bed_id,
        bed_name: bed?.name,
        available: availability.available,
        conflictingBookings: availability.conflictingBookings
      });
    }

    // Si no se especifica cama, buscar todas las camas disponibles
    const allBeds = await db.query('SELECT * FROM beds ORDER BY name');

    const availabilityResults = [];

    for (const bed of allBeds) {
      const availability = await checkBedAvailability(bed.id, check_in, check_out);

      availabilityResults.push({
        bed_id: bed.id,
        bed_name: bed.name,
        room: bed.room,
        price: bed.price,
        available: availability.available,
        conflictingBookings: availability.conflictingBookings
      });
    }

    const availableBeds = availabilityResults.filter(b => b.available);
    const occupiedBeds = availabilityResults.filter(b => !b.available);

    res.json({
      success: true,
      check_in,
      check_out,
      nights: calculateNights(check_in, check_out),
      total_beds: allBeds.length,
      available_beds_count: availableBeds.length,
      occupied_beds_count: occupiedBeds.length,
      available_beds: availableBeds,
      occupied_beds: occupiedBeds
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability',
      message: error.message
    });
  }
});

// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;
