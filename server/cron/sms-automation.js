/**
 * ============================================================
 * ALMANIK PMS - SMS Automation Cron Job
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-29
 * @author DEV1-08
 *
 * Automatic SMS reminders:
 * - Check-in reminders: 10:00 AM daily (for tomorrow's arrivals)
 * - Check-out reminders: 8:00 AM daily (for today's departures)
 *
 * Run standalone: node server/cron/sms-automation.js
 * Or import and start: require('./cron/sms-automation').startCronJob(app)
 */

const cron = require('node-cron');
const logger = require('../config/logger');

class SMSAutomationCron {
  constructor() {
    this.app = null;
    this.smsModule = null;
    this.isRunning = false;
    this.checkinCronTask = null;
    this.checkoutCronTask = null;

    // Cron schedules (use environment variables for customization)
    this.checkinReminderSchedule = process.env.SMS_CHECKIN_CRON || '0 10 * * *'; // 10:00 AM daily
    this.checkoutReminderSchedule = process.env.SMS_CHECKOUT_CRON || '0 8 * * *'; // 8:00 AM daily
  }

  /**
   * Initialize with Express app
   */
  async initialize(app) {
    this.app = app;

    try {
      this.smsModule = require('../modules/sms');

      if (!this.smsModule.isEnabled || !this.smsModule.isEnabled()) {
        logger.warn('SMS Automation Cron: Twilio not configured - automation disabled');
        return false;
      }

      logger.info('SMS Automation Cron: Initialized successfully');
      return true;
    } catch (error) {
      logger.error('SMS Automation Cron: Failed to initialize', { error: error.message });
      return false;
    }
  }

  /**
   * Process check-in reminders
   * Sends SMS to guests arriving tomorrow
   */
  async processCheckinReminders() {
    if (!this.smsModule || !this.app) {
      logger.warn('SMS Automation: Cannot process check-in reminders - not initialized');
      return { sent: 0, failed: 0, skipped: true };
    }

    logger.info('SMS Automation: Starting check-in reminders processing');

    try {
      const result = await this.smsModule.processCheckinReminders(this.app);
      logger.info('SMS Automation: Check-in reminders completed', result);
      return result;
    } catch (error) {
      logger.error('SMS Automation: Check-in reminders failed', { error: error.message });
      return { sent: 0, failed: 0, error: error.message };
    }
  }

  /**
   * Process checkout reminders
   * Sends SMS to guests checking out today
   */
  async processCheckoutReminders() {
    if (!this.smsModule || !this.app) {
      logger.warn('SMS Automation: Cannot process checkout reminders - not initialized');
      return { sent: 0, failed: 0, skipped: true };
    }

    logger.info('SMS Automation: Starting checkout reminders processing');

    try {
      const result = await this.smsModule.processCheckoutReminders(this.app);
      logger.info('SMS Automation: Checkout reminders completed', result);
      return result;
    } catch (error) {
      logger.error('SMS Automation: Checkout reminders failed', { error: error.message });
      return { sent: 0, failed: 0, error: error.message };
    }
  }

  /**
   * Start the cron jobs
   */
  startCronJobs() {
    if (this.isRunning) {
      logger.warn('SMS Automation Cron: Already running');
      return;
    }

    // Check-in reminders (10:00 AM daily)
    this.checkinCronTask = cron.schedule(this.checkinReminderSchedule, async () => {
      logger.info('SMS Automation Cron: Check-in reminder job triggered');
      await this.processCheckinReminders();
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'America/Bogota'
    });

    // Checkout reminders (8:00 AM daily)
    this.checkoutCronTask = cron.schedule(this.checkoutReminderSchedule, async () => {
      logger.info('SMS Automation Cron: Checkout reminder job triggered');
      await this.processCheckoutReminders();
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'America/Bogota'
    });

    this.isRunning = true;
    logger.info('SMS Automation Cron: Started', {
      checkin_schedule: this.checkinReminderSchedule,
      checkout_schedule: this.checkoutReminderSchedule,
      timezone: process.env.TIMEZONE || 'America/Bogota'
    });
  }

  /**
   * Stop the cron jobs
   */
  stopCronJobs() {
    if (this.checkinCronTask) {
      this.checkinCronTask.stop();
      this.checkinCronTask = null;
    }

    if (this.checkoutCronTask) {
      this.checkoutCronTask.stop();
      this.checkoutCronTask = null;
    }

    this.isRunning = false;
    logger.info('SMS Automation Cron: Stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      initialized: !!this.app,
      running: this.isRunning,
      sms_enabled: this.smsModule?.isEnabled ? this.smsModule.isEnabled() : false,
      schedules: {
        checkin_reminders: this.checkinReminderSchedule,
        checkout_reminders: this.checkoutReminderSchedule
      },
      timezone: process.env.TIMEZONE || 'America/Bogota'
    };
  }
}

// Singleton instance
const smsAutomationCron = new SMSAutomationCron();

/**
 * Start cron job with Express app
 */
async function startCronJob(app) {
  const initialized = await smsAutomationCron.initialize(app);

  if (initialized) {
    smsAutomationCron.startCronJobs();
    return true;
  }

  return false;
}

/**
 * Stop cron job
 */
function stopCronJob() {
  smsAutomationCron.stopCronJobs();
}

/**
 * Get cron status
 */
function getCronStatus() {
  return smsAutomationCron.getStatus();
}

/**
 * Run manually (for testing or one-time execution)
 */
async function runManually(app, type = 'all') {
  const initialized = await smsAutomationCron.initialize(app);

  if (!initialized) {
    return { error: 'Failed to initialize' };
  }

  const results = {};

  if (type === 'all' || type === 'checkin') {
    results.checkin = await smsAutomationCron.processCheckinReminders();
  }

  if (type === 'all' || type === 'checkout') {
    results.checkout = await smsAutomationCron.processCheckoutReminders();
  }

  return results;
}

// Allow running standalone
if (require.main === module) {
  console.log('========================================');
  console.log('SMS Automation Cron - Standalone Mode');
  console.log('========================================');
  console.log('');
  console.log('This cron job should be started via the main server.');
  console.log('It will automatically send SMS reminders:');
  console.log('');
  console.log('- Check-in reminders: 10:00 AM (for tomorrow\'s arrivals)');
  console.log('- Checkout reminders: 8:00 AM (for today\'s departures)');
  console.log('');
  console.log('To test manually, use:');
  console.log('  curl -X POST http://localhost:3000/api/sms/automation/process-checkin-reminders');
  console.log('  curl -X POST http://localhost:3000/api/sms/automation/process-checkout-reminders');
  console.log('');
  console.log('To check pending reminders:');
  console.log('  curl http://localhost:3000/api/sms/automation/pending-checkins');
  console.log('  curl http://localhost:3000/api/sms/automation/pending-checkouts');
  console.log('');
}

module.exports = {
  startCronJob,
  stopCronJob,
  getCronStatus,
  runManually,
  SMSAutomationCron
};
