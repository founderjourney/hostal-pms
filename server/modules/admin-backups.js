/**
 * Admin Backups Module
 * DEV3-03: Backup management endpoints
 *
 * Endpoints:
 * - GET  /api/admin/backups          - List available backups
 * - POST /api/admin/backups/run      - Run backup now
 * - POST /api/admin/backups/restore  - Restore from backup
 * - GET  /api/admin/backups/status   - Get backup system status
 * - DELETE /api/admin/backups/:name  - Delete a backup
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const logger = require('../config/logger');
const { runBackup } = require('../jobs/backup');
const { restore, listLocalBackups, listS3Backups, verifyBackup } = require('../jobs/restore');
const aws = require('../config/aws');

const BACKUP_DIR = path.join(__dirname, '../../backups');

/**
 * Middleware: Require admin role
 */
function requireAdmin(req, res, next) {
  // Check session for admin role
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Format bytes for display
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * GET /api/admin/backups
 * List all available backups (local and S3)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const localBackups = listLocalBackups().map(b => ({
      ...b,
      source: 'local',
      sizeFormatted: formatBytes(b.size)
    }));

    const s3Backups = (await listS3Backups()).map(b => ({
      ...b,
      source: 's3',
      sizeFormatted: formatBytes(b.size)
    }));

    const allBackups = [...localBackups, ...s3Backups]
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({
      success: true,
      backups: allBackups,
      total: allBackups.length,
      s3Configured: aws.isConfigured()
    });
  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * GET /api/admin/backups/status
 * Get backup system status
 */
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const localBackups = listLocalBackups();
    const latestLocal = localBackups[0] || null;

    let latestS3 = null;
    if (aws.isConfigured()) {
      const s3Backups = await listS3Backups();
      latestS3 = s3Backups[0] || null;
    }

    // Calculate backup stats
    const totalLocalSize = localBackups.reduce((sum, b) => sum + b.size, 0);

    res.json({
      success: true,
      status: {
        s3Configured: aws.isConfigured(),
        localBackupDir: BACKUP_DIR,
        localBackupCount: localBackups.length,
        localBackupSize: formatBytes(totalLocalSize),
        latestLocal: latestLocal ? {
          name: latestLocal.name,
          created: latestLocal.created,
          size: formatBytes(latestLocal.size)
        } : null,
        latestS3: latestS3 ? {
          key: latestS3.key,
          created: latestS3.created,
          size: formatBytes(latestS3.size)
        } : null,
        environment: process.env.NODE_ENV || 'development',
        schedulerEnabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true'
      }
    });
  } catch (error) {
    logger.error('Failed to get backup status:', error);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

/**
 * POST /api/admin/backups/run
 * Run a backup now
 */
router.post('/run', requireAdmin, async (req, res) => {
  try {
    logger.info(`Manual backup triggered by user: ${req.session.user.username}`);

    const result = await runBackup();

    // Log activity
    const db = req.app.get('db');
    if (db) {
      await db.run(`
        INSERT INTO activity_log (action_type, module, description, user_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `, ['backup', 'admin', 'Manual backup executed', req.session.user.id, JSON.stringify(result)]);
    }

    res.json({
      success: true,
      message: 'Backup completed successfully',
      backup: {
        path: result.backup.localPath,
        size: formatBytes(result.backup.size),
        s3: result.s3Result ? {
          key: result.s3Result.key,
          bucket: result.s3Result.bucket
        } : null
      }
    });
  } catch (error) {
    logger.error('Manual backup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Backup failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/backups/restore
 * Restore from a backup
 *
 * Body:
 * - source: 'local' | 's3'
 * - name: backup filename or S3 key
 * - skipSafety: boolean (optional)
 */
router.post('/restore', requireAdmin, async (req, res) => {
  const { source, name, skipSafety = false } = req.body;

  if (!source || !name) {
    return res.status(400).json({ error: 'source and name are required' });
  }

  try {
    logger.warn(`Database restore triggered by user: ${req.session.user.username}`);
    logger.warn(`Restore source: ${source}, name: ${name}`);

    let result;

    if (source === 'local') {
      const backupPath = path.join(BACKUP_DIR, name);
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: 'Backup file not found' });
      }
      result = await restore({ file: backupPath, skipSafety });
    } else if (source === 's3') {
      if (!aws.isConfigured()) {
        return res.status(400).json({ error: 'S3 is not configured' });
      }
      result = await restore({ fromS3: name, skipSafety });
    } else {
      return res.status(400).json({ error: 'Invalid source. Use "local" or "s3"' });
    }

    // Log activity
    const db = req.app.get('db');
    if (db) {
      await db.run(`
        INSERT INTO activity_log (action_type, module, description, user_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `, ['restore', 'admin', `Database restored from ${source}: ${name}`, req.session.user.id, JSON.stringify(result)]);
    }

    res.json({
      success: true,
      message: 'Database restored successfully',
      result
    });
  } catch (error) {
    logger.error('Restore failed:', error);
    res.status(500).json({
      success: false,
      error: 'Restore failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/backups/:name
 * Delete a local backup
 */
router.delete('/:name', requireAdmin, async (req, res) => {
  const { name } = req.params;
  const { source = 'local' } = req.query;

  try {
    if (source === 'local') {
      const backupPath = path.join(BACKUP_DIR, name);

      // Security: ensure path is within backup directory
      if (!backupPath.startsWith(BACKUP_DIR)) {
        return res.status(400).json({ error: 'Invalid backup name' });
      }

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: 'Backup not found' });
      }

      fs.unlinkSync(backupPath);
      logger.info(`Backup deleted by ${req.session.user.username}: ${name}`);

      res.json({ success: true, message: 'Backup deleted' });
    } else if (source === 's3') {
      if (!aws.isConfigured()) {
        return res.status(400).json({ error: 'S3 is not configured' });
      }

      await aws.deleteObject(name);
      logger.info(`S3 backup deleted by ${req.session.user.username}: ${name}`);

      res.json({ success: true, message: 'S3 backup deleted' });
    } else {
      res.status(400).json({ error: 'Invalid source' });
    }
  } catch (error) {
    logger.error('Failed to delete backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

/**
 * POST /api/admin/backups/verify/:name
 * Verify a backup's integrity
 */
router.post('/verify/:name', requireAdmin, async (req, res) => {
  const { name } = req.params;

  try {
    const backupPath = path.join(BACKUP_DIR, name);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Decompress temporarily for verification
    const zlib = require('zlib');
    const compressed = fs.readFileSync(backupPath);
    const decompressed = zlib.gunzipSync(compressed);

    // Write to temp file
    const tempPath = backupPath.replace('.gz', '.tmp');
    fs.writeFileSync(tempPath, decompressed);

    const type = name.includes('sqlite') ? 'sqlite' : 'postgres';
    const isValid = await verifyBackup(tempPath, type);

    // Cleanup temp file
    fs.unlinkSync(tempPath);

    res.json({
      success: true,
      name,
      type,
      valid: isValid,
      size: formatBytes(fs.statSync(backupPath).size)
    });
  } catch (error) {
    logger.error('Backup verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/backups/retention
 * Run retention policy cleanup
 */
router.post('/retention', requireAdmin, async (req, res) => {
  try {
    logger.info(`Retention cleanup triggered by user: ${req.session.user.username}`);

    const { runRetentionCleanup, RETENTION_POLICY } = require('../jobs/backup');
    const result = await runRetentionCleanup();

    // Log activity
    const db = req.app.get('db');
    if (db) {
      await db.run(`
        INSERT INTO activity_log (action_type, module, description, user_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `, ['retention_cleanup', 'admin', 'Retention policy executed', req.session.user.id, JSON.stringify(result)]);
    }

    res.json({
      success: true,
      message: 'Retention policy executed successfully',
      policy: RETENTION_POLICY,
      result
    });
  } catch (error) {
    logger.error('Retention cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Retention cleanup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/backups/retention/preview
 * Preview what would be deleted by retention policy
 */
router.get('/retention/preview', requireAdmin, async (req, res) => {
  try {
    const { applyRetentionPolicy, RETENTION_POLICY } = require('../jobs/backup');
    const { listLocalBackups, listS3Backups } = require('../jobs/restore');

    // Get local backups
    const localBackups = listLocalBackups().map(b => ({
      ...b,
      source: 'local',
      date: new Date(b.created)
    }));

    // Get S3 backups
    const s3Backups = (await listS3Backups()).map(b => ({
      ...b,
      source: 's3',
      date: new Date(b.created)
    }));

    // Apply retention policy (dry run)
    const localPolicy = applyRetentionPolicy(localBackups);
    const s3Policy = applyRetentionPolicy(s3Backups);

    res.json({
      success: true,
      policy: RETENTION_POLICY,
      preview: {
        local: {
          keep: localPolicy.keep.length,
          delete: localPolicy.delete.length,
          keepList: localPolicy.keep.map(b => ({ name: b.name, reason: b.reason })),
          deleteList: localPolicy.delete.map(b => b.name)
        },
        s3: {
          keep: s3Policy.keep.length,
          delete: s3Policy.delete.length,
          keepList: s3Policy.keep.map(b => ({ name: b.name, reason: b.reason })),
          deleteList: s3Policy.delete.map(b => b.name)
        }
      }
    });
  } catch (error) {
    logger.error('Retention preview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Preview failed',
      message: error.message
    });
  }
});

module.exports = router;
