/**
 * Audit Module - Complete Audit Logging System
 * DEV3-11: Audit Logging Completo
 *
 * Features:
 * - Query audit logs with filters
 * - Track all system actions
 * - Store old/new values for changes
 * - Export audit trails
 *
 * Endpoints:
 * - GET  /api/admin/audit         - List audit logs with filters
 * - GET  /api/admin/audit/:id     - Get specific audit entry
 * - GET  /api/admin/audit/stats   - Get audit statistics
 * - GET  /api/admin/audit/export  - Export audit logs
 * - GET  /api/admin/audit/entity/:type/:id - Get entity audit trail
 */

const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

let dbAll, dbGet, dbRun;

/**
 * Initialize database functions
 */
function initDb(all, get, run) {
  dbAll = all;
  dbGet = get;
  dbRun = run;
}

/**
 * Check if running in SQLite mode
 */
function isSqlite() {
  return process.env.NODE_ENV !== 'production' || !process.env.DATABASE_URL;
}

/**
 * Migrate audit_log table to include old_value and new_value columns
 */
async function migrateAuditTable() {
  try {
    if (isSqlite()) {
      // Check if columns exist
      const tableInfo = await dbAll(`PRAGMA table_info(activity_log)`);
      const hasOldValue = tableInfo.some(col => col.name === 'old_value');
      const hasNewValue = tableInfo.some(col => col.name === 'new_value');
      const hasUserAgent = tableInfo.some(col => col.name === 'user_agent');

      if (!hasOldValue) {
        await dbRun(`ALTER TABLE activity_log ADD COLUMN old_value TEXT`);
        logger.info('Added old_value column to activity_log');
      }
      if (!hasNewValue) {
        await dbRun(`ALTER TABLE activity_log ADD COLUMN new_value TEXT`);
        logger.info('Added new_value column to activity_log');
      }
      if (!hasUserAgent) {
        await dbRun(`ALTER TABLE activity_log ADD COLUMN user_agent TEXT`);
        logger.info('Added user_agent column to activity_log');
      }
    } else {
      // PostgreSQL
      await dbRun(`
        ALTER TABLE activity_log
        ADD COLUMN IF NOT EXISTS old_value JSONB,
        ADD COLUMN IF NOT EXISTS new_value JSONB,
        ADD COLUMN IF NOT EXISTS user_agent TEXT
      `);
    }
    logger.info('Audit table migration completed');
  } catch (error) {
    // Columns might already exist
    logger.debug('Audit migration:', error.message);
  }
}

/**
 * Log an action to the audit trail
 */
async function logAction({
  actionType,
  module,
  description,
  userId = null,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  details = null
}) {
  try {
    const query = isSqlite()
      ? `INSERT INTO activity_log
         (action_type, module, description, user_id, entity_type, entity_id,
          old_value, new_value, ip_address, user_agent, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO activity_log
         (action_type, module, description, user_id, entity_type, entity_id,
          old_value, new_value, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

    await dbRun(query, [
      actionType,
      module,
      description,
      userId,
      entityType,
      entityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress,
      userAgent,
      details ? JSON.stringify(details) : null
    ]);
  } catch (error) {
    logger.error('Failed to log audit action:', error);
  }
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * GET /api/admin/audit
 * List audit logs with filters
 *
 * Query params:
 * - action_type: Filter by action type
 * - module: Filter by module
 * - user_id: Filter by user
 * - entity_type: Filter by entity type
 * - entity_id: Filter by entity ID
 * - start_date: Filter from date
 * - end_date: Filter to date
 * - search: Search in description
 * - page: Page number (default 1)
 * - limit: Items per page (default 50)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      action_type,
      module,
      user_id,
      entity_type,
      entity_id,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (action_type) {
      conditions.push(isSqlite() ? 'action_type = ?' : `action_type = $${paramIndex++}`);
      params.push(action_type);
    }

    if (module) {
      conditions.push(isSqlite() ? 'module = ?' : `module = $${paramIndex++}`);
      params.push(module);
    }

    if (user_id) {
      conditions.push(isSqlite() ? 'user_id = ?' : `user_id = $${paramIndex++}`);
      params.push(parseInt(user_id));
    }

    if (entity_type) {
      conditions.push(isSqlite() ? 'entity_type = ?' : `entity_type = $${paramIndex++}`);
      params.push(entity_type);
    }

    if (entity_id) {
      conditions.push(isSqlite() ? 'entity_id = ?' : `entity_id = $${paramIndex++}`);
      params.push(parseInt(entity_id));
    }

    if (start_date) {
      conditions.push(isSqlite() ? 'created_at >= ?' : `created_at >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(isSqlite() ? 'created_at <= ?' : `created_at <= $${paramIndex++}`);
      params.push(end_date + ' 23:59:59');
    }

    if (search) {
      conditions.push(isSqlite() ? 'description LIKE ?' : `description ILIKE $${paramIndex++}`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM activity_log ${whereClause}`;
    const countResult = await dbGet(countQuery, params);
    const total = countResult.total;

    // Get paginated results
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const dataQuery = isSqlite()
      ? `SELECT a.*, u.name as user_name, u.username
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?`
      : `SELECT a.*, u.name as user_name, u.username
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

    const dataParams = [...params, parseInt(limit), offset];
    const logs = await dbAll(dataQuery, dataParams);

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));

    res.json({
      success: true,
      data: parsedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit/stats
 * Get audit statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];
    let paramIndex = 1;

    if (start_date && end_date) {
      dateFilter = isSqlite()
        ? 'WHERE created_at BETWEEN ? AND ?'
        : `WHERE created_at BETWEEN $1 AND $2`;
      params.push(start_date, end_date + ' 23:59:59');
      paramIndex = 3;
    }

    // Total actions
    const totalQuery = `SELECT COUNT(*) as total FROM activity_log ${dateFilter}`;
    const totalResult = await dbGet(totalQuery, params);

    // By action type
    const byActionQuery = `
      SELECT action_type, COUNT(*) as count
      FROM activity_log ${dateFilter}
      GROUP BY action_type
      ORDER BY count DESC
    `;
    const byAction = await dbAll(byActionQuery, params);

    // By module
    const byModuleQuery = `
      SELECT module, COUNT(*) as count
      FROM activity_log ${dateFilter}
      GROUP BY module
      ORDER BY count DESC
    `;
    const byModule = await dbAll(byModuleQuery, params);

    // By user
    const byUserQuery = isSqlite()
      ? `SELECT u.name as user_name, u.username, COUNT(*) as count
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         ${dateFilter}
         GROUP BY a.user_id
         ORDER BY count DESC
         LIMIT 10`
      : `SELECT u.name as user_name, u.username, COUNT(*) as count
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         ${dateFilter}
         GROUP BY a.user_id, u.name, u.username
         ORDER BY count DESC
         LIMIT 10`;
    const byUser = await dbAll(byUserQuery, params);

    // Recent activity (last 24 hours)
    const recentQuery = isSqlite()
      ? `SELECT COUNT(*) as count
         FROM activity_log
         WHERE created_at >= datetime('now', '-24 hours')`
      : `SELECT COUNT(*) as count
         FROM activity_log
         WHERE created_at >= NOW() - INTERVAL '24 hours'`;
    const recentResult = await dbGet(recentQuery);

    // Actions per day (last 30 days)
    const dailyQuery = isSqlite()
      ? `SELECT date(created_at) as date, COUNT(*) as count
         FROM activity_log
         WHERE created_at >= date('now', '-30 days')
         GROUP BY date(created_at)
         ORDER BY date DESC`
      : `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM activity_log
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`;
    const dailyActivity = await dbAll(dailyQuery);

    res.json({
      success: true,
      stats: {
        total: totalResult.total,
        last24Hours: recentResult.count,
        byActionType: byAction,
        byModule: byModule,
        topUsers: byUser,
        dailyActivity
      },
      period: {
        start: start_date || 'all time',
        end: end_date || 'now'
      }
    });
  } catch (error) {
    logger.error('Failed to get audit stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit/:id
 * Get specific audit entry
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const query = isSqlite()
      ? `SELECT a.*, u.name as user_name, u.username
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.id = ?`
      : `SELECT a.*, u.name as user_name, u.username
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.id = $1`;

    const log = await dbGet(query, [parseInt(id)]);

    if (!log) {
      return res.status(404).json({ error: 'Audit entry not found' });
    }

    res.json({
      success: true,
      data: {
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
        old_value: log.old_value ? JSON.parse(log.old_value) : null,
        new_value: log.new_value ? JSON.parse(log.new_value) : null
      }
    });
  } catch (error) {
    logger.error('Failed to get audit entry:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit/entity/:type/:id
 * Get audit trail for specific entity
 */
router.get('/entity/:type/:entityId', requireAdmin, async (req, res) => {
  try {
    const { type, entityId } = req.params;

    const query = isSqlite()
      ? `SELECT a.*, u.name as user_name, u.username
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.entity_type = ? AND a.entity_id = ?
         ORDER BY a.created_at DESC`
      : `SELECT a.*, u.name as user_name, u.username
         FROM activity_log a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.entity_type = $1 AND a.entity_id = $2
         ORDER BY a.created_at DESC`;

    const logs = await dbAll(query, [type, parseInt(entityId)]);

    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));

    res.json({
      success: true,
      entityType: type,
      entityId: parseInt(entityId),
      trail: parsedLogs,
      total: parsedLogs.length
    });
  } catch (error) {
    logger.error('Failed to get entity audit trail:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit/export
 * Export audit logs as CSV
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, format = 'csv' } = req.query;

    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = isSqlite()
        ? 'WHERE a.created_at BETWEEN ? AND ?'
        : 'WHERE a.created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date + ' 23:59:59');
    }

    const query = `
      SELECT
        a.id,
        a.action_type,
        a.module,
        a.description,
        u.username as user,
        a.entity_type,
        a.entity_id,
        a.ip_address,
        a.created_at
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      ${dateFilter}
      ORDER BY a.created_at DESC
      LIMIT 10000
    `;

    const logs = await dbAll(query, params);

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Timestamp', 'Action', 'Module', 'Description', 'User', 'Entity Type', 'Entity ID', 'IP Address'];
      const rows = logs.map(log => [
        log.id,
        log.created_at,
        log.action_type,
        log.module,
        `"${(log.description || '').replace(/"/g, '""')}"`,
        log.user || 'System',
        log.entity_type || '',
        log.entity_id || '',
        log.ip_address || ''
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      // JSON format
      res.json({
        success: true,
        exported: logs.length,
        data: logs
      });
    }
  } catch (error) {
    logger.error('Failed to export audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit/action-types
 * Get list of all action types
 */
router.get('/action-types', requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT action_type, COUNT(*) as count
      FROM activity_log
      GROUP BY action_type
      ORDER BY action_type
    `;
    const types = await dbAll(query);

    res.json({
      success: true,
      actionTypes: types
    });
  } catch (error) {
    logger.error('Failed to get action types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit/modules
 * Get list of all modules
 */
router.get('/modules', requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT module, COUNT(*) as count
      FROM activity_log
      GROUP BY module
      ORDER BY module
    `;
    const modules = await dbAll(query);

    res.json({
      success: true,
      modules
    });
  } catch (error) {
    logger.error('Failed to get modules:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  router,
  initDb,
  migrateAuditTable,
  logAction
};
