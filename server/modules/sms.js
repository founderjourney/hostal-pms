/**
 * ============================================================
 * ALMANIK PMS - SMS Module (Twilio)
 * ============================================================
 * @version 1.1.0
 * @date 2025-11-29
 * @author DEV1
 *
 * Gestion de envio de SMS via Twilio.
 *
 * DEV1-07 Endpoints:
 * - GET    /status         - Check SMS service status
 * - POST   /send           - Send a single SMS
 * - POST   /send-bulk      - Send to multiple recipients
 * - POST   /test           - Send test SMS
 * - GET    /history        - Get message history
 * - GET    /balance        - Get account balance
 * - GET    /templates      - List SMS templates
 * - POST   /send-template  - Send using template
 * - POST   /preview-template - Preview template
 *
 * DEV1-08 Automation Endpoints:
 * - POST   /automation/process-checkin-reminders  - Send tomorrow's check-in reminders
 * - POST   /automation/process-checkout-reminders - Send today's checkout reminders
 * - GET    /automation/pending-checkins           - Get pending check-in reminders
 * - GET    /automation/pending-checkouts          - Get pending checkout reminders
 * - GET    /automation/status                     - Check automation status
 *
 * Helper Functions (for other modules):
 * - sendBookingConfirmationSMS(app, booking, guest)
 * - sendCheckinReminderSMS(app, booking, guest)
 * - sendCheckoutReminderSMS(app, booking, guest)
 * - sendWifiCredentialsSMS(app, booking, guest)
 * - sendPaymentConfirmationSMS(app, booking, guest, payment)
 * - processCheckinReminders(app) - for cron job
 * - processCheckoutReminders(app) - for cron job
 */

const express = require('express');
const router = express.Router();
const twilio = require('../config/twilio');
const logger = require('../config/logger');

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Check if Twilio is properly configured
 */
const requireTwilio = (req, res, next) => {
  if (!twilio || !twilio.isEnabled()) {
    logger.warn('SMS send attempted but Twilio not configured');
    return res.status(503).json({
      error: 'SMS service not available',
      message: 'Twilio is not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment.'
    });
  }
  next();
};

/**
 * Log SMS activity to database
 */
const logSMSActivity = async (req, action, details) => {
  try {
    const db = req.app.locals.db;
    if (!db) return;

    await db.run(
      `INSERT INTO activity_log (action_type, module, description, user_id, entity_id, entity_type, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action,
        'sms',
        details.description || action,
        req.session?.id || null,
        details.reservation_id || details.guest_id || null,
        'sms',
        JSON.stringify(details),
        req.ip
      ]
    );
  } catch (error) {
    logger.error('Failed to log SMS activity', { error: error.message });
  }
};

/**
 * Store SMS record in database
 */
const storeSMSRecord = async (req, smsData) => {
  try {
    const db = req.app.locals.db;
    if (!db) return null;

    // Create sms_messages table if not exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_phone TEXT NOT NULL,
        from_phone TEXT,
        body TEXT,
        template_id TEXT,
        status TEXT DEFAULT 'sent',
        twilio_sid TEXT,
        reservation_id INTEGER,
        guest_id INTEGER,
        sms_type TEXT DEFAULT 'transactional',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reservation_id) REFERENCES bookings(id),
        FOREIGN KEY (guest_id) REFERENCES guests(id)
      )
    `);

    const result = await db.run(
      `INSERT INTO sms_messages (to_phone, from_phone, body, template_id, status, twilio_sid, reservation_id, guest_id, sms_type, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        smsData.to,
        smsData.from || twilio.getPhoneNumber(),
        smsData.body,
        smsData.templateId || null,
        smsData.status || 'sent',
        smsData.sid || null,
        smsData.reservation_id || null,
        smsData.guest_id || null,
        smsData.type || 'transactional',
        JSON.stringify(smsData.metadata || {})
      ]
    );

    return result.lastID;
  } catch (error) {
    logger.error('Failed to store SMS record', { error: error.message });
    return null;
  }
};

// ============================================================
// SMS TEMPLATES
// ============================================================

const smsTemplates = {
  /**
   * Booking Confirmation
   */
  booking_confirmation: {
    id: 'booking_confirmation',
    name: 'Confirmación de Reserva',
    trigger: 'reservation_confirmed',
    variables: ['guest_name', 'check_in', 'confirmation_code', 'hostal_name'],
    body: `Hola {{guest_name}}! Tu reserva en {{hostal_name}} está confirmada. Código: {{confirmation_code}}. Check-in: {{check_in}} desde 14:00. Te esperamos!`
  },

  /**
   * Check-in Reminder (day before)
   */
  checkin_reminder: {
    id: 'checkin_reminder',
    name: 'Recordatorio Check-in',
    trigger: 'day_before_checkin',
    variables: ['guest_name', 'hostal_name', 'hostal_address'],
    body: `Hola {{guest_name}}! Mañana te esperamos en {{hostal_name}}. Dirección: {{hostal_address}}. Check-in desde 14:00. Trae tu documento de identidad!`
  },

  /**
   * Check-out Reminder
   */
  checkout_reminder: {
    id: 'checkout_reminder',
    name: 'Recordatorio Check-out',
    trigger: 'checkout_day',
    variables: ['guest_name', 'checkout_time'],
    body: `Hola {{guest_name}}! Hoy es tu check-out antes de las {{checkout_time}}. No olvides revisar el locker y entregar la llave. Buen viaje!`
  },

  /**
   * WiFi Credentials
   */
  wifi_credentials: {
    id: 'wifi_credentials',
    name: 'Credenciales WiFi',
    trigger: 'post_checkin',
    variables: ['guest_name', 'wifi_network', 'wifi_password'],
    body: `Hola {{guest_name}}! WiFi: {{wifi_network}} | Password: {{wifi_password}}. Si necesitas algo, estamos en recepción!`
  },

  /**
   * Payment Confirmation
   */
  payment_confirmation: {
    id: 'payment_confirmation',
    name: 'Confirmación de Pago',
    trigger: 'payment_completed',
    variables: ['guest_name', 'amount', 'receipt_number'],
    body: `Hola {{guest_name}}! Pago recibido: {{amount}}. Recibo #{{receipt_number}}. Gracias por tu preferencia!`
  }
};

/**
 * Render template with data
 */
const renderTemplate = (template, data) => {
  let body = template.body;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    body = body.replace(regex, data[key] || '');
  });

  return body;
};

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /status
 * Check SMS service status
 */
router.get('/status', (req, res) => {
  res.json({
    module: 'sms',
    version: '1.1.0',
    twilio_enabled: twilio.isEnabled(),
    phone_number: twilio.isEnabled() ? twilio.getPhoneNumber() : null,
    endpoints: {
      core: [
        'GET /status',
        'POST /send',
        'POST /send-bulk',
        'POST /test',
        'GET /history',
        'GET /balance'
      ],
      templates: [
        'GET /templates',
        'GET /templates/:id',
        'POST /send-template',
        'POST /preview-template'
      ],
      automation: [
        'GET /automation/status',
        'GET /automation/pending-checkins',
        'GET /automation/pending-checkouts',
        'POST /automation/process-checkin-reminders',
        'POST /automation/process-checkout-reminders',
        'POST /automation/send-confirmation/:bookingId',
        'POST /automation/send-wifi/:bookingId'
      ]
    },
    templates_available: Object.keys(smsTemplates).length,
    automation_enabled: twilio.isEnabled()
  });
});

/**
 * POST /send
 * Send a single SMS
 */
router.post('/send', requireTwilio, async (req, res) => {
  try {
    const {
      to,
      body,
      reservation_id,
      guest_id
    } = req.body;

    // Validate required fields
    if (!to) {
      return res.status(400).json({
        error: 'Missing recipient',
        message: 'The "to" field is required'
      });
    }

    if (!body) {
      return res.status(400).json({
        error: 'Missing message body',
        message: 'The "body" field is required'
      });
    }

    // Validate message length (SMS limit is 160 characters for single SMS)
    if (body.length > 1600) {
      return res.status(400).json({
        error: 'Message too long',
        message: 'Maximum 1600 characters (will be split into multiple SMS)'
      });
    }

    // Send SMS
    const result = await twilio.sendSMS({ to, body });

    // Store SMS record
    await storeSMSRecord(req, {
      to: result.to,
      body,
      status: result.status,
      sid: result.sid,
      reservation_id,
      guest_id,
      type: 'transactional'
    });

    // Log activity
    await logSMSActivity(req, 'sms_sent', {
      to: result.to,
      reservation_id,
      guest_id,
      description: `SMS sent to ${result.to}`
    });

    logger.info('SMS sent via API', {
      to: result.to,
      sid: result.sid,
      status: result.status
    });

    res.json({
      success: true,
      sid: result.sid,
      to: result.to,
      status: result.status
    });

  } catch (error) {
    logger.error('Failed to send SMS', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'SMS send failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /send-bulk
 * Send SMS to multiple recipients
 */
router.post('/send-bulk', requireTwilio, async (req, res) => {
  try {
    const { to, body } = req.body;

    // Validate
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({
        error: 'Missing recipients',
        message: 'The "to" field must be a non-empty array of phone numbers'
      });
    }

    if (to.length > 100) {
      return res.status(400).json({
        error: 'Too many recipients',
        message: 'Maximum 100 recipients per request'
      });
    }

    if (!body) {
      return res.status(400).json({
        error: 'Missing message body',
        message: 'The "body" field is required'
      });
    }

    // Send bulk SMS
    const result = await twilio.sendBulkSMS({ to, body });

    // Log activity
    await logSMSActivity(req, 'bulk_sms_sent', {
      recipients: to.length,
      sent: result.sent,
      failed: result.failed,
      description: `Bulk SMS sent to ${result.sent} recipients`
    });

    logger.info('Bulk SMS sent via API', {
      recipients: to.length,
      sent: result.sent,
      failed: result.failed
    });

    res.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      recipients: to.length
    });

  } catch (error) {
    logger.error('Failed to send bulk SMS', {
      error: error.message
    });

    res.status(500).json({
      error: 'Bulk SMS send failed',
      message: error.message
    });
  }
});

/**
 * POST /test
 * Send a test SMS
 */
router.post('/test', requireTwilio, async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        error: 'Missing recipient',
        message: 'The "to" field is required for test SMS'
      });
    }

    const testBody = `[TEST] Almanik PMS - SMS Configuration Test. Sent at: ${new Date().toISOString()}. If you receive this, Twilio is configured correctly!`;

    const result = await twilio.sendSMS({ to, body: testBody });

    // Log activity
    await logSMSActivity(req, 'test_sms_sent', {
      to: result.to,
      description: `Test SMS sent to ${result.to}`
    });

    logger.info('Test SMS sent successfully', {
      to: result.to,
      sid: result.sid
    });

    res.json({
      success: true,
      message: 'Test SMS sent successfully',
      sid: result.sid,
      to: result.to,
      from: twilio.getPhoneNumber()
    });

  } catch (error) {
    logger.error('Failed to send test SMS', {
      error: error.message
    });

    res.status(500).json({
      error: 'Test SMS failed',
      message: error.message,
      suggestion: 'Please verify your Twilio credentials and phone number are correct'
    });
  }
});

/**
 * GET /history
 * Get SMS history from database
 */
router.get('/history', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { reservation_id, guest_id, limit = 50 } = req.query;

    let query = `SELECT * FROM sms_messages WHERE 1=1`;
    const params = [];

    if (reservation_id) {
      query += ` AND reservation_id = ?`;
      params.push(reservation_id);
    }

    if (guest_id) {
      query += ` AND guest_id = ?`;
      params.push(guest_id);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    let messages = [];
    try {
      messages = await db.query(query, params);
    } catch (tableError) {
      if (tableError.message && tableError.message.includes('no such table')) {
        messages = [];
      } else {
        throw tableError;
      }
    }

    res.json({
      success: true,
      messages,
      count: messages.length
    });

  } catch (error) {
    logger.error('Failed to get SMS history', { error: error.message });
    res.status(500).json({
      error: 'Failed to get SMS history',
      message: error.message
    });
  }
});

/**
 * GET /balance
 * Get Twilio account balance
 */
router.get('/balance', requireTwilio, async (req, res) => {
  try {
    const balance = await twilio.getAccountBalance();

    res.json({
      success: true,
      balance: balance.balance,
      currency: balance.currency
    });
  } catch (error) {
    logger.error('Failed to get account balance', { error: error.message });
    res.status(500).json({
      error: 'Failed to get balance',
      message: error.message
    });
  }
});

/**
 * GET /templates
 * List available SMS templates
 */
router.get('/templates', (req, res) => {
  const templates = Object.values(smsTemplates).map(t => ({
    id: t.id,
    name: t.name,
    trigger: t.trigger,
    variables: t.variables,
    body: t.body,
    length: t.body.length
  }));

  res.json({
    success: true,
    templates,
    count: templates.length
  });
});

/**
 * GET /templates/:id
 * Get a specific template
 */
router.get('/templates/:id', (req, res) => {
  const { id } = req.params;
  const template = smsTemplates[id];

  if (!template) {
    return res.status(404).json({
      error: 'Template not found',
      available: Object.keys(smsTemplates)
    });
  }

  res.json({
    success: true,
    template
  });
});

/**
 * POST /send-template
 * Send SMS using a template
 */
router.post('/send-template', requireTwilio, async (req, res) => {
  try {
    const {
      template_id,
      to,
      data = {},
      reservation_id,
      guest_id
    } = req.body;

    // Validate template
    if (!template_id) {
      return res.status(400).json({
        error: 'Missing template_id',
        available: Object.keys(smsTemplates)
      });
    }

    const template = smsTemplates[template_id];
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        available: Object.keys(smsTemplates)
      });
    }

    // Validate recipient
    if (!to) {
      return res.status(400).json({
        error: 'Missing recipient',
        message: 'The "to" field is required'
      });
    }

    // Check for missing variables (warning only)
    const missingVars = template.variables.filter(v => !data[v]);
    if (missingVars.length > 0) {
      logger.warn('SMS template missing variables', { template_id, missing: missingVars });
    }

    // Render template
    const body = renderTemplate(template, data);

    // Send SMS
    const result = await twilio.sendSMS({ to, body });

    // Store SMS record
    await storeSMSRecord(req, {
      to: result.to,
      body,
      templateId: template_id,
      status: result.status,
      sid: result.sid,
      reservation_id,
      guest_id,
      type: 'template',
      metadata: { template_id, data }
    });

    // Log activity
    await logSMSActivity(req, 'template_sms_sent', {
      template_id,
      template_name: template.name,
      to: result.to,
      reservation_id,
      guest_id,
      description: `Template SMS "${template.name}" sent to ${result.to}`
    });

    logger.info('Template SMS sent', {
      template_id,
      to: result.to,
      sid: result.sid
    });

    res.json({
      success: true,
      template_id,
      template_name: template.name,
      to: result.to,
      sid: result.sid,
      status: result.status
    });

  } catch (error) {
    logger.error('Failed to send template SMS', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Template SMS send failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /preview-template
 * Preview a rendered template without sending
 */
router.post('/preview-template', (req, res) => {
  try {
    const { template_id, data = {} } = req.body;

    const template = smsTemplates[template_id];
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        available: Object.keys(smsTemplates)
      });
    }

    // Fill missing variables with placeholders
    const previewData = { ...data };
    template.variables.forEach(v => {
      if (!previewData[v]) {
        previewData[v] = `[${v}]`;
      }
    });

    const body = renderTemplate(template, previewData);

    res.json({
      success: true,
      template_id,
      body,
      length: body.length,
      segments: Math.ceil(body.length / 160)
    });

  } catch (error) {
    res.status(500).json({
      error: 'Preview failed',
      message: error.message
    });
  }
});

// ============================================================
// AUTOMATION ENDPOINTS (DEV1-08)
// ============================================================

/**
 * GET /automation/status
 * Check automation status and configuration
 */
router.get('/automation/status', (req, res) => {
  res.json({
    success: true,
    automation: {
      sms_enabled: twilio.isEnabled(),
      phone_number: twilio.isEnabled() ? twilio.getPhoneNumber() : null,
      triggers: {
        booking_confirmation: twilio.isEnabled(),
        checkin_reminder: twilio.isEnabled(),
        checkout_reminder: twilio.isEnabled(),
        wifi_credentials: twilio.isEnabled(),
        payment_confirmation: twilio.isEnabled()
      },
      cron_schedule: {
        checkin_reminders: '0 10 * * *', // 10:00 AM daily
        checkout_reminders: '0 8 * * *'  // 8:00 AM daily
      },
      environment: {
        hostal_name: process.env.HOSTAL_NAME || 'Not configured',
        hostal_address: process.env.HOSTAL_ADDRESS || 'Not configured',
        wifi_network: process.env.WIFI_NETWORK || 'Not configured',
        checkout_time: process.env.CHECKOUT_TIME || '11:00'
      }
    }
  });
});

/**
 * GET /automation/pending-checkins
 * Get list of tomorrow's check-ins that will receive reminders
 */
router.get('/automation/pending-checkins', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({
        error: 'Database not available'
      });
    }

    const bookings = await getTomorrowCheckins(db);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    res.json({
      success: true,
      date: tomorrow.toISOString().split('T')[0],
      sms_enabled: twilio.isEnabled(),
      count: bookings.length,
      bookings: bookings.map(b => ({
        booking_id: b.id,
        confirmation_code: b.confirmation_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        check_in: b.check_in,
        bed_name: b.bed_name
      }))
    });

  } catch (error) {
    logger.error('Failed to get pending check-ins', { error: error.message });
    res.status(500).json({
      error: 'Failed to get pending check-ins',
      message: error.message
    });
  }
});

/**
 * GET /automation/pending-checkouts
 * Get list of today's checkouts that will receive reminders
 */
router.get('/automation/pending-checkouts', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({
        error: 'Database not available'
      });
    }

    const bookings = await getTodayCheckouts(db);

    res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      sms_enabled: twilio.isEnabled(),
      count: bookings.length,
      bookings: bookings.map(b => ({
        booking_id: b.id,
        confirmation_code: b.confirmation_code,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        check_out: b.check_out,
        bed_name: b.bed_name
      }))
    });

  } catch (error) {
    logger.error('Failed to get pending checkouts', { error: error.message });
    res.status(500).json({
      error: 'Failed to get pending checkouts',
      message: error.message
    });
  }
});

/**
 * POST /automation/process-checkin-reminders
 * Manually trigger check-in reminders (or called by cron)
 */
router.post('/automation/process-checkin-reminders', requireTwilio, async (req, res) => {
  try {
    const result = await processCheckinReminders(req.app);

    // Log activity
    await logSMSActivity(req, 'checkin_reminders_processed', {
      description: `Check-in reminders processed: ${result.sent} sent, ${result.failed} failed`,
      sent: result.sent,
      failed: result.failed
    });

    res.json({
      success: true,
      message: 'Check-in reminders processed',
      sent: result.sent,
      failed: result.failed,
      total: result.total
    });

  } catch (error) {
    logger.error('Failed to process check-in reminders', { error: error.message });
    res.status(500).json({
      error: 'Failed to process check-in reminders',
      message: error.message
    });
  }
});

/**
 * POST /automation/process-checkout-reminders
 * Manually trigger checkout reminders (or called by cron)
 */
router.post('/automation/process-checkout-reminders', requireTwilio, async (req, res) => {
  try {
    const result = await processCheckoutReminders(req.app);

    // Log activity
    await logSMSActivity(req, 'checkout_reminders_processed', {
      description: `Checkout reminders processed: ${result.sent} sent, ${result.failed} failed`,
      sent: result.sent,
      failed: result.failed
    });

    res.json({
      success: true,
      message: 'Checkout reminders processed',
      sent: result.sent,
      failed: result.failed,
      total: result.total
    });

  } catch (error) {
    logger.error('Failed to process checkout reminders', { error: error.message });
    res.status(500).json({
      error: 'Failed to process checkout reminders',
      message: error.message
    });
  }
});

/**
 * POST /automation/send-confirmation/:bookingId
 * Send confirmation SMS for a specific booking
 */
router.post('/automation/send-confirmation/:bookingId', requireTwilio, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const db = req.app.locals.db;

    // Get booking with guest info
    const booking = await db.get(`
      SELECT
        b.*,
        g.id as guest_id,
        g.name as guest_name,
        g.phone as guest_phone
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = ?
    `, [bookingId]);

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (!booking.guest_phone) {
      return res.status(400).json({
        error: 'Guest has no phone number'
      });
    }

    const guest = {
      id: booking.guest_id,
      name: booking.guest_name,
      phone: booking.guest_phone
    };

    const result = await sendBookingConfirmationSMS(req.app, booking, guest);

    if (result) {
      res.json({
        success: true,
        message: 'Confirmation SMS sent',
        sid: result.sid,
        to: result.to
      });
    } else {
      res.status(500).json({
        error: 'Failed to send SMS'
      });
    }

  } catch (error) {
    logger.error('Failed to send confirmation SMS', { error: error.message });
    res.status(500).json({
      error: 'Failed to send confirmation SMS',
      message: error.message
    });
  }
});

/**
 * POST /automation/send-wifi/:bookingId
 * Send WiFi credentials SMS for a specific booking
 */
router.post('/automation/send-wifi/:bookingId', requireTwilio, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const db = req.app.locals.db;

    // Get booking with guest info
    const booking = await db.get(`
      SELECT
        b.*,
        g.id as guest_id,
        g.name as guest_name,
        g.phone as guest_phone
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = ?
    `, [bookingId]);

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (!booking.guest_phone) {
      return res.status(400).json({
        error: 'Guest has no phone number'
      });
    }

    const guest = {
      id: booking.guest_id,
      name: booking.guest_name,
      phone: booking.guest_phone
    };

    const result = await sendWifiCredentialsSMS(req.app, booking, guest);

    if (result) {
      res.json({
        success: true,
        message: 'WiFi credentials SMS sent',
        sid: result.sid,
        to: result.to
      });
    } else {
      res.status(500).json({
        error: 'Failed to send SMS'
      });
    }

  } catch (error) {
    logger.error('Failed to send WiFi SMS', { error: error.message });
    res.status(500).json({
      error: 'Failed to send WiFi SMS',
      message: error.message
    });
  }
});

// ============================================================
// HELPER FUNCTIONS FOR OTHER MODULES
// ============================================================

/**
 * Send booking confirmation SMS
 */
const sendBookingConfirmationSMS = async (app, booking, guest) => {
  if (!twilio.isEnabled()) {
    logger.warn('Cannot send booking confirmation SMS - Twilio not configured');
    return null;
  }

  if (!guest.phone) {
    logger.warn('Cannot send booking confirmation SMS - Guest has no phone', { guest_id: guest.id });
    return null;
  }

  try {
    const template = smsTemplates.booking_confirmation;
    const data = {
      guest_name: guest.name.split(' ')[0], // First name only
      check_in: new Date(booking.check_in).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      confirmation_code: booking.confirmation_code,
      hostal_name: process.env.HOSTAL_NAME || 'Almanik Hostal'
    };

    const body = renderTemplate(template, data);
    const result = await twilio.sendSMS({ to: guest.phone, body });

    logger.info('Booking confirmation SMS sent', {
      booking_id: booking.id,
      guest_id: guest.id,
      phone: guest.phone
    });

    return result;
  } catch (error) {
    logger.error('Failed to send booking confirmation SMS', {
      booking_id: booking.id,
      error: error.message
    });
    return null;
  }
};

/**
 * Send check-in reminder SMS
 */
const sendCheckinReminderSMS = async (app, booking, guest) => {
  if (!twilio.isEnabled() || !guest.phone) {
    return null;
  }

  try {
    const template = smsTemplates.checkin_reminder;
    const data = {
      guest_name: guest.name.split(' ')[0],
      hostal_name: process.env.HOSTAL_NAME || 'Almanik Hostal',
      hostal_address: process.env.HOSTAL_ADDRESS || 'Dirección del hostal'
    };

    const body = renderTemplate(template, data);
    return await twilio.sendSMS({ to: guest.phone, body });
  } catch (error) {
    logger.error('Failed to send check-in reminder SMS', { error: error.message });
    return null;
  }
};

/**
 * Send checkout reminder SMS
 */
const sendCheckoutReminderSMS = async (app, booking, guest) => {
  if (!twilio.isEnabled() || !guest.phone) {
    return null;
  }

  try {
    const template = smsTemplates.checkout_reminder;
    const data = {
      guest_name: guest.name.split(' ')[0],
      checkout_time: process.env.CHECKOUT_TIME || '11:00'
    };

    const body = renderTemplate(template, data);
    const result = await twilio.sendSMS({ to: guest.phone, body });

    // Store in DB
    const db = app.locals.db;
    if (db) {
      await storeSMSRecordDirect(db, {
        to: result.to,
        body,
        templateId: 'checkout_reminder',
        status: result.status,
        sid: result.sid,
        reservation_id: booking.id,
        guest_id: guest.id,
        type: 'automation'
      });
    }

    logger.info('Checkout reminder SMS sent', {
      booking_id: booking.id,
      guest_id: guest.id
    });

    return result;
  } catch (error) {
    logger.error('Failed to send checkout reminder SMS', { error: error.message });
    return null;
  }
};

/**
 * Send WiFi credentials SMS
 */
const sendWifiCredentialsSMS = async (app, booking, guest) => {
  if (!twilio.isEnabled() || !guest.phone) {
    return null;
  }

  try {
    const template = smsTemplates.wifi_credentials;
    const data = {
      guest_name: guest.name.split(' ')[0],
      wifi_network: process.env.WIFI_NETWORK || 'AlmanikGuest',
      wifi_password: process.env.WIFI_PASSWORD || 'hostal2025'
    };

    const body = renderTemplate(template, data);
    const result = await twilio.sendSMS({ to: guest.phone, body });

    // Store in DB
    const db = app.locals.db;
    if (db) {
      await storeSMSRecordDirect(db, {
        to: result.to,
        body,
        templateId: 'wifi_credentials',
        status: result.status,
        sid: result.sid,
        reservation_id: booking.id,
        guest_id: guest.id,
        type: 'automation'
      });
    }

    logger.info('WiFi credentials SMS sent', {
      booking_id: booking.id,
      guest_id: guest.id
    });

    return result;
  } catch (error) {
    logger.error('Failed to send WiFi credentials SMS', { error: error.message });
    return null;
  }
};

/**
 * Send payment confirmation SMS
 */
const sendPaymentConfirmationSMS = async (app, booking, guest, payment) => {
  if (!twilio.isEnabled() || !guest.phone) {
    return null;
  }

  try {
    const template = smsTemplates.payment_confirmation;
    const data = {
      guest_name: guest.name.split(' ')[0],
      amount: `$${payment.amount.toLocaleString()}`,
      receipt_number: payment.id || 'N/A'
    };

    const body = renderTemplate(template, data);
    const result = await twilio.sendSMS({ to: guest.phone, body });

    logger.info('Payment confirmation SMS sent', {
      booking_id: booking.id,
      amount: payment.amount
    });

    return result;
  } catch (error) {
    logger.error('Failed to send payment confirmation SMS', { error: error.message });
    return null;
  }
};

/**
 * Store SMS record directly with DB reference
 */
const storeSMSRecordDirect = async (db, smsData) => {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_phone TEXT NOT NULL,
        from_phone TEXT,
        body TEXT,
        template_id TEXT,
        status TEXT DEFAULT 'sent',
        twilio_sid TEXT,
        reservation_id INTEGER,
        guest_id INTEGER,
        sms_type TEXT DEFAULT 'transactional',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(
      `INSERT INTO sms_messages (to_phone, from_phone, body, template_id, status, twilio_sid, reservation_id, guest_id, sms_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        smsData.to,
        smsData.from || twilio.getPhoneNumber(),
        smsData.body,
        smsData.templateId || null,
        smsData.status || 'sent',
        smsData.sid || null,
        smsData.reservation_id || null,
        smsData.guest_id || null,
        smsData.type || 'transactional'
      ]
    );
  } catch (error) {
    logger.error('Failed to store SMS record', { error: error.message });
  }
};

/**
 * Get tomorrow's check-ins for reminder cron job
 */
const getTomorrowCheckins = async (db) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    const bookings = await db.query(`
      SELECT
        b.id,
        b.confirmation_code,
        b.check_in,
        b.check_out,
        g.id as guest_id,
        g.name as guest_name,
        g.phone as guest_phone,
        bd.name as bed_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN beds bd ON b.bed_id = bd.id
      WHERE date(b.check_in) = ?
        AND b.status IN ('pending', 'confirmed')
        AND g.phone IS NOT NULL
        AND g.phone != ''
    `, [tomorrowStr]);

    return bookings;
  } catch (error) {
    logger.error('Failed to get tomorrow check-ins', { error: error.message });
    return [];
  }
};

/**
 * Get today's checkouts for reminder cron job
 */
const getTodayCheckouts = async (db) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    const bookings = await db.query(`
      SELECT
        b.id,
        b.confirmation_code,
        b.check_out,
        g.id as guest_id,
        g.name as guest_name,
        g.phone as guest_phone,
        bd.name as bed_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN beds bd ON b.bed_id = bd.id
      WHERE date(b.check_out) = ?
        AND b.status IN ('active', 'checked_in')
        AND g.phone IS NOT NULL
        AND g.phone != ''
    `, [today]);

    return bookings;
  } catch (error) {
    logger.error('Failed to get today checkouts', { error: error.message });
    return [];
  }
};

/**
 * Process check-in reminders (called by cron)
 */
const processCheckinReminders = async (app) => {
  if (!twilio.isEnabled()) {
    logger.warn('Skipping check-in reminders - Twilio not configured');
    return { sent: 0, failed: 0 };
  }

  const db = app.locals.db;
  if (!db) {
    logger.warn('Skipping check-in reminders - DB not available');
    return { sent: 0, failed: 0 };
  }

  const bookings = await getTomorrowCheckins(db);
  let sent = 0, failed = 0;

  for (const booking of bookings) {
    try {
      const guest = {
        id: booking.guest_id,
        name: booking.guest_name,
        phone: booking.guest_phone
      };

      await sendCheckinReminderSMS(app, booking, guest);

      // Store record
      await storeSMSRecordDirect(db, {
        to: guest.phone,
        templateId: 'checkin_reminder',
        status: 'sent',
        reservation_id: booking.id,
        guest_id: guest.id,
        type: 'automation'
      });

      sent++;
    } catch (error) {
      failed++;
      logger.error('Failed to send check-in reminder', {
        booking_id: booking.id,
        error: error.message
      });
    }
  }

  logger.info('Check-in reminders processed', { sent, failed, total: bookings.length });
  return { sent, failed, total: bookings.length };
};

/**
 * Process checkout reminders (called by cron)
 */
const processCheckoutReminders = async (app) => {
  if (!twilio.isEnabled()) {
    return { sent: 0, failed: 0 };
  }

  const db = app.locals.db;
  if (!db) {
    return { sent: 0, failed: 0 };
  }

  const bookings = await getTodayCheckouts(db);
  let sent = 0, failed = 0;

  for (const booking of bookings) {
    try {
      const guest = {
        id: booking.guest_id,
        name: booking.guest_name,
        phone: booking.guest_phone
      };

      await sendCheckoutReminderSMS(app, booking, guest);
      sent++;
    } catch (error) {
      failed++;
      logger.error('Failed to send checkout reminder', {
        booking_id: booking.id,
        error: error.message
      });
    }
  }

  logger.info('Checkout reminders processed', { sent, failed, total: bookings.length });
  return { sent, failed, total: bookings.length };
};

// Export helper functions
router.sendBookingConfirmationSMS = sendBookingConfirmationSMS;
router.sendCheckinReminderSMS = sendCheckinReminderSMS;
router.sendCheckoutReminderSMS = sendCheckoutReminderSMS;
router.sendWifiCredentialsSMS = sendWifiCredentialsSMS;
router.sendPaymentConfirmationSMS = sendPaymentConfirmationSMS;
router.processCheckinReminders = processCheckinReminders;
router.processCheckoutReminders = processCheckoutReminders;
router.getTomorrowCheckins = getTomorrowCheckins;
router.getTodayCheckouts = getTodayCheckouts;
router.templates = smsTemplates;
router.isEnabled = () => twilio.isEnabled();

// ============================================================
// EXPORTS
// ============================================================

module.exports = router;
