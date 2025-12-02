#!/usr/bin/env node
/**
 * Database Restore Script
 * DEV3-03: Restore from backup
 *
 * Features:
 * - Restore from local backup or S3
 * - Supports SQLite and PostgreSQL
 * - Creates safety backup before restore
 * - Validates backup integrity
 *
 * Usage:
 *   node server/jobs/restore.js <backup-file>
 *   node server/jobs/restore.js --list              # List available backups
 *   node server/jobs/restore.js --latest            # Restore latest backup
 *   node server/jobs/restore.js --from-s3 <s3-key>  # Restore from S3
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const logger = require('../config/logger');
const aws = require('../config/aws');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const SQLITE_PATH = path.join(__dirname, '../almanik.db');

/**
 * List available local backups
 */
function listLocalBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.gz'))
    .map(f => {
      const filePath = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(filePath);
      return {
        name: f,
        path: filePath,
        size: stats.size,
        created: stats.mtime,
        type: f.includes('sqlite') ? 'sqlite' : 'postgres'
      };
    })
    .sort((a, b) => b.created - a.created);

  return files;
}

/**
 * List available S3 backups
 */
async function listS3Backups() {
  if (!aws.isConfigured()) {
    return [];
  }

  try {
    const objects = await aws.listObjects('backups/', 50);
    return objects.map(obj => ({
      name: obj.Key.split('/').pop(),
      key: obj.Key,
      size: obj.Size,
      created: obj.LastModified,
      type: obj.Key.includes('sqlite') ? 'sqlite' : 'postgres',
      source: 's3'
    })).sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (error) {
    logger.error('Failed to list S3 backups:', error.message);
    return [];
  }
}

/**
 * Get the latest backup (local or S3)
 */
async function getLatestBackup() {
  const localBackups = listLocalBackups();
  const s3Backups = await listS3Backups();

  const allBackups = [...localBackups, ...s3Backups]
    .sort((a, b) => new Date(b.created) - new Date(a.created));

  return allBackups[0] || null;
}

/**
 * Download backup from S3
 */
async function downloadFromS3(s3Key, localPath) {
  logger.info(`Downloading from S3: ${s3Key}`);
  const content = await aws.downloadFile(s3Key);
  fs.writeFileSync(localPath, content);
  logger.info(`Downloaded to: ${localPath}`);
  return localPath;
}

/**
 * Decompress gzip file
 */
function decompressBackup(gzipPath) {
  const outputPath = gzipPath.replace('.gz', '');
  const compressed = fs.readFileSync(gzipPath);
  const decompressed = zlib.gunzipSync(compressed);
  fs.writeFileSync(outputPath, decompressed);
  return outputPath;
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupPath, type) {
  logger.info('Verifying backup integrity...');

  if (type === 'sqlite') {
    // Check if it's a valid SQLite database
    const header = fs.readFileSync(backupPath, { encoding: null, flag: 'r' }).slice(0, 16);
    const sqliteHeader = 'SQLite format 3\0';

    if (header.toString('ascii', 0, 16) !== sqliteHeader) {
      throw new Error('Invalid SQLite backup file');
    }
    logger.info('SQLite backup verified');
    return true;
  } else {
    // For SQL dumps, check for valid SQL content
    const content = fs.readFileSync(backupPath, 'utf8');
    if (!content.includes('INSERT INTO') && !content.includes('CREATE TABLE')) {
      throw new Error('Invalid SQL backup file');
    }
    logger.info('PostgreSQL backup verified');
    return true;
  }
}

/**
 * Create safety backup before restore
 */
async function createSafetyBackup() {
  logger.info('Creating safety backup before restore...');
  const { runBackup } = require('./backup');

  try {
    const result = await runBackup();
    logger.info('Safety backup created');
    return result;
  } catch (error) {
    logger.warn('Could not create safety backup:', error.message);
    return null;
  }
}

/**
 * Restore SQLite database
 */
async function restoreSQLite(backupPath) {
  logger.info('Restoring SQLite database...');

  // Verify backup
  await verifyBackup(backupPath, 'sqlite');

  // Stop any connections (in a real app, you'd gracefully shutdown)

  // Replace database file
  if (fs.existsSync(SQLITE_PATH)) {
    const backupOld = `${SQLITE_PATH}.old.${Date.now()}`;
    fs.renameSync(SQLITE_PATH, backupOld);
    logger.info(`Old database backed up to: ${backupOld}`);
  }

  fs.copyFileSync(backupPath, SQLITE_PATH);
  logger.info(`Database restored from: ${backupPath}`);

  return { success: true, restored: SQLITE_PATH };
}

/**
 * Restore PostgreSQL database
 */
async function restorePostgreSQL(backupPath) {
  logger.info('Restoring PostgreSQL database...');

  // Verify backup
  await verifyBackup(backupPath, 'postgres');

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const content = fs.readFileSync(backupPath, 'utf8');
  const statements = content
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let executed = 0;
  let errors = 0;

  for (const statement of statements) {
    try {
      await pool.query(statement);
      executed++;
    } catch (error) {
      // Skip duplicate key errors during restore
      if (!error.message.includes('duplicate key')) {
        logger.warn(`Statement failed: ${error.message}`);
        errors++;
      }
    }
  }

  await pool.end();

  logger.info(`Restore complete: ${executed} statements executed, ${errors} errors`);
  return { success: true, executed, errors };
}

/**
 * Main restore function
 */
async function restore(options = {}) {
  const startTime = Date.now();
  logger.info('========================================');
  logger.info('  Almanik PMS - Database Restore');
  logger.info('========================================');

  try {
    let backupPath;
    let backupType;
    let needsDecompress = false;

    // Determine backup source
    if (options.fromS3) {
      // Download from S3
      const localPath = path.join(BACKUP_DIR, path.basename(options.fromS3));
      await downloadFromS3(options.fromS3, localPath);
      backupPath = localPath;
      needsDecompress = true;
      backupType = options.fromS3.includes('sqlite') ? 'sqlite' : 'postgres';
    } else if (options.latest) {
      // Get latest backup
      const latest = await getLatestBackup();
      if (!latest) {
        throw new Error('No backups available');
      }

      if (latest.source === 's3') {
        const localPath = path.join(BACKUP_DIR, latest.name);
        await downloadFromS3(latest.key, localPath);
        backupPath = localPath;
      } else {
        backupPath = latest.path;
      }
      needsDecompress = true;
      backupType = latest.type;
    } else if (options.file) {
      backupPath = options.file;
      needsDecompress = backupPath.endsWith('.gz');
      backupType = backupPath.includes('sqlite') ? 'sqlite' : 'postgres';
    } else {
      throw new Error('No backup source specified');
    }

    // Create safety backup first
    if (!options.skipSafety) {
      await createSafetyBackup();
    }

    // Decompress if needed
    if (needsDecompress) {
      logger.info('Decompressing backup...');
      backupPath = decompressBackup(backupPath);
    }

    // Perform restore based on type
    let result;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && backupType === 'postgres') {
      result = await restorePostgreSQL(backupPath);
    } else if (!isProduction && backupType === 'sqlite') {
      result = await restoreSQLite(backupPath);
    } else {
      throw new Error(`Backup type (${backupType}) doesn't match environment (${isProduction ? 'production' : 'development'})`);
    }

    // Cleanup decompressed file
    if (needsDecompress && fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('========================================');
    logger.info('  Restore Complete!');
    logger.info(`  Duration: ${duration}s`);
    logger.info('========================================');

    return { success: true, ...result, duration };
  } catch (error) {
    logger.error('Restore failed:', error.message);
    throw error;
  }
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
 * Format date for display
 */
function formatDate(date) {
  return new Date(date).toISOString().replace('T', ' ').slice(0, 19);
}

// Export for use as module
module.exports = {
  restore,
  listLocalBackups,
  listS3Backups,
  getLatestBackup,
  verifyBackup
};

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    // List backups
    console.log('\n=== Local Backups ===');
    const local = listLocalBackups();
    if (local.length === 0) {
      console.log('  No local backups found');
    } else {
      local.forEach(b => {
        console.log(`  ${b.name}`);
        console.log(`    Size: ${formatBytes(b.size)}, Created: ${formatDate(b.created)}`);
      });
    }

    listS3Backups().then(s3 => {
      console.log('\n=== S3 Backups ===');
      if (s3.length === 0) {
        console.log('  No S3 backups found (or S3 not configured)');
      } else {
        s3.forEach(b => {
          console.log(`  ${b.key}`);
          console.log(`    Size: ${formatBytes(b.size)}, Created: ${formatDate(b.created)}`);
        });
      }
      console.log('');
    });
  } else if (args.includes('--latest')) {
    restore({ latest: true })
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Restore failed:', err.message);
        process.exit(1);
      });
  } else if (args.includes('--from-s3')) {
    const idx = args.indexOf('--from-s3');
    const s3Key = args[idx + 1];
    if (!s3Key) {
      console.error('Error: S3 key required after --from-s3');
      process.exit(1);
    }
    restore({ fromS3: s3Key })
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Restore failed:', err.message);
        process.exit(1);
      });
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    restore({ file: args[0] })
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Restore failed:', err.message);
        process.exit(1);
      });
  } else {
    console.log(`
Database Restore Script

Usage:
  node restore.js <backup-file>        Restore from local file
  node restore.js --list               List available backups
  node restore.js --latest             Restore from latest backup
  node restore.js --from-s3 <s3-key>   Restore from S3

Options:
  --skip-safety    Skip creating safety backup before restore
`);
  }
}
