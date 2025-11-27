/**
 * ============================================================
 * ALMANIK PMS - TASKS/MAINTENANCE MODULE
 * ============================================================
 *
 * Gestión de tareas de limpieza y mantenimiento para hostal.
 *
 * TIPOS DE TAREA:
 * - cleaning: Limpieza de habitación/cama
 * - maintenance: Mantenimiento/reparación
 * - check_preparation: Preparación para check-in
 * - inspection: Inspección
 * - restock: Reabastecimiento
 * - other: Otros
 *
 * PRIORIDADES:
 * - urgent: Urgente
 * - high: Alta
 * - normal: Normal
 * - low: Baja
 *
 * ENDPOINTS:
 * - GET    /api/tasks              - Listar tareas
 * - POST   /api/tasks              - Crear tarea
 * - GET    /api/tasks/:id          - Obtener tarea
 * - PUT    /api/tasks/:id          - Actualizar tarea
 * - DELETE /api/tasks/:id          - Cancelar tarea
 * - POST   /api/tasks/:id/start    - Iniciar tarea
 * - POST   /api/tasks/:id/complete - Completar tarea
 * - GET    /api/tasks/stats        - Estadísticas
 * - GET    /api/tasks/my           - Mis tareas asignadas
 * - POST   /api/tasks/bed/:bedId/cleaning - Crear tarea limpieza cama
 *
 * @author Senior Developer
 * @version 1.0.0
 * @date 2025-11-27
 */

const express = require('express');
const router = express.Router();

// Tipos de tarea válidos
const TASK_TYPES = [
  'cleaning',
  'maintenance',
  'check_preparation',
  'inspection',
  'restock',
  'other'
];

const TASK_TYPE_LABELS = {
  'cleaning': 'Limpieza',
  'maintenance': 'Mantenimiento',
  'check_preparation': 'Preparación Check-in',
  'inspection': 'Inspección',
  'restock': 'Reabastecimiento',
  'other': 'Otro'
};

// Prioridades válidas
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

const PRIORITY_LABELS = {
  'urgent': 'Urgente',
  'high': 'Alta',
  'normal': 'Normal',
  'low': 'Baja'
};

// Estados válidos
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

const STATUS_LABELS = {
  'pending': 'Pendiente',
  'in_progress': 'En Progreso',
  'completed': 'Completada',
  'cancelled': 'Cancelada'
};

/**
 * Helper: Get database adapter from request
 */
function getDb(req) {
  return req.app.locals.db;
}

/**
 * Helper: Format date
 */
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toISOString();
}

// ============================================================
// GET /api/tasks - Listar tareas
// ============================================================
router.get('/', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { status, task_type, priority, staff_id, entity_type, entity_id, due_today } = req.query;

    let query = `
      SELECT
        t.*,
        s.name as staff_name,
        s.role as staff_role,
        u.name as assigned_by_name
      FROM tasks t
      LEFT JOIN staff s ON t.staff_id = s.id
      LEFT JOIN users u ON t.assigned_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += isSqlite ? ` AND t.status = ?` : ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (task_type) {
      query += isSqlite ? ` AND t.task_type = ?` : ` AND t.task_type = $${paramCount}`;
      params.push(task_type);
      paramCount++;
    }

    if (priority) {
      query += isSqlite ? ` AND t.priority = ?` : ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (staff_id) {
      query += isSqlite ? ` AND t.staff_id = ?` : ` AND t.staff_id = $${paramCount}`;
      params.push(staff_id);
      paramCount++;
    }

    if (entity_type) {
      query += isSqlite ? ` AND t.entity_type = ?` : ` AND t.entity_type = $${paramCount}`;
      params.push(entity_type);
      paramCount++;
    }

    if (entity_id) {
      query += isSqlite ? ` AND t.entity_id = ?` : ` AND t.entity_id = $${paramCount}`;
      params.push(entity_id);
      paramCount++;
    }

    if (due_today === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query += isSqlite
        ? ` AND DATE(t.due_date) = ?`
        : ` AND DATE(t.due_date) = $${paramCount}`;
      params.push(today);
      paramCount++;
    }

    // Order: urgent first, then by priority, then by due_date
    query += `
      ORDER BY
        CASE t.status
          WHEN 'in_progress' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'cancelled' THEN 4
        END,
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `;

    const tasks = await db.query(query, params);

    res.json({
      success: true,
      count: tasks.length,
      task_types: TASK_TYPES,
      task_type_labels: TASK_TYPE_LABELS,
      priorities: PRIORITIES,
      priority_labels: PRIORITY_LABELS,
      statuses: STATUSES,
      status_labels: STATUS_LABELS,
      tasks: tasks
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/tasks/stats - Estadísticas
// ============================================================
router.get('/stats', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    // Count by status
    const byStatusQuery = `
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `;
    const byStatus = await db.query(byStatusQuery);

    // Count by type
    const byTypeQuery = `
      SELECT task_type, COUNT(*) as count
      FROM tasks
      WHERE status IN ('pending', 'in_progress')
      GROUP BY task_type
    `;
    const byType = await db.query(byTypeQuery);

    // Count by priority (pending/in_progress only)
    const byPriorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE status IN ('pending', 'in_progress')
      GROUP BY priority
    `;
    const byPriority = await db.query(byPriorityQuery);

    // Overdue tasks
    const today = new Date().toISOString().split('T')[0];
    const overdueQuery = isSqlite
      ? `SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date < ?`
      : `SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date < $1`;
    const overdue = await db.get(overdueQuery, [today]);

    // Today's tasks
    const todayQuery = isSqlite
      ? `SELECT COUNT(*) as count FROM tasks WHERE DATE(due_date) = ?`
      : `SELECT COUNT(*) as count FROM tasks WHERE DATE(due_date) = $1`;
    const todayTasks = await db.get(todayQuery, [today]);

    // Completed today
    const completedTodayQuery = isSqlite
      ? `SELECT COUNT(*) as count FROM tasks WHERE DATE(completed_at) = ?`
      : `SELECT COUNT(*) as count FROM tasks WHERE DATE(completed_at) = $1`;
    const completedToday = await db.get(completedTodayQuery, [today]);

    // Unassigned tasks
    const unassignedQuery = `
      SELECT COUNT(*) as count FROM tasks
      WHERE status IN ('pending', 'in_progress') AND staff_id IS NULL
    `;
    const unassigned = await db.get(unassignedQuery);

    res.json({
      success: true,
      stats: {
        by_status: byStatus,
        by_type: byType,
        by_priority: byPriority,
        overdue: parseInt(overdue.count || 0),
        due_today: parseInt(todayTasks.count || 0),
        completed_today: parseInt(completedToday.count || 0),
        unassigned: parseInt(unassigned.count || 0)
      }
    });

  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/tasks/my - Mis tareas asignadas
// ============================================================
router.get('/my', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    // Get staff_id from session (if staff is logged in)
    const staffId = req.query.staff_id;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        error: 'staff_id is required'
      });
    }

    const query = isSqlite
      ? `SELECT t.*, s.name as staff_name
         FROM tasks t
         LEFT JOIN staff s ON t.staff_id = s.id
         WHERE t.staff_id = ? AND t.status IN ('pending', 'in_progress')
         ORDER BY
           CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
           t.due_date ASC`
      : `SELECT t.*, s.name as staff_name
         FROM tasks t
         LEFT JOIN staff s ON t.staff_id = s.id
         WHERE t.staff_id = $1 AND t.status IN ('pending', 'in_progress')
         ORDER BY
           CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
           t.due_date ASC`;

    const tasks = await db.query(query, [staffId]);

    res.json({
      success: true,
      count: tasks.length,
      tasks: tasks
    });

  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      message: error.message
    });
  }
});

// ============================================================
// POST /api/tasks - Crear tarea
// ============================================================
router.post('/', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const {
      title,
      description,
      task_type = 'other',
      priority = 'normal',
      staff_id,
      entity_type,
      entity_id,
      due_date
    } = req.body;

    // Validaciones
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    if (!TASK_TYPES.includes(task_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid task_type. Valid: ${TASK_TYPES.join(', ')}`
      });
    }

    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Valid: ${PRIORITIES.join(', ')}`
      });
    }

    const assignedBy = req.session?.userId || null;

    const insertQuery = isSqlite
      ? `INSERT INTO tasks (
          title, description, task_type, priority, staff_id,
          entity_type, entity_id, due_date, assigned_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
      : `INSERT INTO tasks (
          title, description, task_type, priority, staff_id,
          entity_type, entity_id, due_date, assigned_by, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', CURRENT_TIMESTAMP)
        RETURNING *`;

    const result = await db.run(insertQuery, [
      title,
      description || null,
      task_type,
      priority,
      staff_id || null,
      entity_type || null,
      entity_id || null,
      due_date || null,
      assignedBy
    ]);

    const newTask = await db.get(
      isSqlite
        ? 'SELECT * FROM tasks WHERE id = ?'
        : 'SELECT * FROM tasks WHERE id = $1',
      [result.id]
    );

    // Activity log
    await db.run(
      isSqlite
        ? `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      ['create', 'tasks', `Task created: ${title}`, 'task', result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: newTask
    });

  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      message: error.message
    });
  }
});

// ============================================================
// POST /api/tasks/bed/:bedId/cleaning - Crear tarea de limpieza para cama
// ============================================================
router.post('/bed/:bedId/cleaning', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { bedId } = req.params;
    const { staff_id, priority = 'normal', notes } = req.body;

    // Get bed info
    const bed = await db.get(
      isSqlite ? 'SELECT * FROM beds WHERE id = ?' : 'SELECT * FROM beds WHERE id = $1',
      [bedId]
    );

    if (!bed) {
      return res.status(404).json({
        success: false,
        error: 'Bed not found'
      });
    }

    const title = `Limpieza: ${bed.name}${bed.room ? ` (${bed.room})` : ''}`;
    const description = notes || `Limpieza y preparación de cama ${bed.name}`;

    const insertQuery = isSqlite
      ? `INSERT INTO tasks (
          title, description, task_type, priority, staff_id,
          entity_type, entity_id, status, created_at
        ) VALUES (?, ?, 'cleaning', ?, ?, 'bed', ?, 'pending', CURRENT_TIMESTAMP)`
      : `INSERT INTO tasks (
          title, description, task_type, priority, staff_id,
          entity_type, entity_id, status, created_at
        ) VALUES ($1, $2, 'cleaning', $3, $4, 'bed', $5, 'pending', CURRENT_TIMESTAMP)
        RETURNING *`;

    const result = await db.run(insertQuery, [
      title,
      description,
      priority,
      staff_id || null,
      bedId
    ]);

    const newTask = await db.get(
      isSqlite
        ? 'SELECT * FROM tasks WHERE id = ?'
        : 'SELECT * FROM tasks WHERE id = $1',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Cleaning task created',
      task: newTask
    });

  } catch (error) {
    console.error('Error creating cleaning task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cleaning task',
      message: error.message
    });
  }
});

// ============================================================
// GET /api/tasks/:id - Obtener tarea
// ============================================================
router.get('/:id', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;

    const task = await db.get(
      isSqlite
        ? `SELECT t.*, s.name as staff_name, s.role as staff_role, u.name as assigned_by_name
           FROM tasks t
           LEFT JOIN staff s ON t.staff_id = s.id
           LEFT JOIN users u ON t.assigned_by = u.id
           WHERE t.id = ?`
        : `SELECT t.*, s.name as staff_name, s.role as staff_role, u.name as assigned_by_name
           FROM tasks t
           LEFT JOIN staff s ON t.staff_id = s.id
           LEFT JOIN users u ON t.assigned_by = u.id
           WHERE t.id = $1`,
      [id]
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      task: task
    });

  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
      message: error.message
    });
  }
});

// ============================================================
// PUT /api/tasks/:id - Actualizar tarea
// ============================================================
router.put('/:id', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;
    const {
      title,
      description,
      task_type,
      priority,
      staff_id,
      due_date,
      status
    } = req.body;

    const existing = await db.get(
      isSqlite ? 'SELECT * FROM tasks WHERE id = ?' : 'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Validate task_type and priority if provided
    if (task_type && !TASK_TYPES.includes(task_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid task_type. Valid: ${TASK_TYPES.join(', ')}`
      });
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Valid: ${PRIORITIES.join(', ')}`
      });
    }

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid: ${STATUSES.join(', ')}`
      });
    }

    const updateQuery = isSqlite
      ? `UPDATE tasks SET
          title = ?,
          description = ?,
          task_type = ?,
          priority = ?,
          staff_id = ?,
          due_date = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      : `UPDATE tasks SET
          title = $1,
          description = $2,
          task_type = $3,
          priority = $4,
          staff_id = $5,
          due_date = $6,
          status = $7,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`;

    await db.run(updateQuery, [
      title || existing.title,
      description !== undefined ? description : existing.description,
      task_type || existing.task_type,
      priority || existing.priority,
      staff_id !== undefined ? staff_id : existing.staff_id,
      due_date !== undefined ? due_date : existing.due_date,
      status || existing.status,
      id
    ]);

    const updated = await db.get(
      isSqlite ? 'SELECT * FROM tasks WHERE id = ?' : 'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updated
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      message: error.message
    });
  }
});

// ============================================================
// POST /api/tasks/:id/start - Iniciar tarea
// ============================================================
router.post('/:id/start', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;

    const task = await db.get(
      isSqlite ? 'SELECT * FROM tasks WHERE id = ?' : 'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot start task with status: ${task.status}`
      });
    }

    await db.run(
      isSqlite
        ? `UPDATE tasks SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        : `UPDATE tasks SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    const updated = await db.get(
      isSqlite ? 'SELECT * FROM tasks WHERE id = ?' : 'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Task started',
      task: updated
    });

  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start task',
      message: error.message
    });
  }
});

// ============================================================
// POST /api/tasks/:id/complete - Completar tarea
// ============================================================
router.post('/:id/complete', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;
    const { completion_notes } = req.body;

    const task = await db.get(
      isSqlite ? 'SELECT * FROM tasks WHERE id = ?' : 'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (!['pending', 'in_progress'].includes(task.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot complete task with status: ${task.status}`
      });
    }

    await db.run(
      isSqlite
        ? `UPDATE tasks SET
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            completion_notes = ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        : `UPDATE tasks SET
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            completion_notes = $1,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
      [completion_notes || null, id]
    );

    // If it's a bed cleaning task, update bed status to clean
    if (task.task_type === 'cleaning' && task.entity_type === 'bed' && task.entity_id) {
      await db.run(
        isSqlite
          ? `UPDATE beds SET status = 'clean' WHERE id = ? AND status = 'dirty'`
          : `UPDATE beds SET status = 'clean' WHERE id = $1 AND status = 'dirty'`,
        [task.entity_id]
      );
    }

    const updated = await db.get(
      isSqlite ? 'SELECT * FROM tasks WHERE id = ?' : 'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    // Activity log
    await db.run(
      isSqlite
        ? `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO activity_log (action_type, module, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      ['complete', 'tasks', `Task completed: ${task.title}`, 'task', id]
    );

    res.json({
      success: true,
      message: 'Task completed',
      task: updated
    });

  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete task',
      message: error.message
    });
  }
});

// ============================================================
// DELETE /api/tasks/:id - Cancelar tarea
// ============================================================
router.delete('/:id', async (req, res) => {
  const db = getDb(req);

  try {
    await db.ensureConnection();
    const isSqlite = !db.isProduction;

    const { id } = req.params;

    const task = await db.get(
      isSqlite ? 'SELECT * FROM tasks WHERE id = ?' : 'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (task.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed task'
      });
    }

    await db.run(
      isSqlite
        ? `UPDATE tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        : `UPDATE tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Task cancelled'
    });

  } catch (error) {
    console.error('Error cancelling task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel task',
      message: error.message
    });
  }
});

module.exports = router;
