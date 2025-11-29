/**
 * ALMANIK PMS - FRONT DESK MODULE
 *
 * Diseñado para el recepcionista a las 2am con cliente esperando.
 * Prioridad: VELOCIDAD y SIMPLICIDAD
 *
 * Endpoints:
 * - GET  /api/front-desk/status     → Vista rápida del estado actual
 * - POST /api/quick-checkin         → Check-in completo en UNA llamada
 * - POST /api/quick-checkout        → Check-out rápido
 * - POST /api/quick-payment         → Registrar pago rápido
 * - GET  /api/front-desk/search     → Búsqueda universal (nombre, doc, código)
 *
 * @module front-desk
 */

/**
 * Register front desk routes
 * @param {Express} app - Express application
 * @param {Function} requireAuth - Authentication middleware
 * @param {Function} dbAll - Database query all function
 * @param {Function} dbGet - Database get single function
 * @param {Function} dbRun - Database run function
 * @param {Function} logActivity - Activity logging function
 */
function registerFrontDeskRoutes(app, requireAuth, dbAll, dbGet, dbRun, logActivity) {

  // ============================================
  // GET /api/front-desk/guest-lookup
  // Buscar huésped por documento o nombre
  // PARA AUTOCOMPLETADO EN CHECK-IN
  // ============================================
  app.get('/api/front-desk/guest-lookup', requireAuth, async (req, res) => {
    try {
      const { q, document } = req.query;

      // Búsqueda exacta por documento (prioridad)
      if (document) {
        const guest = await dbGet(`
          SELECT
            g.*,
            (SELECT COUNT(*) FROM bookings WHERE guest_id = g.id) as total_stays,
            (SELECT MAX(check_out) FROM bookings WHERE guest_id = g.id) as last_checkout,
            (SELECT SUM(total) FROM bookings WHERE guest_id = g.id AND status IN ('checked_out', 'completed')) as total_spent
          FROM guests g
          WHERE g.document = ?
        `, [document]);

        if (guest) {
          return res.json({
            success: true,
            found: true,
            guest: {
              id: guest.id,
              name: guest.name,
              document: guest.document,
              phone: guest.phone,
              email: guest.email,
              nationality: guest.nationality || 'Colombia',
              is_blacklisted: guest.is_blacklisted,
              blacklist_reason: guest.blacklist_reason,
              total_stays: guest.total_stays || 0,
              last_checkout: guest.last_checkout,
              total_spent: guest.total_spent || 0,
              is_frequent: (guest.total_stays || 0) >= 3
            }
          });
        } else {
          return res.json({
            success: true,
            found: false,
            message: 'Huésped nuevo'
          });
        }
      }

      // Búsqueda parcial por nombre o documento
      if (q && q.length >= 2) {
        const searchTerm = `%${q}%`;
        const guests = await dbAll(`
          SELECT
            g.id,
            g.name,
            g.document,
            g.phone,
            g.nationality,
            g.is_blacklisted,
            (SELECT COUNT(*) FROM bookings WHERE guest_id = g.id) as total_stays
          FROM guests g
          WHERE g.name LIKE ? OR g.document LIKE ?
          ORDER BY g.name ASC
          LIMIT 10
        `, [searchTerm, searchTerm]);

        return res.json({
          success: true,
          count: guests.length,
          guests: guests
        });
      }

      res.status(400).json({
        success: false,
        error: 'Provide "document" for exact match or "q" for search (min 2 chars)'
      });

    } catch (err) {
      console.error('Guest lookup error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================
  // GET /api/front-desk/status
  // Vista rápida para el recepcionista
  // LO PRIMERO QUE VE AL ABRIR EL SISTEMA
  // ============================================
  app.get('/api/front-desk/status', requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Camas disponibles AHORA (lo más importante)
      const availability = await dbGet(`
        SELECT
          COUNT(*) as total_beds,
          SUM(CASE WHEN status = 'clean' THEN 1 ELSE 0 END) as available_now,
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN status = 'dirty' THEN 1 ELSE 0 END) as dirty,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
          MIN(CASE WHEN status = 'clean' THEN price END) as min_price
        FROM beds
      `);

      // 2. Llegadas esperadas HOY (sin check-in todavía)
      const pendingArrivals = await dbAll(`
        SELECT
          b.id as booking_id,
          b.confirmation_code,
          b.check_in,
          b.check_out,
          b.nights,
          b.total,
          b.status as booking_status,
          g.id as guest_id,
          g.name as guest_name,
          g.document as guest_document,
          g.phone as guest_phone,
          bd.id as bed_id,
          bd.name as bed_name,
          bd.room,
          bd.price as bed_price
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN beds bd ON b.bed_id = bd.id
        WHERE date(b.check_in) <= date(?)
          AND b.status IN ('pending', 'confirmed')
        ORDER BY b.check_in ASC
        LIMIT 20
      `, [today]);

      // 3. Checkouts vencidos (URGENTE - deben plata)
      const overdueCheckouts = await dbAll(`
        SELECT
          b.id as booking_id,
          b.check_out,
          b.total,
          g.name as guest_name,
          g.phone as guest_phone,
          bd.name as bed_name,
          bd.id as bed_id,
          COALESCE(
            (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
            0
          ) as total_paid,
          b.total - COALESCE(
            (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
            0
          ) as balance_due
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN beds bd ON b.bed_id = bd.id
        WHERE date(b.check_out) < date(?)
          AND b.status IN ('active', 'checked_in')
        ORDER BY b.check_out ASC
      `, [today]);

      // 4. Checkouts de HOY
      const todayCheckouts = await dbAll(`
        SELECT
          b.id as booking_id,
          b.check_out,
          b.total,
          g.name as guest_name,
          g.phone as guest_phone,
          bd.name as bed_name,
          bd.id as bed_id,
          COALESCE(
            (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
            0
          ) as total_paid,
          b.total - COALESCE(
            (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
            0
          ) as balance_due
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN beds bd ON b.bed_id = bd.id
        WHERE date(b.check_out) = date(?)
          AND b.status IN ('active', 'checked_in')
        ORDER BY b.check_out ASC
      `, [today]);

      // 5. Camas disponibles con detalle (para dropdown rápido)
      const availableBeds = await dbAll(`
        SELECT id, name, room, price, status
        FROM beds
        WHERE status = 'clean'
        ORDER BY price ASC, name ASC
      `);

      // 6. Huéspedes actuales (ocupando camas)
      const currentGuests = await dbAll(`
        SELECT
          b.id as booking_id,
          b.check_in,
          b.check_out,
          b.nights,
          b.total,
          g.id as guest_id,
          g.name as guest_name,
          g.document,
          bd.id as bed_id,
          bd.name as bed_name,
          bd.room,
          COALESCE(
            (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
            0
          ) as total_paid,
          b.total - COALESCE(
            (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
            0
          ) as balance_due
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN beds bd ON b.bed_id = bd.id
        WHERE b.status IN ('active', 'checked_in')
        ORDER BY bd.name ASC
      `);

      // 7. Alertas críticas
      const alerts = [];

      if (overdueCheckouts.length > 0) {
        alerts.push({
          type: 'urgent',
          icon: '🚨',
          message: `${overdueCheckouts.length} checkout(s) vencido(s)`,
          count: overdueCheckouts.length
        });
      }

      const dirtyBeds = await dbGet(`
        SELECT COUNT(*) as count FROM beds WHERE status = 'dirty'
      `);
      if (dirtyBeds.count > 0) {
        alerts.push({
          type: 'warning',
          icon: '🧹',
          message: `${dirtyBeds.count} cama(s) pendiente(s) de limpieza`,
          count: dirtyBeds.count
        });
      }

      if (availability.available_now === 0) {
        alerts.push({
          type: 'info',
          icon: '🛏️',
          message: 'No hay camas disponibles',
          count: 0
        });
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),

        // Lo más importante arriba
        quick_stats: {
          available_now: availability.available_now || 0,
          min_price: availability.min_price || 0,
          occupied: availability.occupied || 0,
          total_beds: availability.total_beds || 0,
          occupancy_rate: availability.total_beds > 0
            ? Math.round((availability.occupied / availability.total_beds) * 100)
            : 0
        },

        // Para acciones rápidas
        available_beds: availableBeds,

        // Llegadas pendientes
        pending_arrivals: pendingArrivals,
        pending_arrivals_count: pendingArrivals.length,

        // Checkouts
        overdue_checkouts: overdueCheckouts,
        today_checkouts: todayCheckouts,

        // Huéspedes actuales
        current_guests: currentGuests,
        current_guests_count: currentGuests.length,

        // Alertas
        alerts: alerts
      });

    } catch (err) {
      console.error('Front desk status error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // ============================================
  // POST /api/quick-checkin
  // CHECK-IN COMPLETO EN UNA SOLA LLAMADA
  // Para cliente nuevo sin reserva previa
  // ============================================
  app.post('/api/quick-checkin', requireAuth, async (req, res) => {
    try {
      const {
        // Datos del huésped (mínimos requeridos)
        guest_name,
        guest_document,
        guest_phone,      // opcional
        guest_email,      // opcional
        guest_nationality, // opcional, default 'Colombia'

        // Datos de la estancia
        bed_id,
        nights,           // default 1

        // Pago
        payment_method,   // 'cash', 'card', 'pending'
        payment_amount,   // si es parcial, sino se asume total

        // Extras opcionales
        notes,
        special_requests
      } = req.body;

      // ===== VALIDACIONES MÍNIMAS =====
      if (!guest_name || !guest_document || !bed_id) {
        return res.status(400).json({
          success: false,
          error: 'Datos requeridos: guest_name, guest_document, bed_id'
        });
      }

      // Verificar que la cama existe y está disponible
      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [bed_id]);
      if (!bed) {
        return res.status(404).json({
          success: false,
          error: 'Cama no encontrada'
        });
      }

      if (bed.status !== 'clean' && bed.status !== 'reserved') {
        return res.status(400).json({
          success: false,
          error: `Cama no disponible. Estado actual: ${bed.status}`,
          bed_status: bed.status
        });
      }

      // ===== CALCULAR FECHAS Y TOTAL =====
      const stayNights = parseInt(nights) || 1;
      const checkInDate = new Date();
      const checkOutDate = new Date();
      checkOutDate.setDate(checkOutDate.getDate() + stayNights);

      const checkIn = checkInDate.toISOString().split('T')[0];
      const checkOut = checkOutDate.toISOString().split('T')[0];
      const total = bed.price * stayNights;

      // ===== BUSCAR O CREAR HUÉSPED =====
      let guest = await dbGet(
        'SELECT * FROM guests WHERE document = ?',
        [guest_document]
      );

      let guestId;
      let isNewGuest = false;

      if (guest) {
        // Huésped existente - actualizar datos si hay nuevos
        guestId = guest.id;

        if (guest_phone || guest_email) {
          // SQLite simple no tiene nationality, usar query compatible
          await dbRun(`
            UPDATE guests
            SET phone = COALESCE(?, phone),
                email = COALESCE(?, email)
            WHERE id = ?
          `, [guest_phone, guest_email, guestId]);
        }
      } else {
        // Crear nuevo huésped (compatible con SQLite simple)
        isNewGuest = true;
        const result = await dbRun(`
          INSERT INTO guests (name, document, phone, email)
          VALUES (?, ?, ?, ?)
        `, [
          guest_name,
          guest_document,
          guest_phone || null,
          guest_email || null
        ]);
        guestId = result.id;
      }

      // ===== GENERAR CÓDIGO DE CONFIRMACIÓN =====
      const now = new Date();
      const confirmationCode = `ALM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

      // ===== CREAR BOOKING (compatible con SQLite simple) =====
      // SQLite simple solo tiene: guest_id, bed_id, check_in, check_out, nights, total, status
      const booking = await dbRun(`
        INSERT INTO bookings (
          guest_id, bed_id, check_in, check_out, nights, total, status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'active')
      `, [guestId, bed_id, checkIn, checkOut, stayNights, total]);

      // ===== ACTUALIZAR CAMA A OCUPADA =====
      await dbRun(`
        UPDATE beds
        SET status = 'occupied', guest_id = ?
        WHERE id = ?
      `, [guestId, bed_id]);

      // ===== CREAR TRANSACCIÓN DE CARGO =====
      await dbRun(`
        INSERT INTO transactions (booking_id, type, description, amount, method)
        VALUES (?, 'charge', ?, ?, 'pending')
      `, [booking.id, `Alojamiento - ${stayNights} noche(s)`, total]);

      // ===== REGISTRAR PAGO SI LO HUBO =====
      let paymentRecorded = null;
      const payAmount = parseFloat(payment_amount) || 0;

      if (payment_method && payment_method !== 'pending' && payAmount > 0) {
        const paymentResult = await dbRun(`
          INSERT INTO transactions (booking_id, type, description, amount, method)
          VALUES (?, 'payment', 'Pago en check-in', ?, ?)
        `, [booking.id, payAmount, payment_method]);

        paymentRecorded = {
          id: paymentResult.id,
          amount: payAmount,
          method: payment_method
        };
      }

      // ===== REGISTRAR EN HISTORIAL =====
      try {
        await dbRun(`
          INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
          VALUES (?, ?, 'quick_checkin', ?, 'occupied', ?, ?)
        `, [bed_id, guestId, bed.status, notes || `Quick check-in: ${guest_name}`, req.session?.staffId || null]);
      } catch (e) {
        // bed_history puede no existir en SQLite simple
        console.log('Note: bed_history not available');
      }

      // ===== LOG DE ACTIVIDAD =====
      logActivity('front-desk', 'quick_checkin', `Quick check-in: ${guest_name} → ${bed.name}`);

      // ===== ENVIAR SMS DE WIFI (ASYNC - NO BLOQUEA RESPUESTA) =====
      let smsSent = null;
      if (guest_phone) {
        try {
          const smsModule = require('./sms');
          if (smsModule.isEnabled && smsModule.isEnabled()) {
            // Send WiFi SMS async (don't wait for it)
            smsModule.sendWifiCredentialsSMS(app, {
              id: booking.id,
              confirmation_code: confirmationCode
            }, {
              id: guestId,
              name: guest_name,
              phone: guest_phone
            }).then(result => {
              if (result) {
                console.log(`✅ WiFi SMS sent to ${guest_phone}`);
              }
            }).catch(err => {
              console.log(`Note: WiFi SMS failed: ${err.message}`);
            });
            smsSent = 'pending';
          }
        } catch (e) {
          console.log('Note: SMS module not available for WiFi');
        }
      }

      // ===== RESPUESTA =====
      res.status(201).json({
        success: true,
        message: `Check-in exitoso: ${guest_name} en ${bed.name}`,

        booking: {
          id: booking.id,
          confirmation_code: confirmationCode,
          check_in: checkIn,
          check_out: checkOut,
          nights: stayNights,
          total: total,
          balance_due: total - payAmount
        },

        guest: {
          id: guestId,
          name: guest_name,
          document: guest_document,
          is_new: isNewGuest
        },

        bed: {
          id: bed_id,
          name: bed.name,
          room: bed.room,
          price_per_night: bed.price
        },

        payment: paymentRecorded,
        wifi_sms: smsSent
      });

    } catch (err) {
      console.error('Quick check-in error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // ============================================
  // POST /api/quick-checkout
  // CHECK-OUT RÁPIDO
  // ============================================
  app.post('/api/quick-checkout', requireAuth, async (req, res) => {
    try {
      const {
        booking_id,
        bed_id,           // alternativa: buscar por cama

        // Pago final
        payment_amount,
        payment_method,

        // Opciones
        mark_clean        // marcar cama como limpia directamente
      } = req.body;

      // Buscar booking activo
      let booking;
      if (booking_id) {
        booking = await dbGet(`
          SELECT b.*, g.name as guest_name, bd.name as bed_name, bd.id as bed_id
          FROM bookings b
          JOIN guests g ON b.guest_id = g.id
          JOIN beds bd ON b.bed_id = bd.id
          WHERE b.id = ? AND b.status IN ('active', 'checked_in')
        `, [booking_id]);
      } else if (bed_id) {
        booking = await dbGet(`
          SELECT b.*, g.name as guest_name, bd.name as bed_name, bd.id as bed_id
          FROM bookings b
          JOIN guests g ON b.guest_id = g.id
          JOIN beds bd ON b.bed_id = bd.id
          WHERE bd.id = ? AND b.status IN ('active', 'checked_in')
        `, [bed_id]);
      }

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró reserva activa'
        });
      }

      // Calcular balance
      const payments = await dbGet(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM transactions
        WHERE booking_id = ? AND type = 'payment'
      `, [booking.id]);

      const totalPaid = payments.total_paid || 0;
      const balanceBefore = booking.total - totalPaid;

      // Registrar pago final si lo hay
      const payAmount = parseFloat(payment_amount) || 0;
      if (payment_method && payment_method !== 'pending' && payAmount > 0) {
        await dbRun(`
          INSERT INTO transactions (booking_id, type, description, amount, method)
          VALUES (?, 'payment', 'Pago en check-out', ?, ?)
        `, [booking.id, payAmount, payment_method]);
      }

      const balanceAfter = balanceBefore - payAmount;

      // Actualizar booking
      await dbRun(`
        UPDATE bookings
        SET status = 'checked_out', checked_out_at = datetime('now')
        WHERE id = ?
      `, [booking.id]);

      // Actualizar cama
      const newBedStatus = mark_clean ? 'clean' : 'dirty';
      await dbRun(`
        UPDATE beds
        SET status = ?, guest_id = NULL
        WHERE id = ?
      `, [newBedStatus, booking.bed_id]);

      // Historial
      try {
        await dbRun(`
          INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
          VALUES (?, ?, 'quick_checkout', 'occupied', ?, ?, ?)
        `, [booking.bed_id, booking.guest_id, newBedStatus, `Quick checkout: ${booking.guest_name}`, req.session?.staffId || null]);
      } catch (e) {
        console.log('Note: bed_history not available');
      }

      logActivity('front-desk', 'quick_checkout', `Quick checkout: ${booking.guest_name} de ${booking.bed_name}`);

      res.json({
        success: true,
        message: `Check-out exitoso: ${booking.guest_name}`,

        booking: {
          id: booking.id,
          guest_name: booking.guest_name,
          total: booking.total,
          total_paid: totalPaid + payAmount,
          balance_due: balanceAfter
        },

        bed: {
          id: booking.bed_id,
          name: booking.bed_name,
          new_status: newBedStatus
        },

        payment_warning: balanceAfter > 0 ? `Saldo pendiente: $${balanceAfter.toLocaleString()}` : null
      });

    } catch (err) {
      console.error('Quick checkout error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // ============================================
  // POST /api/quick-payment
  // REGISTRAR PAGO RÁPIDO
  // ============================================
  app.post('/api/quick-payment', requireAuth, async (req, res) => {
    try {
      const {
        booking_id,
        bed_id,           // alternativa: buscar por cama ocupada
        guest_document,   // alternativa: buscar por documento

        amount,
        method,           // 'cash', 'card', 'transfer'
        description
      } = req.body;

      // Buscar booking
      let booking;

      if (booking_id) {
        booking = await dbGet(`
          SELECT b.*, g.name as guest_name
          FROM bookings b
          JOIN guests g ON b.guest_id = g.id
          WHERE b.id = ?
        `, [booking_id]);
      } else if (bed_id) {
        booking = await dbGet(`
          SELECT b.*, g.name as guest_name
          FROM bookings b
          JOIN guests g ON b.guest_id = g.id
          JOIN beds bd ON b.bed_id = bd.id
          WHERE bd.id = ? AND b.status IN ('active', 'checked_in')
        `, [bed_id]);
      } else if (guest_document) {
        booking = await dbGet(`
          SELECT b.*, g.name as guest_name
          FROM bookings b
          JOIN guests g ON b.guest_id = g.id
          WHERE g.document = ? AND b.status IN ('active', 'checked_in')
          ORDER BY b.created_at DESC
          LIMIT 1
        `, [guest_document]);
      }

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró reserva'
        });
      }

      const payAmount = parseFloat(amount);
      if (!payAmount || payAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Monto inválido'
        });
      }

      // Balance actual
      const payments = await dbGet(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM transactions
        WHERE booking_id = ? AND type = 'payment'
      `, [booking.id]);

      const totalPaidBefore = payments.total_paid || 0;
      const balanceBefore = booking.total - totalPaidBefore;

      // Registrar pago
      const payment = await dbRun(`
        INSERT INTO transactions (booking_id, type, description, amount, method)
        VALUES (?, 'payment', ?, ?, ?)
      `, [
        booking.id,
        description || `Pago ${method}`,
        payAmount,
        method || 'cash'
      ]);

      const balanceAfter = balanceBefore - payAmount;

      logActivity('front-desk', 'payment', `Pago recibido: $${payAmount.toLocaleString()} de ${booking.guest_name}`);

      res.json({
        success: true,
        message: `Pago registrado: $${payAmount.toLocaleString()}`,

        payment: {
          id: payment.id,
          amount: payAmount,
          method: method || 'cash'
        },

        booking: {
          id: booking.id,
          guest_name: booking.guest_name,
          total: booking.total,
          total_paid: totalPaidBefore + payAmount,
          balance_due: balanceAfter,
          is_paid_in_full: balanceAfter <= 0
        }
      });

    } catch (err) {
      console.error('Quick payment error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // ============================================
  // GET /api/front-desk/search
  // BÚSQUEDA UNIVERSAL RÁPIDA
  // ============================================
  app.get('/api/front-desk/search', requireAuth, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Término de búsqueda muy corto (mínimo 2 caracteres)'
        });
      }

      const searchTerm = `%${q}%`;

      // Buscar en reservas (por código de confirmación)
      const bookingsByCode = await dbAll(`
        SELECT
          'booking' as type,
          b.id,
          b.confirmation_code,
          b.status,
          b.check_in,
          b.check_out,
          b.total,
          g.name as guest_name,
          g.document as guest_document,
          bd.name as bed_name
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN beds bd ON b.bed_id = bd.id
        WHERE b.confirmation_code LIKE ?
        ORDER BY b.created_at DESC
        LIMIT 10
      `, [searchTerm]);

      // Buscar huéspedes (por nombre o documento)
      const guests = await dbAll(`
        SELECT
          'guest' as type,
          g.id,
          g.name,
          g.document,
          g.phone,
          g.email,
          (SELECT COUNT(*) FROM bookings WHERE guest_id = g.id) as total_stays,
          (SELECT status FROM bookings WHERE guest_id = g.id ORDER BY created_at DESC LIMIT 1) as last_booking_status
        FROM guests g
        WHERE g.name LIKE ? OR g.document LIKE ?
        ORDER BY g.name ASC
        LIMIT 10
      `, [searchTerm, searchTerm]);

      // Buscar camas (por nombre)
      const beds = await dbAll(`
        SELECT
          'bed' as type,
          b.id,
          b.name,
          b.room,
          b.price,
          b.status,
          g.name as current_guest_name
        FROM beds b
        LEFT JOIN guests g ON b.guest_id = g.id
        WHERE b.name LIKE ? OR b.room LIKE ?
        ORDER BY b.name ASC
        LIMIT 10
      `, [searchTerm, searchTerm]);

      // Combinar resultados priorizando bookings activos
      const results = [
        ...bookingsByCode.map(b => ({
          ...b,
          priority: b.status === 'active' || b.status === 'checked_in' ? 1 :
                   b.status === 'pending' || b.status === 'confirmed' ? 2 : 3
        })),
        ...guests.map(g => ({
          ...g,
          priority: g.last_booking_status === 'active' ? 1 : 2
        })),
        ...beds.map(b => ({
          ...b,
          priority: b.status === 'occupied' ? 1 : 2
        }))
      ].sort((a, b) => a.priority - b.priority);

      res.json({
        success: true,
        query: q,
        total_results: results.length,
        results: results,

        // Agrupados por tipo
        by_type: {
          bookings: bookingsByCode,
          guests: guests,
          beds: beds
        }
      });

    } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // ============================================
  // POST /api/front-desk/confirm-arrival
  // CONFIRMAR LLEGADA DE RESERVA EXISTENTE
  // (Un click desde la lista de llegadas pendientes)
  // ============================================
  app.post('/api/front-desk/confirm-arrival', requireAuth, async (req, res) => {
    try {
      const {
        booking_id,
        payment_method,
        payment_amount
      } = req.body;

      if (!booking_id) {
        return res.status(400).json({
          success: false,
          error: 'booking_id es requerido'
        });
      }

      // Obtener reserva
      const booking = await dbGet(`
        SELECT b.*, g.name as guest_name, g.id as guest_id, g.phone as guest_phone, bd.name as bed_name, bd.id as bed_id, bd.status as bed_status
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN beds bd ON b.bed_id = bd.id
        WHERE b.id = ? AND b.status IN ('pending', 'confirmed')
      `, [booking_id]);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Reserva no encontrada o ya procesada'
        });
      }

      // Verificar que la cama está disponible
      if (booking.bed_status !== 'clean' && booking.bed_status !== 'reserved') {
        return res.status(400).json({
          success: false,
          error: `La cama ${booking.bed_name} no está disponible (${booking.bed_status})`,
          bed_status: booking.bed_status
        });
      }

      // Actualizar booking a activo
      await dbRun(`
        UPDATE bookings
        SET status = 'active', checked_in_at = datetime('now')
        WHERE id = ?
      `, [booking_id]);

      // Actualizar cama a ocupada
      await dbRun(`
        UPDATE beds
        SET status = 'occupied', guest_id = ?
        WHERE id = ?
      `, [booking.guest_id, booking.bed_id]);

      // Registrar pago si lo hay
      let paymentRecorded = null;
      const payAmount = parseFloat(payment_amount) || 0;

      if (payment_method && payment_method !== 'pending' && payAmount > 0) {
        const paymentResult = await dbRun(`
          INSERT INTO transactions (booking_id, type, description, amount, method)
          VALUES (?, 'payment', 'Pago en check-in', ?, ?)
        `, [booking_id, payAmount, payment_method]);

        paymentRecorded = {
          id: paymentResult.id,
          amount: payAmount,
          method: payment_method
        };
      }

      // Historial
      try {
        await dbRun(`
          INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes)
          VALUES (?, ?, 'arrival_confirmed', ?, 'occupied', ?)
        `, [booking.bed_id, booking.guest_id, booking.bed_status, `Llegada confirmada: ${booking.guest_name}`]);
      } catch (e) {
        console.log('Note: bed_history not available');
      }

      logActivity('front-desk', 'arrival_confirmed', `Llegada confirmada: ${booking.guest_name} → ${booking.bed_name}`);

      // ===== ENVIAR SMS DE WIFI (ASYNC - NO BLOQUEA RESPUESTA) =====
      let smsSent = null;
      if (booking.guest_phone) {
        try {
          const smsModule = require('./sms');
          if (smsModule.isEnabled && smsModule.isEnabled()) {
            // Send WiFi SMS async (don't wait for it)
            smsModule.sendWifiCredentialsSMS(app, {
              id: booking.id,
              confirmation_code: booking.confirmation_code
            }, {
              id: booking.guest_id,
              name: booking.guest_name,
              phone: booking.guest_phone
            }).then(result => {
              if (result) {
                console.log(`✅ WiFi SMS sent to ${booking.guest_phone}`);
              }
            }).catch(err => {
              console.log(`Note: WiFi SMS failed: ${err.message}`);
            });
            smsSent = 'pending';
          }
        } catch (e) {
          console.log('Note: SMS module not available for WiFi');
        }
      }

      res.json({
        success: true,
        message: `Check-in confirmado: ${booking.guest_name} en ${booking.bed_name}`,

        booking: {
          id: booking.id,
          confirmation_code: booking.confirmation_code,
          guest_name: booking.guest_name,
          bed_name: booking.bed_name,
          check_in: booking.check_in,
          check_out: booking.check_out,
          total: booking.total
        },

        payment: paymentRecorded,
        wifi_sms: smsSent
      });

    } catch (err) {
      console.error('Confirm arrival error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // ============================================
  // POST /api/reservations/:id/no-show
  // MARCAR COMO NO-SHOW
  // ============================================
  app.post('/api/reservations/:id/no-show', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, charge_penalty } = req.body;

      const booking = await dbGet(`
        SELECT b.*, g.name as guest_name, bd.name as bed_name, bd.id as bed_id
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN beds bd ON b.bed_id = bd.id
        WHERE b.id = ? AND b.status IN ('pending', 'confirmed')
      `, [id]);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Reserva no encontrada o no aplica para no-show'
        });
      }

      // Marcar como no-show
      await dbRun(`
        UPDATE bookings
        SET status = 'no_show', updated_at = datetime('now')
        WHERE id = ?
      `, [id]);

      // Liberar cama si estaba reservada
      await dbRun(`
        UPDATE beds
        SET status = 'clean', reserved_for_guest_id = NULL, reserved_until = NULL
        WHERE id = ? AND (status = 'reserved' OR reserved_for_guest_id = ?)
      `, [booking.bed_id, booking.guest_id]);

      // Cargo por no-show si aplica
      let penaltyCharge = null;
      if (charge_penalty) {
        const penaltyAmount = parseFloat(charge_penalty) || (booking.total * 0.5); // 50% por defecto
        await dbRun(`
          INSERT INTO transactions (booking_id, type, description, amount, method)
          VALUES (?, 'charge', 'Cargo por no-show', ?, 'pending')
        `, [id, penaltyAmount]);
        penaltyCharge = penaltyAmount;
      }

      logActivity('front-desk', 'no_show', `No-show: ${booking.guest_name} (${booking.confirmation_code})`);

      res.json({
        success: true,
        message: `Reserva marcada como no-show: ${booking.guest_name}`,

        booking: {
          id: booking.id,
          confirmation_code: booking.confirmation_code,
          guest_name: booking.guest_name,
          original_dates: `${booking.check_in} a ${booking.check_out}`
        },

        penalty_charged: penaltyCharge,
        bed_released: booking.bed_name
      });

    } catch (err) {
      console.error('No-show error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // ============================================
  // GET /api/front-desk/guest/:id/account
  // ESTADO DE CUENTA DEL HUÉSPED
  // Para mostrar al cliente cuánto debe
  // ============================================
  app.get('/api/front-desk/guest/:id/account', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Por booking_id o guest_id
      const isBookingId = req.query.type === 'booking';

      let booking;
      if (isBookingId) {
        booking = await dbGet(`
          SELECT b.*, g.name as guest_name, g.document, bd.name as bed_name
          FROM bookings b
          JOIN guests g ON b.guest_id = g.id
          JOIN beds bd ON b.bed_id = bd.id
          WHERE b.id = ?
        `, [id]);
      } else {
        // Buscar booking activo del huésped
        booking = await dbGet(`
          SELECT b.*, g.name as guest_name, g.document, bd.name as bed_name
          FROM bookings b
          JOIN guests g ON b.guest_id = g.id
          JOIN beds bd ON b.bed_id = bd.id
          WHERE g.id = ? AND b.status IN ('active', 'checked_in')
          ORDER BY b.created_at DESC
          LIMIT 1
        `, [id]);
      }

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró reserva activa'
        });
      }

      // Obtener todas las transacciones
      const transactions = await dbAll(`
        SELECT * FROM transactions
        WHERE booking_id = ?
        ORDER BY created_at ASC
      `, [booking.id]);

      // Calcular totales
      const charges = transactions.filter(t => t.type === 'charge');
      const payments = transactions.filter(t => t.type === 'payment');
      const refunds = transactions.filter(t => t.type === 'refund');

      const totalCharges = charges.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalPayments = payments.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalRefunds = refunds.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const balance = totalCharges - totalPayments - totalRefunds;

      res.json({
        success: true,

        guest: {
          name: booking.guest_name,
          document: booking.document
        },

        stay: {
          booking_id: booking.id,
          confirmation_code: booking.confirmation_code,
          bed: booking.bed_name,
          check_in: booking.check_in,
          check_out: booking.check_out,
          nights: booking.nights,
          status: booking.status
        },

        account: {
          total_charges: totalCharges,
          total_payments: totalPayments,
          total_refunds: totalRefunds,
          balance_due: balance,
          is_paid: balance <= 0
        },

        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: parseFloat(t.amount),
          method: t.method,
          date: t.created_at
        }))
      });

    } catch (err) {
      console.error('Guest account error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  console.log('   ✅ Front Desk routes registered (quick-checkin, quick-checkout, status, search)');
}

module.exports = { registerFrontDeskRoutes };
