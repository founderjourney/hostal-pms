/**
 * ============================================================
 * ALMANIK PMS - STAFF MANAGEMENT MODULE
 * ============================================================
 *
 * Gestión completa de personal para operación de hostal.
 *
 * ROLES DISPONIBLES:
 * - manager: Gerente general, acceso total
 * - administrativo: Personal administrativo
 * - recepcionista_pago: Recepcionista con salario
 * - recepcionista_voluntario: Recepcionista voluntario
 * - aseo: Personal de limpieza
 * - mantenimiento: Personal de mantenimiento
 * - voluntario: Voluntarios generales (work exchange)
 *
 * ENDPOINTS:
 * - GET    /api/staff              - Listar todo el personal
 * - POST   /api/staff              - Crear nuevo miembro
 * - GET    /api/staff/:id          - Obtener detalle de un miembro
 * - PUT    /api/staff/:id          - Actualizar miembro
 * - DELETE /api/staff/:id          - Desactivar miembro
 * - POST   /api/staff/:id/clock-in - Registrar entrada
 * - POST   /api/staff/:id/clock-out - Registrar salida
 * - GET    /api/staff/:id/attendance - Historial de asistencia
 * - GET    /api/staff/attendance/today - Personal en turno hoy
 * - GET    /api/staff/stats        - Estadísticas generales
 *
 * @author Senior Developer
 * @version 1.0.0
 * @date 2025-11-27
 */

const express = require('express');
const router = express.Router();

// Roles válidos para hostal
const VALID_ROLES = [
  'manager',
  'administrativo',
  'recepcionista_pago',
  'recepcionista_voluntario',
  'aseo',
  'mantenimiento',
  'voluntario'
];

// Descripción de roles (para UI)
const ROLE_DESCRIPTIONS = {
  'manager': 'Gerente - Acceso total',
  'administrativo': 'Administrativo - Reportes y finanzas',
  'recepcionista_pago': 'Recepcionista con salario',
  'recepcionista_voluntario': 'Recepcionista voluntario',
  'aseo': 'Personal de limpieza',
  'mantenimiento': 'Personal de mantenimiento',
  'voluntario': 'Voluntario general'
};

/**
 * Helper: Get database adapter from request
 */
function getDb(req) {
  return req.app.locals.db;
}

/**
 * Helper: Verificar si es voluntario
 */
function isVolunteerRole(role) {
  return ['voluntario', 'recepcionista_voluntario'].includes(role);
}

/**
 * Helper: Formatear fecha para queries
 */
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

// ============================================================
// GET /api/staff - Listar todo el personal
// ============================================================
router.get('/', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { role, active, is_volunteer } = req.query;

    let query = `
      SELECT
        s.*,
        (SELECT COUNT(*) FROM attendance a WHERE a.staff_id = s.id) as total_attendance
      FROM staff s
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filtro por rol
    if (role) {
      query += isSqlite ? ` AND s.role = ?` : ` AND s.role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    // Filtro por activo
    if (active !== undefined) {
      const activeVal = active === 'true' || active === '1' ? 1 : 0;
      query += isSqlite ? ` AND s.active = ?` : ` AND s.active = $${paramCount}`;
      params.push(activeVal);
      paramCount++;
    }

    // Filtro por voluntario
    if (is_volunteer !== undefined) {
      const volVal = is_volunteer === 'true' || is_volunteer === '1' ? 1 : 0;
      query += isSqlite ? ` AND s.is_volunteer = ?` : ` AND s.is_volunteer = $${paramCount}`;
      params.push(volVal);
      paramCount++;
    }

    query += ` ORDER BY s.active DESC, s.name ASC`;

    const staff = await db.query(query, params);

    res.json({
      success: true,
      count: staff.length,
      roles: VALID_ROLES,
      role_descriptions: ROLE_DESCRIPTIONS,
      staff: staff
    });

  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff',
      message: error.message
    });
  }
});

// ============================================================
// POST /api/staff - Crear nuevo miembro del personal
// ============================================================
router.post('/', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const {
      name,
      role,
      position,
      phone,
      email,
      document,
      salary,
      schedule,
      hire_date,
      end_date,
      emergency_contact_name,
      emergency_contact_phone,
      notes
    } = req.body;

    // Validaciones
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}`
      });
    }

    // Determinar si es voluntario
    const is_volunteer = isVolunteerRole(role) ? 1 : 0;

    // Usar position si no se proporciona, basado en role
    const finalPosition = position || ROLE_DESCRIPTIONS[role];

    // Query de inserción
    const insertQuery = isSqlite
      ? `INSERT INTO staff (
          name, role, position, phone, email, document, salary, schedule,
          hire_date, end_date, emergency_contact_name, emergency_contact_phone,
          notes, is_volunteer, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`
      : `INSERT INTO staff (
          name, role, position, phone, email, document, salary, schedule,
          hire_date, end_date, emergency_contact_name, emergency_contact_phone,
          notes, is_volunteer, active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, CURRENT_TIMESTAMP)
        RETURNING *`;

    const params = [
      name,
      role,
      finalPosition,
      phone || null,
      email || null,
      document || null,
      is_volunteer ? 0 : (salary || null),
      schedule || null,
      hire_date || formatDate(new Date()),
      end_date || null,
      emergency_contact_name || null,
      emergency_contact_phone || null,
      notes || null,
      is_volunteer
    ];

    const result = await db.run(insertQuery, params);

    // Obtener el registro creado
    const newStaffId = isSqlite ? result.id : result.id;
    const newStaff = await db.get(
      isSqlite
        ? 'SELECT * FROM staff WHERE id = ?'
        : 'SELECT * FROM staff WHERE id = $1',
      [newStaffId]
    );

    // Log de actividad
    await db.run(
      isSqlite
        ? `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      ['create', 'staff', `Staff member created: ${name} (${role})`, 'staff', newStaffId]
    );

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      staff: newStaff
    });

  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create staff member',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/staff/stats - Estadísticas generales
// ============================================================
router.get('/stats', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    // Total por rol
    const byRoleQuery = `
      SELECT role, COUNT(*) as count
      FROM staff
      WHERE active = ${isSqlite ? '1' : 'true'}
      GROUP BY role
      ORDER BY count DESC
    `;
    const byRole = await db.query(byRoleQuery);

    // Total activos vs inactivos
    const activeQuery = `
      SELECT
        SUM(CASE WHEN active = ${isSqlite ? '1' : 'true'} THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN active = ${isSqlite ? '0' : 'false'} THEN 1 ELSE 0 END) as inactive_count
      FROM staff
    `;
    const activeStats = await db.get(activeQuery);

    // Voluntarios vs pagos
    const volunteerQuery = `
      SELECT
        SUM(CASE WHEN is_volunteer = ${isSqlite ? '1' : 'true'} THEN 1 ELSE 0 END) as volunteers,
        SUM(CASE WHEN is_volunteer = ${isSqlite ? '0' : 'false'} THEN 1 ELSE 0 END) as paid
      FROM staff
      WHERE active = ${isSqlite ? '1' : 'true'}
    `;
    const volunteerStats = await db.get(volunteerQuery);

    // Personal en turno hoy
    const today = formatDate(new Date());
    const onDutyQuery = isSqlite
      ? `SELECT COUNT(DISTINCT staff_id) as on_duty
         FROM attendance
         WHERE date = ? AND clock_out IS NULL`
      : `SELECT COUNT(DISTINCT staff_id) as on_duty
         FROM attendance
         WHERE date = $1 AND clock_out IS NULL`;
    const onDuty = await db.get(onDutyQuery, [today]);

    res.json({
      success: true,
      stats: {
        total_active: parseInt(activeStats.active_count || 0),
        total_inactive: parseInt(activeStats.inactive_count || 0),
        volunteers: parseInt(volunteerStats.volunteers || 0),
        paid_staff: parseInt(volunteerStats.paid || 0),
        on_duty_today: parseInt(onDuty.on_duty || 0),
        by_role: byRole
      }
    });

  } catch (error) {
    console.error('Error fetching staff stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/staff/attendance/today - Personal en turno hoy
// ============================================================
router.get('/attendance/today', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const today = formatDate(new Date());

    const query = isSqlite
      ? `SELECT
          a.*,
          s.name as staff_name,
          s.role,
          s.position,
          s.phone
         FROM attendance a
         JOIN staff s ON a.staff_id = s.id
         WHERE a.date = ?
         ORDER BY a.clock_in DESC`
      : `SELECT
          a.*,
          s.name as staff_name,
          s.role,
          s.position,
          s.phone
         FROM attendance a
         JOIN staff s ON a.staff_id = s.id
         WHERE a.date = $1
         ORDER BY a.clock_in DESC`;

    const attendance = await db.query(query, [today]);

    // Separar por estado
    const onDuty = attendance.filter(a => a.clock_in && !a.clock_out);
    const completed = attendance.filter(a => a.clock_in && a.clock_out);

    res.json({
      success: true,
      date: today,
      on_duty: onDuty,
      completed: completed,
      total_on_duty: onDuty.length,
      total_completed: completed.length
    });

  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/staff/:id - Obtener detalle de un miembro
// ============================================================
router.get('/:id', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;

    const staff = await db.get(
      isSqlite
        ? 'SELECT * FROM staff WHERE id = ?'
        : 'SELECT * FROM staff WHERE id = $1',
      [id]
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Obtener últimas asistencias
    const attendanceQuery = isSqlite
      ? `SELECT * FROM attendance WHERE staff_id = ? ORDER BY date DESC LIMIT 10`
      : `SELECT * FROM attendance WHERE staff_id = $1 ORDER BY date DESC LIMIT 10`;

    const recentAttendance = await db.query(attendanceQuery, [id]);

    // Estadísticas de asistencia del mes actual
    const monthStart = new Date();
    monthStart.setDate(1);
    const statsQuery = isSqlite
      ? `SELECT
          COUNT(*) as days_worked,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
         FROM attendance
         WHERE staff_id = ? AND date >= ?`
      : `SELECT
          COUNT(*) as days_worked,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
         FROM attendance
         WHERE staff_id = $1 AND date >= $2`;

    const monthStats = await db.get(statsQuery, [id, formatDate(monthStart)]);

    res.json({
      success: true,
      staff: staff,
      recent_attendance: recentAttendance,
      month_stats: monthStats
    });

  } catch (error) {
    console.error('Error fetching staff member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff member',
      message: error.message
    });
  }
});

// ============================================================
// PUT /api/staff/:id - Actualizar miembro
// ============================================================
router.put('/:id', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;
    const {
      name,
      role,
      position,
      phone,
      email,
      document,
      salary,
      schedule,
      hire_date,
      end_date,
      emergency_contact_name,
      emergency_contact_phone,
      notes,
      active
    } = req.body;

    // Verificar que existe
    const existing = await db.get(
      isSqlite ? 'SELECT * FROM staff WHERE id = ?' : 'SELECT * FROM staff WHERE id = $1',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Validar rol si se proporciona
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}`
      });
    }

    const finalRole = role || existing.role;
    const is_volunteer = isVolunteerRole(finalRole) ? 1 : 0;

    const updateQuery = isSqlite
      ? `UPDATE staff SET
          name = ?,
          role = ?,
          position = ?,
          phone = ?,
          email = ?,
          document = ?,
          salary = ?,
          schedule = ?,
          hire_date = ?,
          end_date = ?,
          emergency_contact_name = ?,
          emergency_contact_phone = ?,
          notes = ?,
          is_volunteer = ?,
          active = ?
         WHERE id = ?`
      : `UPDATE staff SET
          name = $1,
          role = $2,
          position = $3,
          phone = $4,
          email = $5,
          document = $6,
          salary = $7,
          schedule = $8,
          hire_date = $9,
          end_date = $10,
          emergency_contact_name = $11,
          emergency_contact_phone = $12,
          notes = $13,
          is_volunteer = $14,
          active = $15
         WHERE id = $16`;

    await db.run(updateQuery, [
      name || existing.name,
      finalRole,
      position || existing.position,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      document !== undefined ? document : existing.document,
      is_volunteer ? 0 : (salary !== undefined ? salary : existing.salary),
      schedule !== undefined ? schedule : existing.schedule,
      hire_date || existing.hire_date,
      end_date !== undefined ? end_date : existing.end_date,
      emergency_contact_name !== undefined ? emergency_contact_name : existing.emergency_contact_name,
      emergency_contact_phone !== undefined ? emergency_contact_phone : existing.emergency_contact_phone,
      notes !== undefined ? notes : existing.notes,
      is_volunteer,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      id
    ]);

    // Obtener actualizado
    const updated = await db.get(
      isSqlite ? 'SELECT * FROM staff WHERE id = ?' : 'SELECT * FROM staff WHERE id = $1',
      [id]
    );

    // Log de actividad
    await db.run(
      isSqlite
        ? `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      ['update', 'staff', `Staff member updated: ${updated.name}`, 'staff', id]
    );

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: updated
    });

  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff member',
      message: error.message
    });
  }
});

// ============================================================
// DELETE /api/staff/:id - Desactivar miembro (soft delete)
// ============================================================
router.delete('/:id', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;

    const staff = await db.get(
      isSqlite ? 'SELECT * FROM staff WHERE id = ?' : 'SELECT * FROM staff WHERE id = $1',
      [id]
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Soft delete (marcar como inactivo)
    await db.run(
      isSqlite
        ? `UPDATE staff SET active = 0, end_date = ? WHERE id = ?`
        : `UPDATE staff SET active = false, end_date = $1 WHERE id = $2`,
      [formatDate(new Date()), id]
    );

    // Log de actividad
    await db.run(
      isSqlite
        ? `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      ['delete', 'staff', `Staff member deactivated: ${staff.name}`, 'staff', id]
    );

    res.json({
      success: true,
      message: 'Staff member deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate staff member',
      message: error.message
    });
  }
});

// ============================================================
// POST /api/staff/:id/clock-in - Registrar entrada
// ============================================================
router.post('/:id/clock-in', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;
    const { notes } = req.body;
    const today = formatDate(new Date());
    const now = new Date().toISOString();

    // Verificar que el staff existe y está activo
    const staff = await db.get(
      isSqlite
        ? 'SELECT * FROM staff WHERE id = ? AND active = 1'
        : 'SELECT * FROM staff WHERE id = $1 AND active = true',
      [id]
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found or inactive'
      });
    }

    // Verificar si ya tiene clock-in hoy
    const existingQuery = isSqlite
      ? 'SELECT * FROM attendance WHERE staff_id = ? AND date = ?'
      : 'SELECT * FROM attendance WHERE staff_id = $1 AND date = $2';

    const existing = await db.get(existingQuery, [id, today]);

    if (existing && existing.clock_in) {
      return res.status(400).json({
        success: false,
        error: 'Already clocked in today',
        attendance: existing
      });
    }

    // Crear o actualizar registro de asistencia
    let attendanceId;

    if (existing) {
      // Actualizar registro existente
      await db.run(
        isSqlite
          ? `UPDATE attendance SET clock_in = ?, status = 'present', notes = ? WHERE id = ?`
          : `UPDATE attendance SET clock_in = $1, status = 'present', notes = $2 WHERE id = $3`,
        [now, notes || existing.notes, existing.id]
      );
      attendanceId = existing.id;
    } else {
      // Crear nuevo registro
      const insertQuery = isSqlite
        ? `INSERT INTO attendance (staff_id, date, clock_in, status, notes, created_at)
           VALUES (?, ?, ?, 'present', ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO attendance (staff_id, date, clock_in, status, notes, created_at)
           VALUES ($1, $2, $3, 'present', $4, CURRENT_TIMESTAMP)
           RETURNING id`;

      const result = await db.run(insertQuery, [id, today, now, notes || null]);
      attendanceId = result.id;
    }

    // Obtener registro actualizado
    const attendance = await db.get(
      isSqlite
        ? 'SELECT * FROM attendance WHERE id = ?'
        : 'SELECT * FROM attendance WHERE id = $1',
      [attendanceId]
    );

    // Log de actividad
    await db.run(
      isSqlite
        ? `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      ['clock_in', 'staff', `${staff.name} clocked in`, 'attendance', attendanceId]
    );

    res.json({
      success: true,
      message: `${staff.name} clocked in successfully`,
      attendance: attendance
    });

  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clock in',
      message: error.message
    });
  }
});

// ============================================================
// POST /api/staff/:id/clock-out - Registrar salida
// ============================================================
router.post('/:id/clock-out', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;
    const { notes } = req.body;
    const today = formatDate(new Date());
    const now = new Date().toISOString();

    // Verificar que el staff existe
    const staff = await db.get(
      isSqlite ? 'SELECT * FROM staff WHERE id = ?' : 'SELECT * FROM staff WHERE id = $1',
      [id]
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Buscar registro de asistencia de hoy con clock_in
    const existingQuery = isSqlite
      ? 'SELECT * FROM attendance WHERE staff_id = ? AND date = ? AND clock_in IS NOT NULL'
      : 'SELECT * FROM attendance WHERE staff_id = $1 AND date = $2 AND clock_in IS NOT NULL';

    const existing = await db.get(existingQuery, [id, today]);

    if (!existing) {
      return res.status(400).json({
        success: false,
        error: 'No clock-in record found for today'
      });
    }

    if (existing.clock_out) {
      return res.status(400).json({
        success: false,
        error: 'Already clocked out today',
        attendance: existing
      });
    }

    // Actualizar con clock_out
    await db.run(
      isSqlite
        ? `UPDATE attendance SET clock_out = ?, notes = ? WHERE id = ?`
        : `UPDATE attendance SET clock_out = $1, notes = $2 WHERE id = $3`,
      [now, notes || existing.notes, existing.id]
    );

    // Obtener registro actualizado
    const attendance = await db.get(
      isSqlite
        ? 'SELECT * FROM attendance WHERE id = ?'
        : 'SELECT * FROM attendance WHERE id = $1',
      [existing.id]
    );

    // Calcular horas trabajadas
    const clockIn = new Date(attendance.clock_in);
    const clockOut = new Date(attendance.clock_out);
    const hoursWorked = ((clockOut - clockIn) / (1000 * 60 * 60)).toFixed(2);

    // Log de actividad
    await db.run(
      isSqlite
        ? `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      ['clock_out', 'staff', `${staff.name} clocked out (${hoursWorked}h)`, 'attendance', existing.id]
    );

    res.json({
      success: true,
      message: `${staff.name} clocked out successfully`,
      hours_worked: parseFloat(hoursWorked),
      attendance: attendance
    });

  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clock out',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/staff/:id/attendance - Historial de asistencia
// ============================================================
router.get('/:id/attendance', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;
    const { start_date, end_date, limit = 30 } = req.query;

    // Verificar que el staff existe
    const staff = await db.get(
      isSqlite ? 'SELECT * FROM staff WHERE id = ?' : 'SELECT * FROM staff WHERE id = $1',
      [id]
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    let query = isSqlite
      ? `SELECT * FROM attendance WHERE staff_id = ?`
      : `SELECT * FROM attendance WHERE staff_id = $1`;

    const params = [id];
    let paramCount = 2;

    if (start_date) {
      query += isSqlite ? ` AND date >= ?` : ` AND date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += isSqlite ? ` AND date <= ?` : ` AND date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    query += ` ORDER BY date DESC`;

    if (limit) {
      query += isSqlite ? ` LIMIT ?` : ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
    }

    const attendance = await db.query(query, params);

    // Calcular estadísticas
    const stats = {
      total_days: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      total_hours: 0
    };

    // Calcular horas totales
    attendance.forEach(a => {
      if (a.clock_in && a.clock_out) {
        const hours = (new Date(a.clock_out) - new Date(a.clock_in)) / (1000 * 60 * 60);
        stats.total_hours += hours;
      }
    });
    stats.total_hours = parseFloat(stats.total_hours.toFixed(2));

    res.json({
      success: true,
      staff: { id: staff.id, name: staff.name, role: staff.role },
      attendance: attendance,
      stats: stats
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/staff/roles - Obtener lista de roles válidos
// ============================================================
router.get('/config/roles', async (req, res) => {
  res.json({
    success: true,
    roles: VALID_ROLES,
    descriptions: ROLE_DESCRIPTIONS
  });
});

module.exports = router;
