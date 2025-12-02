/**
 * ============================================================
 * ALMANIK PMS - WhatsApp Automation Cron
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @dev DEV4-06
 *
 * Automatizacion de mensajes WhatsApp:
 * - Recordatorios de check-in (1 dia antes)
 * - Recordatorios de check-out (mismo dia por la manana)
 * - Solicitudes de review (post checkout)
 *
 * Cron Schedule:
 * - Cada hora verifica bookings que necesitan mensajes
 *
 * Run standalone: node server/cron/whatsapp-automation.js
 * Or import and start: require('./cron/whatsapp-automation').start()
 */

const cron = require('node-cron');
const DatabaseAdapter = require('../db-adapter');
const whatsapp = require('../config/whatsapp');
const logger = require('../config/logger');

class WhatsAppAutomationCron {
  constructor() {
    this.dbAdapter = null;
    this.isRunning = false;
    this.cronTask = null;
    // Run every hour at minute 30
    this.cronSchedule = '30 * * * *';
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    if (!this.dbAdapter) {
      this.dbAdapter = new DatabaseAdapter();
      await this.dbAdapter.connect();
      logger.info('WhatsApp Automation Cron: Database connected');
    }
  }

  /**
   * Start the cron job
   */
  start() {
    if (this.cronTask) {
      logger.warn('WhatsApp Automation Cron already running');
      return;
    }

    if (!whatsapp.isEnabled()) {
      logger.warn('WhatsApp Automation Cron: WhatsApp not configured, skipping');
      return;
    }

    this.cronTask = cron.schedule(this.cronSchedule, async () => {
      await this.runAutomation();
    });

    logger.info('WhatsApp Automation Cron started', { schedule: this.cronSchedule });
    console.log('   ✅ WhatsApp Automation Cron started (every hour at :30)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info('WhatsApp Automation Cron stopped');
    }
  }

  /**
   * Run all automations
   */
  async runAutomation() {
    if (this.isRunning) {
      logger.debug('WhatsApp Automation already running, skipping');
      return;
    }

    this.isRunning = true;
    logger.info('WhatsApp Automation starting...');

    try {
      await this.initialize();

      // Run all automation tasks
      await this.sendCheckInReminders();
      await this.sendCheckOutReminders();
      await this.sendReviewRequests();

      logger.info('WhatsApp Automation completed');
    } catch (error) {
      logger.error('WhatsApp Automation error', { error: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send check-in reminders (1 day before)
   */
  async sendCheckInReminders() {
    try {
      // Get bookings with check-in tomorrow that haven't received reminder
      const bookings = await this.dbAdapter.query(`
        SELECT
          b.id as booking_id,
          b.check_in,
          b.check_out,
          b.confirmation_code,
          g.id as guest_id,
          g.name as guest_name,
          g.phone as guest_phone,
          g.whatsapp_opt_out
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        WHERE date(b.check_in) = date('now', '+1 day')
          AND b.status IN ('confirmed', 'pending')
          AND g.phone IS NOT NULL
          AND g.phone != ''
          AND (g.whatsapp_opt_out IS NULL OR g.whatsapp_opt_out = 0)
          AND b.id NOT IN (
            SELECT booking_id FROM whatsapp_automation_log
            WHERE trigger_type = 'checkin_reminder'
            AND booking_id = b.id
          )
      `);

      logger.info(`Check-in reminders: Found ${bookings.length} bookings`);

      for (const booking of bookings) {
        await this.sendAutomatedMessage(
          booking,
          'checkin_reminder',
          whatsapp.templates.checkInReminder(
            booking.guest_name,
            this.formatDate(booking.check_in)
          )
        );
      }
    } catch (error) {
      logger.error('Check-in reminders error', { error: error.message });
    }
  }

  /**
   * Send check-out reminders (same day morning)
   */
  async sendCheckOutReminders() {
    try {
      const currentHour = new Date().getHours();

      // Only send between 7-9 AM
      if (currentHour < 7 || currentHour > 9) {
        return;
      }

      // Get bookings with check-out today
      const bookings = await this.dbAdapter.query(`
        SELECT
          b.id as booking_id,
          b.check_in,
          b.check_out,
          g.id as guest_id,
          g.name as guest_name,
          g.phone as guest_phone,
          g.whatsapp_opt_out
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        WHERE date(b.check_out) = date('now')
          AND b.status = 'checked_in'
          AND g.phone IS NOT NULL
          AND g.phone != ''
          AND (g.whatsapp_opt_out IS NULL OR g.whatsapp_opt_out = 0)
          AND b.id NOT IN (
            SELECT booking_id FROM whatsapp_automation_log
            WHERE trigger_type = 'checkout_reminder'
            AND booking_id = b.id
          )
      `);

      logger.info(`Check-out reminders: Found ${bookings.length} bookings`);

      for (const booking of bookings) {
        await this.sendAutomatedMessage(
          booking,
          'checkout_reminder',
          whatsapp.templates.checkOutReminder(
            booking.guest_name,
            this.formatDate(booking.check_out)
          )
        );
      }
    } catch (error) {
      logger.error('Check-out reminders error', { error: error.message });
    }
  }

  /**
   * Send review requests (after check-out)
   */
  async sendReviewRequests() {
    try {
      // Get bookings that checked out yesterday
      const bookings = await this.dbAdapter.query(`
        SELECT
          b.id as booking_id,
          b.check_out,
          g.id as guest_id,
          g.name as guest_name,
          g.phone as guest_phone,
          g.whatsapp_opt_out
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        WHERE date(b.check_out) = date('now', '-1 day')
          AND b.status = 'checked_out'
          AND g.phone IS NOT NULL
          AND g.phone != ''
          AND (g.whatsapp_opt_out IS NULL OR g.whatsapp_opt_out = 0)
          AND b.id NOT IN (
            SELECT booking_id FROM whatsapp_automation_log
            WHERE trigger_type = 'review_request'
            AND booking_id = b.id
          )
      `);

      logger.info(`Review requests: Found ${bookings.length} bookings`);

      for (const booking of bookings) {
        // Generate review link (using the review token endpoint)
        const reviewLink = await this.getReviewLink(booking.booking_id);

        await this.sendAutomatedMessage(
          booking,
          'review_request',
          whatsapp.templates.reviewRequest(
            booking.guest_name,
            reviewLink
          )
        );
      }
    } catch (error) {
      logger.error('Review requests error', { error: error.message });
    }
  }

  /**
   * Send booking confirmation (called from reservations module)
   */
  async sendBookingConfirmation(booking) {
    if (!whatsapp.isEnabled()) return;

    try {
      await this.initialize();

      // Check opt-out
      const guest = await this.dbAdapter.get(
        'SELECT whatsapp_opt_out FROM guests WHERE id = ?',
        [booking.guest_id]
      );

      if (guest?.whatsapp_opt_out) {
        logger.info('Skipping booking confirmation - guest opted out', {
          guestId: booking.guest_id
        });
        return;
      }

      await this.sendAutomatedMessage(
        {
          booking_id: booking.id,
          guest_id: booking.guest_id,
          guest_name: booking.guest_name,
          guest_phone: booking.guest_phone
        },
        'booking_confirmation',
        whatsapp.templates.bookingConfirmation(
          booking.guest_name,
          this.formatDate(booking.check_in),
          this.formatDate(booking.check_out),
          booking.confirmation_code
        )
      );
    } catch (error) {
      logger.error('Booking confirmation error', { error: error.message });
    }
  }

  /**
   * Send payment confirmation (called from payments module)
   */
  async sendPaymentConfirmation(payment) {
    if (!whatsapp.isEnabled()) return;

    try {
      await this.initialize();

      // Get guest info
      const booking = await this.dbAdapter.get(`
        SELECT b.id, b.guest_id, g.name, g.phone, g.whatsapp_opt_out
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        WHERE b.id = ?
      `, [payment.booking_id]);

      if (!booking || !booking.phone || booking.whatsapp_opt_out) {
        return;
      }

      await this.sendAutomatedMessage(
        {
          booking_id: booking.id,
          guest_id: booking.guest_id,
          guest_name: booking.name,
          guest_phone: booking.phone
        },
        'payment_confirmation',
        whatsapp.templates.paymentConfirmation(
          booking.name,
          payment.amount,
          payment.method || 'Tarjeta'
        )
      );
    } catch (error) {
      logger.error('Payment confirmation error', { error: error.message });
    }
  }

  /**
   * Send automated message and log it
   */
  async sendAutomatedMessage(booking, triggerType, message) {
    if (!booking.guest_phone) {
      logger.warn('No phone number for automated message', {
        bookingId: booking.booking_id,
        trigger: triggerType
      });
      return;
    }

    try {
      // Send via WhatsApp
      const result = await whatsapp.sendMessage(booking.guest_phone, message);

      // Log the message
      const messageLog = await this.dbAdapter.run(`
        INSERT INTO whatsapp_messages
        (number, message_type, content, direction, message_id, status, template_name, booking_id, guest_id, created_at)
        VALUES (?, 'text', ?, 'outgoing', ?, 'sent', ?, ?, ?, datetime('now'))
      `, [
        booking.guest_phone,
        message,
        result.key?.id || null,
        triggerType,
        booking.booking_id,
        booking.guest_id
      ]);

      // Log the automation
      await this.dbAdapter.run(`
        INSERT INTO whatsapp_automation_log
        (trigger_type, booking_id, guest_id, message_id, status, sent_at, created_at)
        VALUES (?, ?, ?, ?, 'sent', datetime('now'), datetime('now'))
      `, [
        triggerType,
        booking.booking_id,
        booking.guest_id,
        messageLog.lastID
      ]);

      logger.info('Automated message sent', {
        trigger: triggerType,
        bookingId: booking.booking_id,
        to: booking.guest_phone
      });
    } catch (error) {
      // Log failed attempt
      await this.dbAdapter.run(`
        INSERT INTO whatsapp_automation_log
        (trigger_type, booking_id, guest_id, status, error_message, created_at)
        VALUES (?, ?, ?, 'failed', ?, datetime('now'))
      `, [
        triggerType,
        booking.booking_id,
        booking.guest_id,
        error.message
      ]);

      logger.error('Automated message failed', {
        trigger: triggerType,
        bookingId: booking.booking_id,
        error: error.message
      });
    }
  }

  /**
   * Get or create review link for booking
   */
  async getReviewLink(bookingId) {
    try {
      // Check if token exists
      let review = await this.dbAdapter.get(
        'SELECT token FROM reviews WHERE booking_id = ?',
        [bookingId]
      );

      if (review?.token) {
        return `${process.env.APP_URL || 'https://almanik-pms.vercel.app'}/review.html?token=${review.token}`;
      }

      // Create new review token
      const token = this.generateToken();
      await this.dbAdapter.run(`
        INSERT INTO reviews (booking_id, token, status, created_at)
        VALUES (?, ?, 'pending', datetime('now'))
      `, [bookingId, token]);

      return `${process.env.APP_URL || 'https://almanik-pms.vercel.app'}/review.html?token=${token}`;
    } catch (error) {
      logger.error('Failed to get review link', { error: error.message });
      return 'https://almanik-pms.vercel.app/review.html';
    }
  }

  /**
   * Generate random token
   */
  generateToken() {
    return 'rev_' + Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Format date for display
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Singleton instance
const whatsappAutomation = new WhatsAppAutomationCron();

// Export for use in other modules
module.exports = {
  start: () => whatsappAutomation.start(),
  stop: () => whatsappAutomation.stop(),
  runNow: () => whatsappAutomation.runAutomation(),
  sendBookingConfirmation: (booking) => whatsappAutomation.sendBookingConfirmation(booking),
  sendPaymentConfirmation: (payment) => whatsappAutomation.sendPaymentConfirmation(payment)
};

// Run standalone if called directly
if (require.main === module) {
  console.log('🔄 Running WhatsApp Automation manually...\n');
  whatsappAutomation.runAutomation().then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}
