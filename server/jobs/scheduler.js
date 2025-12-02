/**
 * Job Scheduler
 * DEV3-02: Cron jobs for automated tasks
 *
 * Scheduled tasks:
 * - Database backup: Daily at 3:00 AM
 * - Cleanup old logs: Weekly on Sunday at 4:00 AM
 *
 * Usage:
 *   // Start scheduler (typically in server startup)
 *   const scheduler = require('./jobs/scheduler');
 *   scheduler.start();
 *
 *   // Stop scheduler (for graceful shutdown)
 *   scheduler.stop();
 */

const cron = require('node-cron');
const logger = require('../config/logger');
const { runBackup } = require('./backup');

// Store scheduled jobs
const jobs = {};

/**
 * Daily backup job at 3:00 AM
 * Cron: minute hour day month weekday
 * '0 3 * * *' = At 03:00 every day
 */
function scheduleBackupJob() {
  const schedule = process.env.BACKUP_SCHEDULE || '0 3 * * *';

  if (!cron.validate(schedule)) {
    logger.error(`Invalid backup schedule: ${schedule}`);
    return null;
  }

  const job = cron.schedule(schedule, async () => {
    logger.info('Starting scheduled backup...');
    try {
      await runBackup();
      logger.info('Scheduled backup completed successfully');
    } catch (error) {
      logger.error('Scheduled backup failed:', error.message);
      // TODO: Send alert notification (DEV1-05/06 SendGrid integration)
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/Bogota'
  });

  logger.info(`Backup job scheduled: ${schedule} (${process.env.TZ || 'America/Bogota'})`);
  return job;
}

/**
 * Start all scheduled jobs
 */
function start() {
  logger.info('Starting job scheduler...');

  // Only run scheduler in production or if explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_SCHEDULER) {
    logger.info('Job scheduler disabled in development. Set ENABLE_SCHEDULER=true to enable.');
    return;
  }

  jobs.backup = scheduleBackupJob();

  logger.info('Job scheduler started');
}

/**
 * Stop all scheduled jobs
 */
function stop() {
  logger.info('Stopping job scheduler...');

  for (const [name, job] of Object.entries(jobs)) {
    if (job) {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    }
  }

  logger.info('Job scheduler stopped');
}

/**
 * Run a specific job manually
 */
async function runJob(jobName) {
  switch (jobName) {
    case 'backup':
      return await runBackup();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
}

/**
 * Get status of all jobs
 */
function getStatus() {
  const status = {};
  for (const [name, job] of Object.entries(jobs)) {
    status[name] = {
      scheduled: !!job,
      running: job ? job.running : false
    };
  }
  return status;
}

module.exports = {
  start,
  stop,
  runJob,
  getStatus
};
