/**
 * Advanced Bed Management Module
 *
 * Features:
 * - Bed history tracking
 * - Maintenance mode
 * - Reservation without check-in
 * - Change guest bed
 * - Notes/observations
 * - Cleaning tracking
 *
 * @module beds-advanced
 */

/**
 * Register advanced bed management routes
 * @param {Express} app - Express application
 * @param {Function} requireAuth - Authentication middleware
 * @param {Function} dbAll - Database query all function
 * @param {Function} dbGet - Database get single function
 * @param {Function} dbRun - Database run function
 * @param {Function} logActivity - Activity logging function
 */
function registerBedAdvancedRoutes(app, requireAuth, dbAll, dbGet, dbRun, logActivity) {

  // ============================================
  // BED HISTORY
  // ============================================

  /**
   * GET /api/beds/:id/history
   * Get complete history of a bed
   */
  app.get('/api/beds/:id/history', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Verify bed exists
      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      // Get history with guest and staff names
      const history = await dbAll(`
        SELECT
          h.*,
          g.name as guest_name,
          g.document as guest_document,
          s.name as performed_by_name
        FROM bed_history h
        LEFT JOIN guests g ON h.guest_id = g.id
        LEFT JOIN staff s ON h.performed_by = s.id
        WHERE h.bed_id = ?
        ORDER BY h.created_at DESC
        LIMIT ? OFFSET ?
      `, [id, parseInt(limit), parseInt(offset)]);

      // Get total count
      const countResult = await dbGet(
        'SELECT COUNT(*) as total FROM bed_history WHERE bed_id = ?',
        [id]
      );

      res.json({
        bed: {
          id: bed.id,
          name: bed.name,
          room: bed.room,
          status: bed.status
        },
        history,
        pagination: {
          total: countResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/beds/:id/history
   * Add manual history entry (for notes, observations)
   */
  app.post('/api/beds/:id/history', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      await dbRun(`
        INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, action || 'note', bed.status, bed.status, notes, performed_by]);

      logActivity('beds', 'history_added', `Note added to bed ${bed.name}`);

      res.json({ success: true, message: 'History entry added' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // BED STATUS CHANGES (with history)
  // ============================================

  /**
   * PUT /api/beds/:id/mark-dirty
   * Mark bed as needing cleaning
   */
  app.put('/api/beds/:id/mark-dirty', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      const previousStatus = bed.status;

      // Update bed status
      await dbRun('UPDATE beds SET status = ? WHERE id = ?', ['dirty', id]);

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'marked_dirty', ?, 'dirty', ?, ?)
      `, [id, bed.guest_id, previousStatus, notes || 'Marked for cleaning', performed_by]);

      logActivity('beds', 'status_change', `Bed ${bed.name} marked as dirty`);

      res.json({ success: true, message: 'Bed marked for cleaning' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/beds/:id/mark-clean
   * Mark bed as clean/available
   */
  app.put('/api/beds/:id/mark-clean', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status === 'occupied') {
        return res.status(400).json({ error: 'Cannot mark occupied bed as clean' });
      }

      const previousStatus = bed.status;

      // Update bed status and cleaning info
      await dbRun(`
        UPDATE beds
        SET status = 'clean',
            guest_id = NULL,
            last_cleaned_at = datetime('now'),
            last_cleaned_by = ?,
            maintenance_reason = NULL
        WHERE id = ?
      `, [performed_by, id]);

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, 'cleaned', ?, 'clean', ?, ?)
      `, [id, previousStatus, notes || 'Bed cleaned and available', performed_by]);

      logActivity('beds', 'cleaned', `Bed ${bed.name} cleaned and available`);

      res.json({ success: true, message: 'Bed is now available' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/beds/:id/maintenance
   * Put bed in maintenance mode
   */
  app.put('/api/beds/:id/maintenance', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status === 'occupied') {
        return res.status(400).json({ error: 'Cannot put occupied bed in maintenance' });
      }

      const previousStatus = bed.status;

      // Update bed status
      await dbRun(`
        UPDATE beds
        SET status = 'maintenance',
            maintenance_reason = ?,
            guest_id = NULL
        WHERE id = ?
      `, [reason || 'General maintenance', id]);

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, 'maintenance_start', ?, 'maintenance', ?, ?)
      `, [id, previousStatus, notes || `Maintenance: ${reason}`, performed_by]);

      logActivity('beds', 'maintenance', `Bed ${bed.name} in maintenance: ${reason}`);

      res.json({ success: true, message: 'Bed is now in maintenance' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // BED RESERVATION (without check-in)
  // ============================================

  /**
   * POST /api/beds/:id/reserve
   * Reserve a bed for a future guest
   */
  app.post('/api/beds/:id/reserve', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { guest_id, reserved_until, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'clean') {
        return res.status(400).json({ error: 'Only available beds can be reserved' });
      }

      // Verify guest exists if provided
      let guestName = 'Unknown';
      if (guest_id) {
        const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [guest_id]);
        if (!guest) {
          return res.status(404).json({ error: 'Guest not found' });
        }
        guestName = guest.name;
      }

      const previousStatus = bed.status;

      // Update bed status
      await dbRun(`
        UPDATE beds
        SET status = 'reserved',
            reserved_for_guest_id = ?,
            reserved_until = ?
        WHERE id = ?
      `, [guest_id, reserved_until, id]);

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'reserved', ?, 'reserved', ?, ?)
      `, [id, guest_id, previousStatus, notes || `Reserved for ${guestName} until ${reserved_until}`, performed_by]);

      logActivity('beds', 'reserved', `Bed ${bed.name} reserved for ${guestName}`);

      res.json({ success: true, message: 'Bed reserved successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/beds/:id/reserve
   * Cancel bed reservation
   */
  app.delete('/api/beds/:id/reserve', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'reserved') {
        return res.status(400).json({ error: 'Bed is not reserved' });
      }

      // Update bed status
      await dbRun(`
        UPDATE beds
        SET status = 'clean',
            reserved_for_guest_id = NULL,
            reserved_until = NULL
        WHERE id = ?
      `, [id]);

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'reservation_cancelled', 'reserved', 'clean', ?, ?)
      `, [id, bed.reserved_for_guest_id, notes || 'Reservation cancelled', performed_by]);

      logActivity('beds', 'reservation_cancelled', `Reservation cancelled for bed ${bed.name}`);

      res.json({ success: true, message: 'Reservation cancelled' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // CHANGE GUEST BED
  // ============================================

  /**
   * POST /api/beds/transfer
   * Transfer guest from one bed to another
   */
  app.post('/api/beds/transfer', requireAuth, async (req, res) => {
    try {
      const { from_bed_id, to_bed_id, notes, performed_by } = req.body;

      // Verify source bed
      const fromBed = await dbGet('SELECT * FROM beds WHERE id = ?', [from_bed_id]);
      if (!fromBed) {
        return res.status(404).json({ error: 'Source bed not found' });
      }
      if (fromBed.status !== 'occupied') {
        return res.status(400).json({ error: 'Source bed is not occupied' });
      }

      // Verify destination bed
      const toBed = await dbGet('SELECT * FROM beds WHERE id = ?', [to_bed_id]);
      if (!toBed) {
        return res.status(404).json({ error: 'Destination bed not found' });
      }
      if (toBed.status !== 'clean' && toBed.status !== 'reserved') {
        return res.status(400).json({ error: 'Destination bed is not available' });
      }

      const guestId = fromBed.guest_id;

      // Get guest info
      const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
      const guestName = guest ? guest.name : 'Unknown';

      // Update source bed (mark as dirty)
      await dbRun(`
        UPDATE beds
        SET status = 'dirty',
            guest_id = NULL
        WHERE id = ?
      `, [from_bed_id]);

      // Update destination bed (mark as occupied)
      await dbRun(`
        UPDATE beds
        SET status = 'occupied',
            guest_id = ?,
            reserved_for_guest_id = NULL,
            reserved_until = NULL
        WHERE id = ?
      `, [guestId, to_bed_id]);

      // Update active booking
      await dbRun(`
        UPDATE bookings
        SET bed_id = ?
        WHERE guest_id = ? AND status = 'active'
      `, [to_bed_id, guestId]);

      // Record history for source bed
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'transfer_out', 'occupied', 'dirty', ?, ?)
      `, [from_bed_id, guestId, notes || `Guest ${guestName} transferred to ${toBed.name}`, performed_by]);

      // Record history for destination bed
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'transfer_in', ?, 'occupied', ?, ?)
      `, [to_bed_id, guestId, toBed.status, notes || `Guest ${guestName} transferred from ${fromBed.name}`, performed_by]);

      logActivity('beds', 'transfer', `Guest ${guestName} transferred from ${fromBed.name} to ${toBed.name}`);

      res.json({
        success: true,
        message: `Guest transferred from ${fromBed.name} to ${toBed.name}`,
        from_bed: fromBed.name,
        to_bed: toBed.name,
        guest: guestName
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // BED NOTES
  // ============================================

  /**
   * PUT /api/beds/:id/notes
   * Update bed notes/observations
   */
  app.put('/api/beds/:id/notes', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      await dbRun('UPDATE beds SET notes = ? WHERE id = ?', [notes, id]);

      // Record in history if notes changed significantly
      if (notes && notes.trim()) {
        await dbRun(`
          INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes)
          VALUES (?, 'notes_updated', ?, ?, ?)
        `, [id, bed.status, bed.status, `Notes updated: ${notes.substring(0, 100)}`]);
      }

      res.json({ success: true, message: 'Notes updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // ENHANCED CHECK-IN (with history)
  // ============================================

  /**
   * POST /api/beds/:id/checkin
   * Enhanced check-in with history tracking
   * INCLUYE validación de reservas externas (Booking.com, Airbnb via iCal)
   */
  app.post('/api/beds/:id/checkin', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { guestId, check_in, check_out, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'clean' && bed.status !== 'reserved') {
        return res.status(400).json({ error: 'Bed is not available for check-in' });
      }

      // If reserved, check if it's for this guest
      if (bed.status === 'reserved' && bed.reserved_for_guest_id && bed.reserved_for_guest_id !== guestId) {
        return res.status(400).json({ error: 'Bed is reserved for another guest' });
      }

      // VALIDACIÓN DE OVERBOOKING: Verificar reservas externas (Booking.com, Airbnb)
      const checkInDate = check_in ? new Date(check_in) : new Date();
      const checkOutDate = check_out ? new Date(check_out) : new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000);
      const checkInStr = checkInDate.toISOString().split('T')[0];
      const checkOutStr = checkOutDate.toISOString().split('T')[0];

      try {
        // Buscar conflictos en reservas externas
        const externalConflicts = await dbAll(`
          SELECT
            er.id,
            er.external_id,
            er.check_in,
            er.check_out,
            er.guest_name,
            is2.name as platform_name
          FROM external_reservations er
          JOIN ical_sources is2 ON er.source_id = is2.id
          WHERE is2.bed_id = ?
            AND er.status IN ('confirmed', 'tentative')
            AND (
              (er.check_in <= ? AND er.check_out > ?) OR
              (er.check_in < ? AND er.check_out >= ?) OR
              (er.check_in >= ? AND er.check_out <= ?)
            )
        `, [id, checkInStr, checkInStr, checkOutStr, checkOutStr, checkInStr, checkOutStr]);

        if (externalConflicts && externalConflicts.length > 0) {
          return res.status(409).json({
            error: 'OVERBOOKING PREVENTED: Bed has external reservation',
            conflictingReservations: externalConflicts,
            message: `Esta cama tiene una reserva de ${externalConflicts[0].platform_name || 'plataforma externa'} para las fechas seleccionadas`
          });
        }
      } catch (err) {
        // Si la tabla no existe, continuar (puede ser primera instalación)
        console.log('Note: external_reservations check skipped:', err.message);
      }

      const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
      if (!guest) {
        return res.status(404).json({ error: 'Guest not found' });
      }

      const previousStatus = bed.status;

      // Calculate dates and nights (using variables already calculated above for overbooking check)
      const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
      const total = nights * bed.price;

      // Create booking
      const booking = await dbRun(
        'INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [guestId, id, checkInDate.toISOString().split('T')[0], checkOutDate.toISOString().split('T')[0], nights, total, 'active']
      );

      // Update bed status
      await dbRun(`
        UPDATE beds
        SET status = 'occupied',
            guest_id = ?,
            reserved_for_guest_id = NULL,
            reserved_until = NULL
        WHERE id = ?
      `, [guestId, id]);

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'checkin', ?, 'occupied', ?, ?)
      `, [id, guestId, previousStatus, notes || `Check-in: ${guest.name} for ${nights} nights`, performed_by]);

      // Create transaction for the charge
      await dbRun(
        'INSERT INTO transactions (booking_id, type, description, amount, bed_id) VALUES (?, ?, ?, ?, ?)',
        [booking.id, 'charge', `Accommodation - ${nights} nights`, total, id]
      );

      logActivity('beds', 'checkin', `Check-in: ${guest.name} to ${bed.name}`);

      res.json({
        success: true,
        message: `Check-in successful for ${guest.name}`,
        booking_id: booking.id,
        nights,
        total
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/beds/:id/checkout
   * Enhanced check-out with history tracking
   */
  app.post('/api/beds/:id/checkout', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, performed_by, mark_clean = false } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'occupied') {
        return res.status(400).json({ error: 'Bed is not occupied' });
      }

      const guestId = bed.guest_id;
      const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
      const guestName = guest ? guest.name : 'Unknown';

      // Get active booking
      const booking = await dbGet(
        'SELECT * FROM bookings WHERE bed_id = ? AND guest_id = ? AND status = ?',
        [id, guestId, 'active']
      );

      // Update booking status
      if (booking) {
        await dbRun('UPDATE bookings SET status = ? WHERE id = ?', ['completed', booking.id]);
      }

      // Determine new status
      const newStatus = mark_clean ? 'clean' : 'dirty';

      // Update bed
      await dbRun(`
        UPDATE beds
        SET status = ?,
            guest_id = NULL
        WHERE id = ?
      `, [newStatus, id]);

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'checkout', 'occupied', ?, ?, ?)
      `, [id, guestId, newStatus, notes || `Check-out: ${guestName}`, performed_by]);

      logActivity('beds', 'checkout', `Check-out: ${guestName} from ${bed.name}`);

      res.json({
        success: true,
        message: `Check-out successful for ${guestName}`,
        bed_status: newStatus
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * GET /api/beds/stats
   * Get bed statistics
   */
  app.get('/api/beds/stats', requireAuth, async (req, res) => {
    try {
      const stats = await dbGet(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'clean' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN status = 'dirty' THEN 1 ELSE 0 END) as dirty,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved
        FROM beds
      `);

      const recentActivity = await dbAll(`
        SELECT
          h.*,
          b.name as bed_name,
          g.name as guest_name
        FROM bed_history h
        JOIN beds b ON h.bed_id = b.id
        LEFT JOIN guests g ON h.guest_id = g.id
        ORDER BY h.created_at DESC
        LIMIT 10
      `);

      const occupancyRate = stats.total > 0
        ? Math.round((stats.occupied / stats.total) * 100)
        : 0;

      res.json({
        summary: {
          ...stats,
          occupancy_rate: occupancyRate
        },
        recent_activity: recentActivity
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // HOUSEKEEPING DASHBOARD
  // ============================================

  /**
   * GET /api/beds/housekeeping
   * Get housekeeping dashboard - beds needing attention
   */
  app.get('/api/beds/housekeeping', requireAuth, async (req, res) => {
    try {
      // Get dirty beds with priority (longer dirty = higher priority)
      const dirtyBeds = await dbAll(`
        SELECT
          b.*,
          b.room as room_name,
          g.name as last_guest_name,
          COALESCE(
            (SELECT MAX(created_at) FROM bed_history WHERE bed_id = b.id AND action = 'checkout'),
            b.created_at
          ) as dirty_since,
          ROUND((julianday('now') - julianday(COALESCE(
            (SELECT MAX(created_at) FROM bed_history WHERE bed_id = b.id AND action = 'checkout'),
            b.created_at
          ))) * 24, 1) as hours_dirty
        FROM beds b
        LEFT JOIN guests g ON b.guest_id = g.id
        WHERE b.status = 'dirty'
        ORDER BY hours_dirty DESC
      `);

      // Get beds needing checkout today
      const checkoutsToday = await dbAll(`
        SELECT
          b.*,
          g.name as guest_name,
          g.phone as guest_phone,
          bk.check_out,
          bk.nights,
          bk.total
        FROM beds b
        JOIN bookings bk ON b.id = bk.bed_id AND bk.status = 'active'
        JOIN guests g ON bk.guest_id = g.id
        WHERE date(bk.check_out) <= date('now')
        ORDER BY bk.check_out ASC
      `);

      // Get maintenance beds
      const maintenanceBeds = await dbAll(`
        SELECT
          b.*,
          (SELECT notes FROM bed_history WHERE bed_id = b.id AND action = 'maintenance_start' ORDER BY created_at DESC LIMIT 1) as maintenance_notes
        FROM beds b
        WHERE b.status = 'maintenance'
      `);

      // Summary stats
      const stats = await dbGet(`
        SELECT
          SUM(CASE WHEN status = 'dirty' THEN 1 ELSE 0 END) as dirty_count,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count,
          SUM(CASE WHEN status = 'clean' THEN 1 ELSE 0 END) as clean_count,
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_count
        FROM beds
      `);

      res.json({
        success: true,
        summary: stats,
        dirty_beds: dirtyBeds.map(bed => ({
          ...bed,
          priority: bed.hours_dirty > 24 ? 'high' : bed.hours_dirty > 6 ? 'medium' : 'low'
        })),
        checkouts_today: checkoutsToday,
        maintenance_beds: maintenanceBeds
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // AVAILABILITY CALENDAR
  // ============================================

  /**
   * GET /api/beds/availability
   * Get bed availability for a date range
   */
  app.get('/api/beds/availability', requireAuth, async (req, res) => {
    try {
      const { start_date, end_date, room } = req.query;

      const startDate = start_date || new Date().toISOString().split('T')[0];
      const endDate = end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get all beds
      let bedsQuery = 'SELECT * FROM beds WHERE status != ?';
      const bedsParams = ['maintenance'];

      if (room) {
        bedsQuery += ' AND room = ?';
        bedsParams.push(room);
      }

      const beds = await dbAll(bedsQuery, bedsParams);

      // Get all bookings in the date range
      const bookings = await dbAll(`
        SELECT
          bk.*,
          g.name as guest_name
        FROM bookings bk
        JOIN guests g ON bk.guest_id = g.id
        WHERE bk.status IN ('active', 'confirmed', 'pending')
          AND bk.check_out >= ?
          AND bk.check_in <= ?
      `, [startDate, endDate]);

      // Build availability calendar
      const calendar = {};
      const currentDate = new Date(startDate);
      const finalDate = new Date(endDate);

      while (currentDate <= finalDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        calendar[dateStr] = {
          date: dateStr,
          total_beds: beds.length,
          available: beds.length,
          occupied: 0,
          beds: {}
        };

        beds.forEach(bed => {
          calendar[dateStr].beds[bed.id] = {
            bed_id: bed.id,
            bed_name: bed.name,
            room: bed.room,
            price: bed.price,
            status: 'available',
            guest: null,
            booking_id: null
          };
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Mark occupied beds
      bookings.forEach(booking => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);

        Object.keys(calendar).forEach(dateStr => {
          const date = new Date(dateStr);
          if (date >= checkIn && date < checkOut) {
            if (calendar[dateStr].beds[booking.bed_id]) {
              calendar[dateStr].beds[booking.bed_id].status = 'occupied';
              calendar[dateStr].beds[booking.bed_id].guest = booking.guest_name;
              calendar[dateStr].beds[booking.bed_id].booking_id = booking.id;
              calendar[dateStr].available--;
              calendar[dateStr].occupied++;
            }
          }
        });
      });

      // Convert to array format
      const calendarArray = Object.values(calendar).map(day => ({
        ...day,
        beds: Object.values(day.beds),
        occupancy_rate: Math.round((day.occupied / day.total_beds) * 100)
      }));

      res.json({
        success: true,
        date_range: { start: startDate, end: endDate },
        total_beds: beds.length,
        calendar: calendarArray
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // EXTEND STAY
  // ============================================

  /**
   * POST /api/beds/:id/extend-stay
   * Extend guest's stay
   */
  app.post('/api/beds/:id/extend-stay', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { additional_nights, new_checkout_date, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'occupied') {
        return res.status(400).json({ error: 'Bed is not occupied' });
      }

      // Get active booking
      const booking = await dbGet(`
        SELECT bk.*, g.name as guest_name
        FROM bookings bk
        JOIN guests g ON bk.guest_id = g.id
        WHERE bk.bed_id = ? AND bk.status = 'active'
      `, [id]);

      if (!booking) {
        return res.status(404).json({ error: 'No active booking found for this bed' });
      }

      // Calculate new checkout date
      let newCheckout;
      let extraNights;

      if (new_checkout_date) {
        newCheckout = new Date(new_checkout_date);
        extraNights = Math.ceil((newCheckout - new Date(booking.check_out)) / (1000 * 60 * 60 * 24));
      } else if (additional_nights) {
        extraNights = parseInt(additional_nights);
        newCheckout = new Date(booking.check_out);
        newCheckout.setDate(newCheckout.getDate() + extraNights);
      } else {
        return res.status(400).json({ error: 'Provide additional_nights or new_checkout_date' });
      }

      if (extraNights <= 0) {
        return res.status(400).json({ error: 'New checkout must be after current checkout' });
      }

      // Check for conflicts
      const conflict = await dbGet(`
        SELECT * FROM bookings
        WHERE bed_id = ?
          AND id != ?
          AND status IN ('confirmed', 'pending')
          AND check_in < ?
          AND check_out > ?
      `, [id, booking.id, newCheckout.toISOString().split('T')[0], booking.check_out]);

      if (conflict) {
        return res.status(409).json({
          error: 'Cannot extend - bed is reserved for another guest',
          conflict: {
            check_in: conflict.check_in,
            check_out: conflict.check_out
          }
        });
      }

      // Calculate additional cost
      const additionalCost = extraNights * bed.price;
      const newTotal = booking.total + additionalCost;
      const newNights = booking.nights + extraNights;

      // Update booking
      await dbRun(`
        UPDATE bookings
        SET check_out = ?, nights = ?, total = ?
        WHERE id = ?
      `, [newCheckout.toISOString().split('T')[0], newNights, newTotal, booking.id]);

      // Create transaction for additional charge
      await dbRun(
        'INSERT INTO transactions (booking_id, type, description, amount, bed_id) VALUES (?, ?, ?, ?, ?)',
        [booking.id, 'charge', `Stay extension - ${extraNights} extra nights`, additionalCost, id]
      );

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'stay_extended', 'occupied', 'occupied', ?, ?)
      `, [id, booking.guest_id, notes || `Stay extended by ${extraNights} nights until ${newCheckout.toISOString().split('T')[0]}`, performed_by]);

      logActivity('beds', 'stay_extended', `${booking.guest_name} extended stay by ${extraNights} nights`);

      res.json({
        success: true,
        message: `Stay extended by ${extraNights} nights`,
        booking: {
          id: booking.id,
          guest: booking.guest_name,
          original_checkout: booking.check_out,
          new_checkout: newCheckout.toISOString().split('T')[0],
          extra_nights: extraNights,
          additional_cost: additionalCost,
          new_total: newTotal
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // BLOCK BED (Temporary)
  // ============================================

  /**
   * PUT /api/beds/:id/block
   * Temporarily block a bed
   */
  app.put('/api/beds/:id/block', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, blocked_until, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status === 'occupied') {
        return res.status(400).json({ error: 'Cannot block occupied bed' });
      }

      const previousStatus = bed.status;

      await dbRun(`
        UPDATE beds
        SET status = 'blocked',
            notes = ?,
            reserved_until = ?
        WHERE id = ?
      `, [reason || 'Temporarily blocked', blocked_until, id]);

      await dbRun(`
        INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, 'blocked', ?, 'blocked', ?, ?)
      `, [id, previousStatus, notes || `Blocked: ${reason}. Until: ${blocked_until || 'indefinite'}`, performed_by]);

      logActivity('beds', 'blocked', `Bed ${bed.name} blocked: ${reason}`);

      res.json({ success: true, message: 'Bed blocked successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /api/beds/:id/unblock
   * Unblock a bed
   */
  app.put('/api/beds/:id/unblock', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'blocked') {
        return res.status(400).json({ error: 'Bed is not blocked' });
      }

      await dbRun(`
        UPDATE beds
        SET status = 'clean',
            notes = NULL,
            reserved_until = NULL
        WHERE id = ?
      `, [id]);

      await dbRun(`
        INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, 'unblocked', 'blocked', 'clean', ?, ?)
      `, [id, notes || 'Bed unblocked and available', performed_by]);

      logActivity('beds', 'unblocked', `Bed ${bed.name} unblocked`);

      res.json({ success: true, message: 'Bed unblocked successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * POST /api/beds/bulk/mark-clean
   * Mark multiple beds as clean
   */
  app.post('/api/beds/bulk/mark-clean', requireAuth, async (req, res) => {
    try {
      const { bed_ids, performed_by, notes } = req.body;

      if (!bed_ids || !Array.isArray(bed_ids) || bed_ids.length === 0) {
        return res.status(400).json({ error: 'bed_ids array is required' });
      }

      const results = { success: [], failed: [] };

      for (const bedId of bed_ids) {
        const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [bedId]);

        if (!bed) {
          results.failed.push({ id: bedId, reason: 'Bed not found' });
          continue;
        }

        if (bed.status === 'occupied') {
          results.failed.push({ id: bedId, name: bed.name, reason: 'Bed is occupied' });
          continue;
        }

        const previousStatus = bed.status;

        await dbRun(`
          UPDATE beds
          SET status = 'clean',
              last_cleaned_at = datetime('now'),
              last_cleaned_by = ?
          WHERE id = ?
        `, [performed_by, bedId]);

        await dbRun(`
          INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes, performed_by)
          VALUES (?, 'bulk_cleaned', ?, 'clean', ?, ?)
        `, [bedId, previousStatus, notes || 'Bulk cleaning operation', performed_by]);

        results.success.push({ id: bedId, name: bed.name });
      }

      logActivity('beds', 'bulk_clean', `Bulk cleaned ${results.success.length} beds`);

      res.json({
        success: true,
        message: `Cleaned ${results.success.length} of ${bed_ids.length} beds`,
        results
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/beds/bulk/update-status
   * Update status of multiple beds
   */
  app.post('/api/beds/bulk/update-status', requireAuth, async (req, res) => {
    try {
      const { bed_ids, new_status, performed_by, notes } = req.body;

      const validStatuses = ['clean', 'dirty', 'maintenance', 'blocked'];

      if (!validStatuses.includes(new_status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      if (!bed_ids || !Array.isArray(bed_ids) || bed_ids.length === 0) {
        return res.status(400).json({ error: 'bed_ids array is required' });
      }

      const results = { success: [], failed: [] };

      for (const bedId of bed_ids) {
        const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [bedId]);

        if (!bed) {
          results.failed.push({ id: bedId, reason: 'Bed not found' });
          continue;
        }

        if (bed.status === 'occupied') {
          results.failed.push({ id: bedId, name: bed.name, reason: 'Bed is occupied' });
          continue;
        }

        const previousStatus = bed.status;

        await dbRun('UPDATE beds SET status = ? WHERE id = ?', [new_status, bedId]);

        await dbRun(`
          INSERT INTO bed_history (bed_id, action, previous_status, new_status, notes, performed_by)
          VALUES (?, 'bulk_status_change', ?, ?, ?, ?)
        `, [bedId, previousStatus, new_status, notes || `Bulk status change to ${new_status}`, performed_by]);

        results.success.push({ id: bedId, name: bed.name });
      }

      logActivity('beds', 'bulk_status', `Bulk status change to ${new_status}: ${results.success.length} beds`);

      res.json({
        success: true,
        message: `Updated ${results.success.length} of ${bed_ids.length} beds to ${new_status}`,
        results
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // AUTO-ASSIGN BED
  // ============================================

  /**
   * GET /api/beds/suggest
   * Suggest best available bed based on criteria
   */
  app.get('/api/beds/suggest', requireAuth, async (req, res) => {
    try {
      const {
        check_in,
        check_out,
        room_preference,
        price_max,
        price_min,
        bed_type // 'dorm', 'private'
      } = req.query;

      const checkIn = check_in || new Date().toISOString().split('T')[0];
      const checkOut = check_out || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Build query for available beds
      let query = `
        SELECT b.*,
               (SELECT COUNT(*) FROM bed_history WHERE bed_id = b.id AND action = 'checkin') as total_checkins,
               (SELECT AVG(total) FROM bookings WHERE bed_id = b.id) as avg_revenue
        FROM beds b
        WHERE b.status IN ('clean', 'reserved')
          AND b.id NOT IN (
            SELECT DISTINCT bed_id FROM bookings
            WHERE status IN ('active', 'confirmed', 'pending')
              AND check_in < ? AND check_out > ?
          )
      `;
      const params = [checkOut, checkIn];

      if (room_preference) {
        query += ' AND b.room = ?';
        params.push(room_preference);
      }

      if (price_max) {
        query += ' AND b.price <= ?';
        params.push(parseFloat(price_max));
      }

      if (price_min) {
        query += ' AND b.price >= ?';
        params.push(parseFloat(price_min));
      }

      if (bed_type === 'dorm') {
        query += " AND b.room NOT LIKE 'Priv%'";
      } else if (bed_type === 'private') {
        query += " AND b.room LIKE 'Priv%'";
      }

      // Order by preference: clean first, then by historical popularity
      query += ' ORDER BY b.status = "clean" DESC, total_checkins DESC, b.price ASC';

      const availableBeds = await dbAll(query, params);

      if (availableBeds.length === 0) {
        return res.json({
          success: true,
          message: 'No beds available for the specified criteria',
          suggestions: [],
          alternatives: await dbAll(`
            SELECT b.*,
                   (SELECT MIN(check_out) FROM bookings WHERE bed_id = b.id AND status = 'active') as available_from
            FROM beds b
            WHERE b.status = 'occupied'
            ORDER BY available_from ASC
            LIMIT 5
          `)
        });
      }

      // Calculate nights and total for each suggestion
      const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

      const suggestions = availableBeds.slice(0, 5).map((bed, index) => ({
        rank: index + 1,
        bed_id: bed.id,
        bed_name: bed.name,
        room: bed.room,
        price_per_night: bed.price,
        total_price: bed.price * nights,
        nights,
        status: bed.status,
        recommendation: index === 0 ? 'Best match' :
                       bed.status === 'clean' ? 'Available now' : 'Reserved but available'
      }));

      res.json({
        success: true,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        total_available: availableBeds.length,
        suggestions
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // DETAILED REPORTS
  // ============================================

  /**
   * GET /api/beds/reports/revenue
   * Get revenue report by bed
   */
  app.get('/api/beds/reports/revenue', requireAuth, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      const startDate = start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];

      const revenueByBed = await dbAll(`
        SELECT
          b.id,
          b.name as bed_name,
          b.room,
          b.price as current_price,
          COUNT(bk.id) as total_bookings,
          SUM(bk.nights) as total_nights,
          SUM(bk.total) as total_revenue,
          AVG(bk.total) as avg_booking_revenue,
          AVG(bk.nights) as avg_stay_length
        FROM beds b
        LEFT JOIN bookings bk ON b.id = bk.bed_id
          AND bk.check_in >= ?
          AND bk.check_in <= ?
          AND bk.status IN ('completed', 'active')
        GROUP BY b.id
        ORDER BY total_revenue DESC
      `, [startDate, endDate]);

      const revenueByRoom = await dbAll(`
        SELECT
          b.room,
          COUNT(DISTINCT b.id) as bed_count,
          COUNT(bk.id) as total_bookings,
          SUM(bk.nights) as total_nights,
          SUM(bk.total) as total_revenue
        FROM beds b
        LEFT JOIN bookings bk ON b.id = bk.bed_id
          AND bk.check_in >= ?
          AND bk.check_in <= ?
          AND bk.status IN ('completed', 'active')
        GROUP BY b.room
        ORDER BY total_revenue DESC
      `, [startDate, endDate]);

      const summary = await dbGet(`
        SELECT
          SUM(total) as total_revenue,
          SUM(nights) as total_nights,
          COUNT(*) as total_bookings,
          AVG(total) as avg_booking_value
        FROM bookings
        WHERE check_in >= ? AND check_in <= ?
          AND status IN ('completed', 'active')
      `, [startDate, endDate]);

      res.json({
        success: true,
        period: { start: startDate, end: endDate },
        summary: summary || { total_revenue: 0, total_nights: 0, total_bookings: 0 },
        by_bed: revenueByBed,
        by_room: revenueByRoom
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/beds/reports/occupancy
   * Get occupancy report
   */
  app.get('/api/beds/reports/occupancy', requireAuth, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      const startDate = start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];

      // Calculate days in period
      const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

      // Get total beds
      const totalBeds = await dbGet('SELECT COUNT(*) as count FROM beds WHERE status != ?', ['maintenance']);
      const bedsCount = totalBeds.count;

      // Total possible bed-nights
      const totalBedNights = bedsCount * periodDays;

      // Get occupied bed-nights
      const occupiedNights = await dbGet(`
        SELECT COALESCE(SUM(
          CASE
            WHEN check_in < ? THEN
              MIN(julianday(check_out), julianday(?)) - julianday(?)
            ELSE
              MIN(julianday(check_out), julianday(?)) - julianday(check_in)
          END
        ), 0) as nights
        FROM bookings
        WHERE status IN ('completed', 'active')
          AND check_out > ?
          AND check_in <= ?
      `, [startDate, endDate, startDate, endDate, startDate, endDate]);

      // Occupancy by room
      const occupancyByRoom = await dbAll(`
        SELECT
          b.room,
          COUNT(DISTINCT b.id) as bed_count,
          COALESCE(SUM(bk.nights), 0) as nights_occupied
        FROM beds b
        LEFT JOIN bookings bk ON b.id = bk.bed_id
          AND bk.check_in >= ?
          AND bk.check_in <= ?
          AND bk.status IN ('completed', 'active')
        GROUP BY b.room
      `, [startDate, endDate]);

      // Daily occupancy trend
      const dailyOccupancy = await dbAll(`
        SELECT
          date(check_in) as date,
          COUNT(*) as checkins
        FROM bookings
        WHERE check_in >= ? AND check_in <= ?
          AND status IN ('completed', 'active', 'confirmed')
        GROUP BY date(check_in)
        ORDER BY date ASC
      `, [startDate, endDate]);

      res.json({
        success: true,
        period: { start: startDate, end: endDate, days: periodDays },
        summary: {
          total_beds: bedsCount,
          total_bed_nights: totalBedNights,
          occupied_nights: Math.round(occupiedNights.nights || 0),
          occupancy_rate: totalBedNights > 0
            ? Math.round((occupiedNights.nights / totalBedNights) * 100 * 10) / 10
            : 0
        },
        by_room: occupancyByRoom.map(room => ({
          ...room,
          occupancy_rate: (room.bed_count * periodDays) > 0
            ? Math.round((room.nights_occupied / (room.bed_count * periodDays)) * 100 * 10) / 10
            : 0
        })),
        daily_trend: dailyOccupancy
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // ALERTS & NOTIFICATIONS
  // ============================================

  /**
   * GET /api/beds/alerts
   * Get bed-related alerts
   */
  app.get('/api/beds/alerts', requireAuth, async (req, res) => {
    try {
      const alerts = [];

      // Checkouts due today
      const checkoutsToday = await dbAll(`
        SELECT
          b.name as bed_name,
          g.name as guest_name,
          bk.check_out,
          bk.total
        FROM bookings bk
        JOIN beds b ON bk.bed_id = b.id
        JOIN guests g ON bk.guest_id = g.id
        WHERE date(bk.check_out) = date('now')
          AND bk.status = 'active'
      `);

      checkoutsToday.forEach(checkout => {
        alerts.push({
          type: 'checkout_due',
          priority: 'high',
          message: `Checkout due: ${checkout.guest_name} from ${checkout.bed_name}`,
          data: checkout
        });
      });

      // Overdue checkouts
      const overdueCheckouts = await dbAll(`
        SELECT
          b.name as bed_name,
          g.name as guest_name,
          g.phone as guest_phone,
          bk.check_out,
          julianday('now') - julianday(bk.check_out) as days_overdue
        FROM bookings bk
        JOIN beds b ON bk.bed_id = b.id
        JOIN guests g ON bk.guest_id = g.id
        WHERE date(bk.check_out) < date('now')
          AND bk.status = 'active'
      `);

      overdueCheckouts.forEach(checkout => {
        alerts.push({
          type: 'checkout_overdue',
          priority: 'urgent',
          message: `OVERDUE: ${checkout.guest_name} in ${checkout.bed_name} (${Math.ceil(checkout.days_overdue)} days)`,
          data: checkout
        });
      });

      // Beds dirty for more than 24 hours
      const longDirtyBeds = await dbAll(`
        SELECT
          b.name as bed_name,
          b.room,
          (julianday('now') - julianday(
            COALESCE(
              (SELECT MAX(created_at) FROM bed_history WHERE bed_id = b.id AND action = 'checkout'),
              b.created_at
            )
          )) * 24 as hours_dirty
        FROM beds b
        WHERE b.status = 'dirty'
          AND (julianday('now') - julianday(
            COALESCE(
              (SELECT MAX(created_at) FROM bed_history WHERE bed_id = b.id AND action = 'checkout'),
              b.created_at
            )
          )) * 24 > 24
      `);

      longDirtyBeds.forEach(bed => {
        alerts.push({
          type: 'cleaning_overdue',
          priority: 'medium',
          message: `Cleaning overdue: ${bed.bed_name} (${Math.round(bed.hours_dirty)} hours)`,
          data: bed
        });
      });

      // Maintenance beds
      const maintenanceBeds = await dbGet('SELECT COUNT(*) as count FROM beds WHERE status = ?', ['maintenance']);
      if (maintenanceBeds.count > 0) {
        alerts.push({
          type: 'maintenance_beds',
          priority: 'low',
          message: `${maintenanceBeds.count} bed(s) in maintenance`,
          data: { count: maintenanceBeds.count }
        });
      }

      // Arrivals today
      const arrivalsToday = await dbAll(`
        SELECT
          b.name as bed_name,
          g.name as guest_name,
          bk.check_in
        FROM bookings bk
        JOIN beds b ON bk.bed_id = b.id
        JOIN guests g ON bk.guest_id = g.id
        WHERE date(bk.check_in) = date('now')
          AND bk.status IN ('confirmed', 'pending')
      `);

      arrivalsToday.forEach(arrival => {
        alerts.push({
          type: 'arrival_expected',
          priority: 'info',
          message: `Expected arrival: ${arrival.guest_name} to ${arrival.bed_name}`,
          data: arrival
        });
      });

      // Sort by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, info: 4 };
      alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      res.json({
        success: true,
        count: alerts.length,
        alerts,
        summary: {
          urgent: alerts.filter(a => a.priority === 'urgent').length,
          high: alerts.filter(a => a.priority === 'high').length,
          medium: alerts.filter(a => a.priority === 'medium').length,
          low: alerts.filter(a => a.priority === 'low').length,
          info: alerts.filter(a => a.priority === 'info').length
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // EARLY CHECK-IN / LATE CHECK-OUT
  // ============================================

  /**
   * POST /api/beds/:id/early-checkin
   * Process early check-in
   */
  app.post('/api/beds/:id/early-checkin', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { booking_id, fee = 0, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'clean' && bed.status !== 'reserved') {
        return res.status(400).json({ error: 'Bed is not available for early check-in' });
      }

      const booking = await dbGet(`
        SELECT bk.*, g.name as guest_name
        FROM bookings bk
        JOIN guests g ON bk.guest_id = g.id
        WHERE bk.id = ? AND bk.bed_id = ?
      `, [booking_id, id]);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found for this bed' });
      }

      // Update booking status to active
      await dbRun("UPDATE bookings SET status = 'active' WHERE id = ?", [booking_id]);

      // Update bed
      await dbRun(`
        UPDATE beds
        SET status = 'occupied',
            guest_id = ?,
            reserved_for_guest_id = NULL,
            reserved_until = NULL
        WHERE id = ?
      `, [booking.guest_id, id]);

      // Add early check-in fee if any
      if (fee > 0) {
        await dbRun(
          'INSERT INTO transactions (booking_id, type, description, amount, bed_id) VALUES (?, ?, ?, ?, ?)',
          [booking_id, 'charge', 'Early check-in fee', fee, id]
        );

        await dbRun('UPDATE bookings SET total = total + ? WHERE id = ?', [fee, booking_id]);
      }

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'early_checkin', ?, 'occupied', ?, ?)
      `, [id, booking.guest_id, bed.status, notes || `Early check-in${fee > 0 ? ` (fee: ${fee})` : ''}`, performed_by]);

      logActivity('beds', 'early_checkin', `Early check-in: ${booking.guest_name} to ${bed.name}`);

      res.json({
        success: true,
        message: 'Early check-in processed',
        fee_charged: fee
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/beds/:id/late-checkout
   * Process late check-out
   */
  app.post('/api/beds/:id/late-checkout', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { fee = 0, new_checkout_time, notes, performed_by } = req.body;

      const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [id]);
      if (!bed) {
        return res.status(404).json({ error: 'Bed not found' });
      }

      if (bed.status !== 'occupied') {
        return res.status(400).json({ error: 'Bed is not occupied' });
      }

      const booking = await dbGet(`
        SELECT bk.*, g.name as guest_name
        FROM bookings bk
        JOIN guests g ON bk.guest_id = g.id
        WHERE bk.bed_id = ? AND bk.status = 'active'
      `, [id]);

      if (!booking) {
        return res.status(404).json({ error: 'No active booking found' });
      }

      // Add late checkout fee if any
      if (fee > 0) {
        await dbRun(
          'INSERT INTO transactions (booking_id, type, description, amount, bed_id) VALUES (?, ?, ?, ?, ?)',
          [booking.id, 'charge', 'Late check-out fee', fee, id]
        );

        await dbRun('UPDATE bookings SET total = total + ? WHERE id = ?', [fee, booking.id]);
      }

      // Record in history
      await dbRun(`
        INSERT INTO bed_history (bed_id, guest_id, action, previous_status, new_status, notes, performed_by)
        VALUES (?, ?, 'late_checkout_approved', 'occupied', 'occupied', ?, ?)
      `, [id, booking.guest_id, notes || `Late checkout approved${fee > 0 ? ` (fee: ${fee})` : ''}. New time: ${new_checkout_time || 'flexible'}`, performed_by]);

      logActivity('beds', 'late_checkout', `Late checkout approved: ${booking.guest_name} in ${bed.name}`);

      res.json({
        success: true,
        message: 'Late checkout approved',
        fee_charged: fee,
        new_checkout_time: new_checkout_time || 'flexible'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log('   - Advanced Bed Management routes registered');
  console.log('   - Housekeeping Dashboard routes registered');
  console.log('   - Availability Calendar routes registered');
  console.log('   - Bulk Operations routes registered');
  console.log('   - Reports & Alerts routes registered');
}

module.exports = { registerBedAdvancedRoutes };
