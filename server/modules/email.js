/**
 * ============================================================
 * ALMANIK PMS - Email Module (SendGrid)
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @author DEV1
 *
 * Gestion de envio de emails via SendGrid.
 *
 * DEV1-05 Endpoints:
 * - GET    /status         - Check email service status
 * - POST   /send           - Send a single email
 * - POST   /send-bulk      - Send to multiple recipients
 * - POST   /test           - Send test email
 *
 * DEV1-06 Endpoints (templates):
 * - POST   /send-template  - Send using SendGrid template
 * - GET    /templates      - List available templates
 */

const express = require('express');
const router = express.Router();
const sendgrid = require('../config/sendgrid');
const logger = require('../config/logger');

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Check if SendGrid is properly configured
 */
const requireSendGrid = (req, res, next) => {
  if (!sendgrid || !sendgrid.isEnabled()) {
    logger.warn('Email send attempted but SendGrid not configured');
    return res.status(503).json({
      error: 'Email service not available',
      message: 'SendGrid is not configured. Please add SENDGRID_API_KEY to environment.'
    });
  }
  next();
};

/**
 * Log email activity to database
 */
const logEmailActivity = async (req, action, details) => {
  try {
    const db = req.app.locals.db;
    if (!db) return;

    await db.run(
      `INSERT INTO activity_log (action_type, module, description, user_id, entity_id, entity_type, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action,
        'email',
        details.description || action,
        req.session?.id || null,
        details.reservation_id || details.guest_id || null,
        'email',
        JSON.stringify(details),
        req.ip
      ]
    );
  } catch (error) {
    logger.error('Failed to log email activity', { error: error.message });
  }
};

/**
 * Store email record in database
 */
const storeEmailRecord = async (req, emailData) => {
  try {
    const db = req.app.locals.db;
    if (!db) return null;

    // Create emails table if not exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_email TEXT NOT NULL,
        from_email TEXT,
        subject TEXT,
        template_id TEXT,
        status TEXT DEFAULT 'sent',
        message_id TEXT,
        reservation_id INTEGER,
        guest_id INTEGER,
        email_type TEXT DEFAULT 'transactional',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reservation_id) REFERENCES bookings(id),
        FOREIGN KEY (guest_id) REFERENCES guests(id)
      )
    `);

    const result = await db.run(
      `INSERT INTO emails (to_email, from_email, subject, template_id, status, message_id, reservation_id, guest_id, email_type, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emailData.to,
        emailData.from || sendgrid.getFromAddress().email,
        emailData.subject,
        emailData.templateId || null,
        emailData.status || 'sent',
        emailData.messageId || null,
        emailData.reservation_id || null,
        emailData.guest_id || null,
        emailData.type || 'transactional',
        JSON.stringify(emailData.metadata || {})
      ]
    );

    return result.lastID;
  } catch (error) {
    logger.error('Failed to store email record', { error: error.message });
    return null;
  }
};

// ============================================================
// ROUTES - DEV1-05: Basic Email
// ============================================================

/**
 * GET /status
 * Check email service status
 */
router.get('/status', (req, res) => {
  const fromAddress = sendgrid.isEnabled() ? sendgrid.getFromAddress() : null;

  res.json({
    module: 'email',
    version: '1.0.0',
    sendgrid_enabled: sendgrid.isEnabled(),
    from_email: fromAddress?.email || null,
    from_name: fromAddress?.name || null,
    endpoints: [
      'GET /status',
      'POST /send',
      'POST /send-bulk',
      'POST /test',
      'GET /history',
      'GET /templates',
      'GET /templates/:id',
      'POST /send-template',
      'POST /preview-template'
    ],
    templates_available: 4
  });
});

/**
 * POST /send
 * Send a single email
 *
 * Body:
 * - to: string (required) - Recipient email
 * - subject: string (required) - Email subject
 * - text: string (optional) - Plain text content
 * - html: string (optional) - HTML content
 * - reservation_id: number (optional) - Associated reservation
 * - guest_id: number (optional) - Associated guest
 */
router.post('/send', requireSendGrid, async (req, res) => {
  try {
    const {
      to,
      subject,
      text,
      html,
      replyTo,
      reservation_id,
      guest_id,
      categories,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!to) {
      return res.status(400).json({
        error: 'Missing recipient',
        message: 'The "to" field is required'
      });
    }

    if (!subject) {
      return res.status(400).json({
        error: 'Missing subject',
        message: 'The "subject" field is required'
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        error: 'Missing content',
        message: 'Either "text" or "html" content is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'The recipient email format is invalid'
      });
    }

    // Send email
    const result = await sendgrid.sendEmail({
      to,
      subject,
      text,
      html,
      replyTo,
      categories
    });

    // Store email record
    await storeEmailRecord(req, {
      to,
      subject,
      status: 'sent',
      messageId: result.messageId,
      reservation_id,
      guest_id,
      type: 'transactional',
      metadata
    });

    // Log activity
    await logEmailActivity(req, 'email_sent', {
      to,
      subject,
      reservation_id,
      guest_id,
      description: `Email sent to ${to}`
    });

    logger.info('Email sent via API', {
      to,
      subject,
      messageId: result.messageId
    });

    res.json({
      success: true,
      messageId: result.messageId,
      to,
      subject
    });

  } catch (error) {
    logger.error('Failed to send email', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Email send failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /send-bulk
 * Send email to multiple recipients
 *
 * Body:
 * - to: string[] (required) - Array of recipient emails
 * - subject: string (required) - Email subject
 * - text: string (optional) - Plain text content
 * - html: string (optional) - HTML content
 */
router.post('/send-bulk', requireSendGrid, async (req, res) => {
  try {
    const {
      to,
      subject,
      text,
      html,
      replyTo,
      categories
    } = req.body;

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({
        error: 'Missing recipients',
        message: 'The "to" field must be a non-empty array of emails'
      });
    }

    if (to.length > 100) {
      return res.status(400).json({
        error: 'Too many recipients',
        message: 'Maximum 100 recipients per request'
      });
    }

    if (!subject) {
      return res.status(400).json({
        error: 'Missing subject',
        message: 'The "subject" field is required'
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        error: 'Missing content',
        message: 'Either "text" or "html" content is required'
      });
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = to.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: 'Invalid emails',
        message: 'Some recipient emails are invalid',
        invalid: invalidEmails
      });
    }

    // Send bulk email
    const result = await sendgrid.sendBulkEmail({
      to,
      subject,
      text,
      html,
      replyTo,
      categories
    });

    // Log activity
    await logEmailActivity(req, 'bulk_email_sent', {
      recipients: to.length,
      subject,
      description: `Bulk email sent to ${to.length} recipients`
    });

    logger.info('Bulk email sent via API', {
      recipients: to.length,
      subject
    });

    res.json({
      success: true,
      sent: result.sent,
      recipients: to.length,
      subject
    });

  } catch (error) {
    logger.error('Failed to send bulk email', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Bulk email send failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /test
 * Send a test email to verify configuration
 *
 * Body:
 * - to: string (required) - Recipient email for test
 */
router.post('/test', requireSendGrid, async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        error: 'Missing recipient',
        message: 'The "to" field is required for test email'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'The recipient email format is invalid'
      });
    }

    const testSubject = `[TEST] Almanik PMS - Email Configuration Test`;
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .success { color: #059669; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Almanik PMS</h1>
          </div>
          <div class="content">
            <h2 class="success">✅ Email Configuration Successful!</h2>
            <p>This is a test email from your Almanik PMS installation.</p>
            <p>If you're receiving this email, your SendGrid integration is working correctly.</p>
            <hr>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Sent at: ${new Date().toISOString()}</li>
              <li>From: ${sendgrid.getFromAddress().email}</li>
              <li>To: ${to}</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated test email from Almanik PMS.</p>
            <p>Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const testText = `
Almanik PMS - Email Configuration Test

✅ Email Configuration Successful!

This is a test email from your Almanik PMS installation.
If you're receiving this email, your SendGrid integration is working correctly.

Test Details:
- Sent at: ${new Date().toISOString()}
- From: ${sendgrid.getFromAddress().email}
- To: ${to}

This is an automated test email. Please do not reply.
    `;

    // Send test email
    const result = await sendgrid.sendEmail({
      to,
      subject: testSubject,
      text: testText,
      html: testHtml,
      categories: ['test', 'almanik-pms']
    });

    // Log activity
    await logEmailActivity(req, 'test_email_sent', {
      to,
      subject: testSubject,
      description: `Test email sent to ${to}`
    });

    logger.info('Test email sent successfully', {
      to,
      messageId: result.messageId
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      to,
      from: sendgrid.getFromAddress().email
    });

  } catch (error) {
    logger.error('Failed to send test email', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Test email failed',
      message: error.message,
      code: error.code,
      suggestion: 'Please verify your SendGrid API key and sender email are correct'
    });
  }
});

/**
 * GET /history
 * Get email history (optional: filter by reservation or guest)
 *
 * Query params:
 * - reservation_id: number (optional)
 * - guest_id: number (optional)
 * - limit: number (optional, default 50)
 */
router.get('/history', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { reservation_id, guest_id, limit = 50 } = req.query;

    let query = `SELECT * FROM emails WHERE 1=1`;
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

    let emails = [];
    try {
      emails = await db.query(query, params);
    } catch (tableError) {
      if (tableError.message && tableError.message.includes('no such table')) {
        emails = [];
      } else {
        throw tableError;
      }
    }

    res.json({
      success: true,
      emails,
      count: emails.length
    });

  } catch (error) {
    logger.error('Failed to get email history', { error: error.message });
    res.status(500).json({
      error: 'Failed to get email history',
      message: error.message
    });
  }
});

// ============================================================
// DEV1-06: EMAIL TEMPLATES
// ============================================================

/**
 * Email templates for automated notifications
 */
const emailTemplates = {
  /**
   * Booking Confirmation - Sent when reservation is confirmed
   */
  booking_confirmation: {
    id: 'booking_confirmation',
    name: 'Confirmación de Reserva',
    subject: 'Confirmación de Reserva - {{hostal_name}}',
    trigger: 'reservation_confirmed',
    variables: ['guest_name', 'check_in', 'check_out', 'bed_name', 'total', 'confirmation_code', 'hostal_name', 'hostal_address', 'hostal_phone'],
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .confirmation-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 25px; }
    .confirmation-code { font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 2px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .details-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .details-table td:first-child { font-weight: 600; color: #6b7280; width: 40%; }
    .total-row { background: #f9fafb; font-size: 18px; }
    .total-row td { font-weight: bold; color: #111827; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .info-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{hostal_name}}</h1>
      <p>¡Reserva Confirmada!</p>
    </div>
    <div class="content">
      <p>Hola <strong>{{guest_name}}</strong>,</p>
      <p>¡Gracias por tu reserva! Estamos emocionados de recibirte pronto.</p>

      <div class="confirmation-box">
        <p style="margin: 0 0 10px; color: #6b7280;">Código de Confirmación</p>
        <div class="confirmation-code">{{confirmation_code}}</div>
      </div>

      <h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Detalles de tu Reserva</h3>
      <table class="details-table">
        <tr>
          <td>Check-in</td>
          <td><strong>{{check_in}}</strong> (desde 14:00)</td>
        </tr>
        <tr>
          <td>Check-out</td>
          <td><strong>{{check_out}}</strong> (hasta 11:00)</td>
        </tr>
        <tr>
          <td>Alojamiento</td>
          <td><strong>{{bed_name}}</strong></td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td>{{total}}</td>
        </tr>
      </table>

      <div class="info-box">
        <strong>📍 Dirección:</strong><br>
        {{hostal_address}}<br><br>
        <strong>📞 Teléfono:</strong> {{hostal_phone}}
      </div>

      <h3 style="color: #111827;">¿Qué traer?</h3>
      <ul>
        <li>Documento de identidad o pasaporte</li>
        <li>Este correo o código de confirmación</li>
        <li>Candado para locker (opcional, vendemos en recepción)</li>
      </ul>

      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
      <p>¡Te esperamos!</p>
    </div>
    <div class="footer">
      <p><strong>{{hostal_name}}</strong></p>
      <p>{{hostal_address}}</p>
      <p>{{hostal_phone}}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
      <p>Este correo fue enviado automáticamente. Por favor no responder directamente.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
¡Reserva Confirmada!

Hola {{guest_name}},

¡Gracias por tu reserva! Estamos emocionados de recibirte pronto.

CÓDIGO DE CONFIRMACIÓN: {{confirmation_code}}

DETALLES DE TU RESERVA:
- Check-in: {{check_in}} (desde 14:00)
- Check-out: {{check_out}} (hasta 11:00)
- Alojamiento: {{bed_name}}
- Total: {{total}}

DIRECCIÓN:
{{hostal_address}}

TELÉFONO: {{hostal_phone}}

¿QUÉ TRAER?
- Documento de identidad o pasaporte
- Este correo o código de confirmación
- Candado para locker (opcional)

Si tienes alguna pregunta, no dudes en contactarnos.

¡Te esperamos!

{{hostal_name}}
    `
  },

  /**
   * Check-in Reminder - Sent 1 day before check-in
   */
  checkin_reminder: {
    id: 'checkin_reminder',
    name: 'Recordatorio de Check-in',
    subject: '¡Mañana te esperamos! - {{hostal_name}}',
    trigger: 'day_before_checkin',
    variables: ['guest_name', 'check_in', 'bed_name', 'confirmation_code', 'hostal_name', 'hostal_address', 'hostal_phone', 'checkin_time'],
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .highlight-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .big-date { font-size: 24px; font-weight: bold; color: #b45309; }
    .checklist { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .checklist h4 { margin: 0 0 15px; color: #111827; }
    .checklist ul { margin: 0; padding-left: 20px; }
    .checklist li { margin: 8px 0; }
    .map-link { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ ¡Mañana te esperamos!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{guest_name}}</strong>,</p>
      <p>Este es un recordatorio de que tu check-in es <strong>mañana</strong>.</p>

      <div class="highlight-box">
        <p style="margin: 0; color: #92400e;">Tu llegada</p>
        <div class="big-date">{{check_in}}</div>
        <p style="margin: 10px 0 0; font-size: 18px;">A partir de las {{checkin_time}}</p>
      </div>

      <p><strong>Código de confirmación:</strong> {{confirmation_code}}</p>
      <p><strong>Tu cama:</strong> {{bed_name}}</p>

      <div class="checklist">
        <h4>📋 Checklist para tu llegada:</h4>
        <ul>
          <li>✅ Documento de identidad o pasaporte</li>
          <li>✅ Código de confirmación: {{confirmation_code}}</li>
          <li>✅ Método de pago (si hay saldo pendiente)</li>
          <li>💡 Candado para locker (opcional)</li>
        </ul>
      </div>

      <h3>📍 ¿Cómo llegar?</h3>
      <p>{{hostal_address}}</p>

      <h3>📞 ¿Necesitas ayuda?</h3>
      <p>Contáctanos al {{hostal_phone}}</p>

      <p style="margin-top: 30px;">¡Nos vemos mañana!</p>
      <p><strong>El equipo de {{hostal_name}}</strong></p>
    </div>
    <div class="footer">
      <p>{{hostal_name}} | {{hostal_address}}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
¡Mañana te esperamos!

Hola {{guest_name}},

Este es un recordatorio de que tu check-in es MAÑANA.

FECHA: {{check_in}}
HORA: A partir de las {{checkin_time}}
CÓDIGO: {{confirmation_code}}
TU CAMA: {{bed_name}}

CHECKLIST PARA TU LLEGADA:
✅ Documento de identidad o pasaporte
✅ Código de confirmación
✅ Método de pago (si hay saldo pendiente)
💡 Candado para locker (opcional)

DIRECCIÓN:
{{hostal_address}}

TELÉFONO: {{hostal_phone}}

¡Nos vemos mañana!
El equipo de {{hostal_name}}
    `
  },

  /**
   * Receipt - Sent after payment is completed
   */
  receipt: {
    id: 'receipt',
    name: 'Recibo de Pago',
    subject: 'Recibo de Pago #{{receipt_number}} - {{hostal_name}}',
    trigger: 'payment_completed',
    variables: ['guest_name', 'receipt_number', 'payment_date', 'items', 'subtotal', 'taxes', 'total', 'payment_method', 'hostal_name', 'hostal_address', 'hostal_nit'],
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #111827; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .receipt-info { background: #f9fafb; padding: 15px 30px; display: flex; justify-content: space-between; }
    .content { padding: 30px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .items-table .amount { text-align: right; }
    .totals { background: #f9fafb; padding: 15px; margin-top: 20px; }
    .totals table { width: 100%; }
    .totals td { padding: 8px 0; }
    .totals .label { color: #6b7280; }
    .totals .value { text-align: right; font-weight: 600; }
    .grand-total { font-size: 20px; color: #059669; border-top: 2px solid #e5e7eb; padding-top: 10px; }
    .payment-info { background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 11px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{hostal_name}}</h1>
      <p style="margin: 5px 0 0; opacity: 0.8;">Recibo de Pago</p>
    </div>
    <div class="receipt-info" style="background: #f9fafb; padding: 15px 30px;">
      <div>
        <strong>Recibo #:</strong> {{receipt_number}}<br>
        <strong>Fecha:</strong> {{payment_date}}
      </div>
      <div style="text-align: right;">
        <strong>Cliente:</strong> {{guest_name}}
      </div>
    </div>
    <div class="content">
      <table class="items-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cant.</th>
            <th class="amount">Precio</th>
            <th class="amount">Total</th>
          </tr>
        </thead>
        <tbody>
          {{items}}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td class="label">Subtotal</td>
            <td class="value">{{subtotal}}</td>
          </tr>
          <tr>
            <td class="label">Impuestos</td>
            <td class="value">{{taxes}}</td>
          </tr>
          <tr class="grand-total">
            <td><strong>TOTAL</strong></td>
            <td class="value"><strong>{{total}}</strong></td>
          </tr>
        </table>
      </div>

      <div class="payment-info">
        <strong>✅ Pago recibido</strong><br>
        Método: {{payment_method}}<br>
        Fecha: {{payment_date}}
      </div>

      <p style="font-size: 12px; color: #6b7280;">
        Este documento es un comprobante de pago. Guárdalo para tus registros.
      </p>
    </div>
    <div class="footer">
      <p><strong>{{hostal_name}}</strong></p>
      <p>{{hostal_address}}</p>
      <p>NIT: {{hostal_nit}}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">
      <p>Gracias por tu preferencia</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
RECIBO DE PAGO
{{hostal_name}}

Recibo #: {{receipt_number}}
Fecha: {{payment_date}}
Cliente: {{guest_name}}

-------------------------------------------
DETALLE
-------------------------------------------
{{items}}

-------------------------------------------
Subtotal:     {{subtotal}}
Impuestos:    {{taxes}}
-------------------------------------------
TOTAL:        {{total}}
-------------------------------------------

PAGO RECIBIDO
Método: {{payment_method}}
Fecha: {{payment_date}}

-------------------------------------------
{{hostal_name}}
{{hostal_address}}
NIT: {{hostal_nit}}

Gracias por tu preferencia
    `
  },

  /**
   * Checkout Reminder - Sent on checkout day
   */
  checkout_reminder: {
    id: 'checkout_reminder',
    name: 'Recordatorio de Check-out',
    subject: 'Recordatorio: Check-out hoy - {{hostal_name}}',
    trigger: 'checkout_day',
    variables: ['guest_name', 'check_out', 'checkout_time', 'bed_name', 'balance', 'hostal_name', 'review_link'],
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .time-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .big-time { font-size: 36px; font-weight: bold; color: #b45309; }
    .checklist { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .balance-box { background: #fee2e2; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
    .balance-ok { background: #ecfdf5; }
    .review-button { display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 Check-out Hoy</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{guest_name}}</strong>,</p>
      <p>Esperamos que hayas disfrutado tu estadía con nosotros. Te recordamos que hoy es tu día de check-out.</p>

      <div class="time-box">
        <p style="margin: 0; color: #92400e;">Hora límite de salida</p>
        <div class="big-time">{{checkout_time}}</div>
        <p style="margin: 10px 0 0;">{{check_out}}</p>
      </div>

      <div class="checklist">
        <h4>📋 Antes de irte:</h4>
        <ul>
          <li>Recoge todas tus pertenencias</li>
          <li>Devuelve la llave/tarjeta en recepción</li>
          <li>Verifica el locker esté vacío</li>
          <li>Confirma que no tienes saldo pendiente</li>
        </ul>
      </div>

      {{#if balance}}
      <div class="balance-box">
        <strong>💰 Saldo pendiente: {{balance}}</strong><br>
        Por favor pasa por recepción antes de irte.
      </div>
      {{else}}
      <div class="balance-box balance-ok">
        <strong>✅ Tu cuenta está al día</strong><br>
        ¡Gracias!
      </div>
      {{/if}}

      <div style="text-align: center; margin: 30px 0;">
        <p><strong>¿Cómo fue tu experiencia?</strong></p>
        <p>Tu opinión nos ayuda a mejorar</p>
        <a href="{{review_link}}" class="review-button">⭐ Dejar Reseña</a>
      </div>

      <p>¡Gracias por hospedarte con nosotros! Esperamos verte pronto.</p>
      <p><strong>El equipo de {{hostal_name}}</strong></p>
    </div>
    <div class="footer">
      <p>{{hostal_name}}</p>
      <p>¡Buen viaje! 🌍</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
CHECK-OUT HOY

Hola {{guest_name}},

Esperamos que hayas disfrutado tu estadía con nosotros.
Te recordamos que hoy es tu día de check-out.

HORA LÍMITE DE SALIDA: {{checkout_time}}
FECHA: {{check_out}}

ANTES DE IRTE:
- Recoge todas tus pertenencias
- Devuelve la llave/tarjeta en recepción
- Verifica el locker esté vacío
- Confirma que no tienes saldo pendiente

SALDO: {{balance}}

¿CÓMO FUE TU EXPERIENCIA?
Déjanos tu reseña: {{review_link}}

¡Gracias por hospedarte con nosotros!
El equipo de {{hostal_name}}

¡Buen viaje! 🌍
    `
  }
};

/**
 * Replace template variables with actual values
 */
const renderTemplate = (template, data) => {
  let html = template.html;
  let text = template.text;
  let subject = template.subject;

  // Replace all variables
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const value = data[key] || '';
    html = html.replace(regex, value);
    text = text.replace(regex, value);
    subject = subject.replace(regex, value);
  });

  // Handle conditional blocks (simple implementation)
  html = html.replace(/{{#if\s+(\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, (match, variable, ifBlock, elseBlock) => {
    return data[variable] ? ifBlock : elseBlock;
  });
  html = html.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, block) => {
    return data[variable] ? block : '';
  });

  return { html, text, subject };
};

/**
 * GET /templates
 * List available email templates
 */
router.get('/templates', (req, res) => {
  const templates = Object.values(emailTemplates).map(t => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    trigger: t.trigger,
    variables: t.variables
  }));

  res.json({
    success: true,
    templates,
    count: templates.length
  });
});

/**
 * GET /templates/:id
 * Get a specific template with preview
 */
router.get('/templates/:id', (req, res) => {
  const { id } = req.params;
  const template = emailTemplates[id];

  if (!template) {
    return res.status(404).json({
      error: 'Template not found',
      available: Object.keys(emailTemplates)
    });
  }

  res.json({
    success: true,
    template: {
      id: template.id,
      name: template.name,
      subject: template.subject,
      trigger: template.trigger,
      variables: template.variables,
      html: template.html,
      text: template.text
    }
  });
});

/**
 * POST /send-template
 * Send email using a template
 *
 * Body:
 * - template_id: string (required) - Template to use
 * - to: string (required) - Recipient email
 * - data: object (required) - Variables to replace in template
 * - reservation_id: number (optional)
 * - guest_id: number (optional)
 */
router.post('/send-template', requireSendGrid, async (req, res) => {
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
        available: Object.keys(emailTemplates)
      });
    }

    const template = emailTemplates[template_id];
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        available: Object.keys(emailTemplates)
      });
    }

    // Validate recipient
    if (!to) {
      return res.status(400).json({
        error: 'Missing recipient',
        message: 'The "to" field is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'The recipient email format is invalid'
      });
    }

    // Check for required variables
    const missingVars = template.variables.filter(v => !data[v] && v !== 'items');
    if (missingVars.length > 0) {
      return res.status(400).json({
        error: 'Missing template variables',
        missing: missingVars,
        required: template.variables
      });
    }

    // Render template
    const rendered = renderTemplate(template, data);

    // Send email
    const result = await sendgrid.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      categories: ['template', template_id, 'almanik-pms']
    });

    // Store email record
    await storeEmailRecord(req, {
      to,
      subject: rendered.subject,
      templateId: template_id,
      status: 'sent',
      messageId: result.messageId,
      reservation_id,
      guest_id,
      type: 'template',
      metadata: { template_id, data }
    });

    // Log activity
    await logEmailActivity(req, 'template_email_sent', {
      template_id,
      template_name: template.name,
      to,
      reservation_id,
      guest_id,
      description: `Template email "${template.name}" sent to ${to}`
    });

    logger.info('Template email sent', {
      template_id,
      to,
      messageId: result.messageId
    });

    res.json({
      success: true,
      template_id,
      template_name: template.name,
      to,
      subject: rendered.subject,
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Failed to send template email', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Template email send failed',
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

    const template = emailTemplates[template_id];
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        available: Object.keys(emailTemplates)
      });
    }

    // Fill missing variables with placeholders
    const previewData = { ...data };
    template.variables.forEach(v => {
      if (!previewData[v]) {
        previewData[v] = `[${v}]`;
      }
    });

    const rendered = renderTemplate(template, previewData);

    res.json({
      success: true,
      template_id,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });

  } catch (error) {
    res.status(500).json({
      error: 'Preview failed',
      message: error.message
    });
  }
});

// ============================================================
// HELPER FUNCTIONS FOR OTHER MODULES
// ============================================================

/**
 * Send booking confirmation email
 * Called from reservations module when booking is confirmed
 */
const sendBookingConfirmation = async (app, booking, guest) => {
  if (!sendgrid || !sendgrid.isEnabled()) {
    logger.warn('Cannot send booking confirmation - SendGrid not configured');
    return null;
  }

  if (!guest.email) {
    logger.warn('Cannot send booking confirmation - Guest has no email', { guest_id: guest.id });
    return null;
  }

  try {
    const template = emailTemplates.booking_confirmation;
    const data = {
      guest_name: guest.name,
      check_in: new Date(booking.check_in).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      check_out: new Date(booking.check_out).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      bed_name: booking.bed_name || `Cama ${booking.bed_id}`,
      total: `$${(booking.total || 0).toLocaleString()} COP`,
      confirmation_code: booking.confirmation_code,
      hostal_name: process.env.HOSTAL_NAME || 'Almanik Hostal',
      hostal_address: process.env.HOSTAL_ADDRESS || 'Dirección del hostal',
      hostal_phone: process.env.HOSTAL_PHONE || '+57 XXX XXX XXXX'
    };

    const rendered = renderTemplate(template, data);

    const result = await sendgrid.sendEmail({
      to: guest.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      categories: ['booking_confirmation', 'automated', 'almanik-pms']
    });

    logger.info('Booking confirmation email sent', {
      booking_id: booking.id,
      guest_id: guest.id,
      email: guest.email,
      messageId: result.messageId
    });

    return result;
  } catch (error) {
    logger.error('Failed to send booking confirmation', {
      booking_id: booking.id,
      error: error.message
    });
    return null;
  }
};

/**
 * Send checkout reminder email
 * Called by cron job on checkout day
 */
const sendCheckoutReminder = async (app, booking, guest) => {
  if (!sendgrid || !sendgrid.isEnabled() || !guest.email) {
    return null;
  }

  try {
    const template = emailTemplates.checkout_reminder;
    const data = {
      guest_name: guest.name,
      check_out: new Date(booking.check_out).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      checkout_time: '11:00 AM',
      bed_name: booking.bed_name || `Cama ${booking.bed_id}`,
      balance: booking.balance > 0 ? `$${booking.balance.toLocaleString()} COP` : null,
      hostal_name: process.env.HOSTAL_NAME || 'Almanik Hostal',
      review_link: `${process.env.APP_URL || 'http://localhost:3000'}/review.html?token=${booking.review_token || booking.id}`
    };

    const rendered = renderTemplate(template, data);

    const result = await sendgrid.sendEmail({
      to: guest.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      categories: ['checkout_reminder', 'automated', 'almanik-pms']
    });

    return result;
  } catch (error) {
    logger.error('Failed to send checkout reminder', { error: error.message });
    return null;
  }
};

// Export helper functions
router.sendBookingConfirmation = sendBookingConfirmation;
router.sendCheckoutReminder = sendCheckoutReminder;
router.templates = emailTemplates;

// ============================================================
// EXPORTS
// ============================================================

module.exports = router;
