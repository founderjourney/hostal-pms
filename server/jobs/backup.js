#!/usr/bin/env node
/**
 * Database Backup Script
 * DEV3-02: Automated backup system
 *
 * Features:
 * - Supports SQLite (development) and PostgreSQL (production)
 * - Compresses backups with gzip
 * - Uploads to S3 with timestamp
 * - Cleans up local backups older than 7 days
 * - Can run manually or via cron
 *
 * Usage:
 *   node server/jobs/backup.js           # Run backup now
 *   node server/jobs/backup.js --dry-run # Test without uploading
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const zlib = require('zlib');
const execAsync = promisify(exec);

const logger = require('../config/logger');
const aws = require('../config/aws');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../../backups');
const SQLITE_PATH = path.join(__dirname, '../almanik.db');
const RETENTION_DAYS = 7;
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(prefix = 'almanik') {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `${prefix}-backup-${timestamp}`;
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info(`Created backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Backup SQLite database
 */
async function backupSQLite() {
  logger.info('Starting SQLite backup...');

  if (!fs.existsSync(SQLITE_PATH)) {
    throw new Error(`SQLite database not found: ${SQLITE_PATH}`);
  }

  const filename = generateBackupFilename('sqlite');
  const backupPath = path.join(BACKUP_DIR, `${filename}.db`);
  const gzipPath = `${backupPath}.gz`;

  // Copy database file using Node.js (safe for SQLite when no writes are occurring)
  // For production use, consider using sqlite3 CLI or better-sqlite3 backup API
  fs.copyFileSync(SQLITE_PATH, backupPath);
  logger.info(`SQLite backup created: ${backupPath}`);

  // Compress with gzip
  const fileContent = fs.readFileSync(backupPath);
  const compressed = zlib.gzipSync(fileContent);
  fs.writeFileSync(gzipPath, compressed);

  // Remove uncompressed backup
  fs.unlinkSync(backupPath);

  const stats = fs.statSync(gzipPath);
  logger.info(`Backup compressed: ${gzipPath} (${formatBytes(stats.size)})`);

  return {
    localPath: gzipPath,
    s3Key: `backups/sqlite/${filename}.db.gz`,
    size: stats.size
  };
}

/**
 * Backup PostgreSQL database
 */
async function backupPostgreSQL() {
  logger.info('Starting PostgreSQL backup...');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const filename = generateBackupFilename('postgres');
  const backupPath = path.join(BACKUP_DIR, `${filename}.sql`);
  const gzipPath = `${backupPath}.gz`;

  // Parse connection string for pg_dump
  // Format: postgresql://user:password@host:port/database
  const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/([^?]+)/);
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const [, user, password, host, port = '5432', database] = urlMatch;

  // Set password environment variable for pg_dump
  process.env.PGPASSWORD = password;

  try {
    // Run pg_dump
    await execAsync(
      `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${backupPath}"`,
      { env: { ...process.env, PGPASSWORD: password } }
    );
    logger.info(`PostgreSQL backup created: ${backupPath}`);
  } catch (error) {
    // If pg_dump is not available, use alternative method
    if (error.message.includes('not found') || error.message.includes('command not found')) {
      logger.warn('pg_dump not available, using SQL export method');
      await backupPostgreSQLAlternative(backupPath);
    } else {
      throw error;
    }
  }

  // Compress with gzip
  const fileContent = fs.readFileSync(backupPath);
  const compressed = zlib.gzipSync(fileContent);
  fs.writeFileSync(gzipPath, compressed);

  // Remove uncompressed backup
  fs.unlinkSync(backupPath);

  const stats = fs.statSync(gzipPath);
  logger.info(`Backup compressed: ${gzipPath} (${formatBytes(stats.size)})`);

  return {
    localPath: gzipPath,
    s3Key: `backups/postgres/${filename}.sql.gz`,
    size: stats.size
  };
}

/**
 * Alternative PostgreSQL backup (when pg_dump not available)
 * Uses raw SQL export
 */
async function backupPostgreSQLAlternative(outputPath) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const tables = ['guests', 'beds', 'bookings', 'transactions', 'tours',
    'tour_clicks', 'tour_commissions', 'activity_log', 'users'];

  let sql = `-- Almanik PMS Database Backup\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;

  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      if (result.rows.length > 0) {
        sql += `-- Table: ${table}\n`;
        for (const row of result.rows) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row)
            .map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
            .join(', ');
          sql += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
        }
        sql += '\n';
      }
    } catch (error) {
      logger.warn(`Could not backup table ${table}: ${error.message}`);
    }
  }

  await pool.end();
  fs.writeFileSync(outputPath, sql);
}

/**
 * Upload backup to S3
 */
async function uploadToS3(backup) {
  if (!aws.isConfigured()) {
    logger.warn('AWS S3 not configured, backup stored locally only');
    return null;
  }

  if (DRY_RUN) {
    logger.info(`[DRY RUN] Would upload to S3: ${backup.s3Key}`);
    return { key: backup.s3Key, dryRun: true };
  }

  logger.info(`Uploading to S3: ${backup.s3Key}`);
  const fileContent = fs.readFileSync(backup.localPath);
  await aws.uploadFile(fileContent, backup.s3Key, 'application/gzip');

  logger.info('Backup uploaded to S3 successfully');
  return { key: backup.s3Key, bucket: aws.BUCKET_NAME };
}

/**
 * Clean up old local backups (simple retention)
 */
function cleanupOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const cutoffTime = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(BACKUP_DIR);
  let deleted = 0;

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime.getTime() < cutoffTime) {
      if (!DRY_RUN) {
        fs.unlinkSync(filePath);
      }
      logger.info(`${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} old backup: ${file}`);
      deleted++;
    }
  }

  if (deleted > 0) {
    logger.info(`Cleaned up ${deleted} old backup(s)`);
  }
}

/**
 * Retention Policy Configuration
 * - Daily backups: keep last 7 days
 * - Weekly backups: keep last 4 weeks (Sundays)
 * - Monthly backups: keep last 12 months (1st of month)
 */
const RETENTION_POLICY = {
  daily: 7,      // Keep daily backups for 7 days
  weekly: 4,     // Keep weekly backups for 4 weeks
  monthly: 12    // Keep monthly backups for 12 months
};

/**
 * Parse backup date from filename
 * Format: prefix-backup-YYYY-MM-DD_HH-MM-SS.ext.gz
 */
function parseBackupDate(filename) {
  const match = filename.match(/backup-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, min, sec] = match;
  return new Date(year, month - 1, day, hour, min, sec);
}

/**
 * Determine which backups to keep based on retention policy
 * @param {Array} backups - List of backup objects with name, date
 * @returns {Object} { keep: [], delete: [] }
 */
function applyRetentionPolicy(backups) {
  const now = new Date();
  const keep = new Set();
  const reasons = new Map();

  // Sort backups by date (newest first)
  const sorted = [...backups].sort((a, b) => b.date - a.date);

  // 1. Keep daily backups for the last N days
  const dailyCutoff = new Date(now);
  dailyCutoff.setDate(dailyCutoff.getDate() - RETENTION_POLICY.daily);

  for (const backup of sorted) {
    if (backup.date >= dailyCutoff) {
      keep.add(backup.name);
      reasons.set(backup.name, 'daily');
    }
  }

  // 2. Keep one backup per week for the last N weeks (prefer Sundays)
  for (let w = 0; w < RETENTION_POLICY.weekly; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (7 * (w + 1)));
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (7 * w));

    // Find backups in this week
    const weekBackups = sorted.filter(b =>
      b.date >= weekStart && b.date < weekEnd
    );

    if (weekBackups.length > 0) {
      // Prefer Sunday backup, otherwise take the newest
      const sunday = weekBackups.find(b => b.date.getDay() === 0);
      const toKeep = sunday || weekBackups[0];
      keep.add(toKeep.name);
      if (!reasons.has(toKeep.name)) {
        reasons.set(toKeep.name, 'weekly');
      }
    }
  }

  // 3. Keep one backup per month for the last N months (prefer 1st of month)
  for (let m = 0; m < RETENTION_POLICY.monthly; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    // Find backups in this month
    const monthBackups = sorted.filter(b =>
      b.date >= monthStart && b.date <= monthEnd
    );

    if (monthBackups.length > 0) {
      // Prefer 1st of month backup, otherwise take the oldest in month
      const firstOfMonth = monthBackups.find(b => b.date.getDate() === 1);
      const toKeep = firstOfMonth || monthBackups[monthBackups.length - 1];
      keep.add(toKeep.name);
      if (!reasons.has(toKeep.name)) {
        reasons.set(toKeep.name, 'monthly');
      }
    }
  }

  // Separate keep and delete lists
  const keepList = sorted.filter(b => keep.has(b.name));
  const deleteList = sorted.filter(b => !keep.has(b.name));

  return {
    keep: keepList.map(b => ({ ...b, reason: reasons.get(b.name) })),
    delete: deleteList
  };
}

/**
 * Apply retention policy to local backups
 */
async function applyLocalRetentionPolicy() {
  if (!fs.existsSync(BACKUP_DIR)) return { deleted: 0, kept: 0 };

  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.gz'));

  const backups = files.map(name => {
    const date = parseBackupDate(name);
    const filePath = path.join(BACKUP_DIR, name);
    const stats = fs.statSync(filePath);
    return {
      name,
      path: filePath,
      date: date || stats.mtime,
      size: stats.size
    };
  }).filter(b => b.date); // Only include backups with valid dates

  const { keep, delete: toDelete } = applyRetentionPolicy(backups);

  let deleted = 0;
  for (const backup of toDelete) {
    if (!DRY_RUN) {
      fs.unlinkSync(backup.path);
      deleted++;
      logger.info(`Retention policy: deleted ${backup.name}`);
    } else {
      logger.info(`[DRY RUN] Would delete ${backup.name}`);
    }
  }

  logger.info(`Retention policy applied: ${keep.length} kept, ${deleted} deleted`);
  return { deleted, kept: keep.length, details: { keep, deleted: toDelete } };
}

/**
 * Apply retention policy to S3 backups
 */
async function applyS3RetentionPolicy() {
  if (!aws.isConfigured()) {
    return { deleted: 0, kept: 0, error: 'S3 not configured' };
  }

  try {
    const objects = await aws.listObjects('backups/', 1000);

    const backups = objects
      .filter(obj => obj.Key.endsWith('.gz'))
      .map(obj => {
        const name = obj.Key;
        const date = parseBackupDate(name) || obj.LastModified;
        return {
          name,
          key: obj.Key,
          date,
          size: obj.Size
        };
      });

    const { keep, delete: toDelete } = applyRetentionPolicy(backups);

    let deleted = 0;
    for (const backup of toDelete) {
      if (!DRY_RUN) {
        await aws.deleteObject(backup.key);
        deleted++;
        logger.info(`S3 retention policy: deleted ${backup.key}`);
      } else {
        logger.info(`[DRY RUN] Would delete from S3: ${backup.key}`);
      }
    }

    logger.info(`S3 retention policy applied: ${keep.length} kept, ${deleted} deleted`);
    return { deleted, kept: keep.length };
  } catch (error) {
    logger.error('S3 retention policy failed:', error.message);
    return { deleted: 0, kept: 0, error: error.message };
  }
}

/**
 * Run full retention policy cleanup
 */
async function runRetentionCleanup() {
  logger.info('========================================');
  logger.info('  Running Retention Policy Cleanup');
  logger.info('========================================');

  const localResult = await applyLocalRetentionPolicy();
  const s3Result = await applyS3RetentionPolicy();

  return {
    local: localResult,
    s3: s3Result,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Main backup function
 */
async function runBackup() {
  const startTime = Date.now();
  logger.info('========================================');
  logger.info('  Almanik PMS - Database Backup');
  logger.info('========================================');

  if (DRY_RUN) {
    logger.info('Running in DRY RUN mode (no actual changes)');
  }

  try {
    ensureBackupDir();

    // Determine database type
    const isProduction = process.env.NODE_ENV === 'production';
    let backup;

    if (isProduction) {
      backup = await backupPostgreSQL();
    } else {
      backup = await backupSQLite();
    }

    // Upload to S3
    const s3Result = await uploadToS3(backup);

    // Verify backup integrity (post-backup verification)
    let verificationResult = { verified: false, error: null };
    try {
      const { verifyBackup } = require('./restore');
      const type = isProduction ? 'postgres' : 'sqlite';

      // Decompress for verification
      const tempPath = backup.localPath.replace('.gz', '.verify');
      const compressed = fs.readFileSync(backup.localPath);
      const decompressed = zlib.gunzipSync(compressed);
      fs.writeFileSync(tempPath, decompressed);

      const isValid = await verifyBackup(tempPath, type);
      verificationResult.verified = isValid;

      // Cleanup temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      if (isValid) {
        logger.info('Backup verification: PASSED');
      } else {
        logger.warn('Backup verification: FAILED - backup may be corrupted');
        verificationResult.error = 'Verification failed';
      }
    } catch (verifyError) {
      logger.warn('Backup verification skipped:', verifyError.message);
      verificationResult.error = verifyError.message;
    }

    // Cleanup old backups
    cleanupOldBackups();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('========================================');
    logger.info('  Backup Complete!');
    logger.info(`  Duration: ${duration}s`);
    logger.info(`  Size: ${formatBytes(backup.size)}`);
    logger.info(`  Local: ${backup.localPath}`);
    logger.info(`  Verified: ${verificationResult.verified ? 'YES' : 'NO'}`);
    if (s3Result) {
      logger.info(`  S3: s3://${s3Result.bucket || 'N/A'}/${s3Result.key}`);
    }
    logger.info('========================================');

    return { success: true, backup, s3Result, verification: verificationResult };
  } catch (error) {
    logger.error('Backup failed:', error.message);
    // Alert: Log critical error for monitoring
    logger.error('ALERT: Database backup failure requires immediate attention');
    throw error;
  }
}

// Export for use as module
module.exports = {
  runBackup,
  runRetentionCleanup,
  applyLocalRetentionPolicy,
  applyS3RetentionPolicy,
  applyRetentionPolicy,
  RETENTION_POLICY
};

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--retention')) {
    // Run retention policy only
    runRetentionCleanup()
      .then(result => {
        console.log('Retention cleanup result:', JSON.stringify(result, null, 2));
        process.exit(0);
      })
      .catch(error => {
        console.error('Retention cleanup failed:', error.message);
        process.exit(1);
      });
  } else {
    // Run backup (default)
    runBackup()
      .then(result => {
        if (result.success) {
          process.exit(0);
        }
      })
      .catch(error => {
        console.error('Backup failed:', error.message);
        process.exit(1);
      });
  }
}
