/**
 * ============================================================
 * ALMANIK PMS - SendGrid Configuration
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @author DEV1
 *
 * Configuracion del cliente SendGrid para envio de emails.
 *
 * Variables de entorno requeridas:
 * - SENDGRID_API_KEY: API key de SendGrid
 * - EMAIL_FROM: Email de origen (debe estar verificado en SendGrid)
 * - EMAIL_FROM_NAME: Nombre del remitente (opcional)
 */

const sgMail = require('@sendgrid/mail');
const logger = require('./logger');

// ============================================================
// CONFIGURATION
// ============================================================

const config = {
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.EMAIL_FROM || 'noreply@almanik.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Almanik PMS',
  replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM,
  enabled: false
};

// Initialize SendGrid if API key is available
if (config.apiKey) {
  sgMail.setApiKey(config.apiKey);
  config.enabled = true;
  logger.info('SendGrid configured successfully', {
    from: config.fromEmail,
    fromName: config.fromName
  });
} else {
  logger.warn('SendGrid not configured - SENDGRID_API_KEY not found in environment');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if SendGrid is properly configured
 */
const isEnabled = () => config.enabled;

/**
 * Get the default "from" address
 */
const getFromAddress = () => ({
  email: config.fromEmail,
  name: config.fromName
});

/**
 * Send a single email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {string} options.templateId - SendGrid template ID (optional)
 * @param {Object} options.dynamicData - Template dynamic data (optional)
 * @returns {Promise<Object>} SendGrid response
 */
const sendEmail = async (options) => {
  if (!config.enabled) {
    throw new Error('SendGrid not configured');
  }

  const msg = {
    to: options.to,
    from: options.from || getFromAddress(),
    subject: options.subject,
    replyTo: options.replyTo || config.replyTo
  };

  // Use template or direct content
  if (options.templateId) {
    msg.templateId = options.templateId;
    if (options.dynamicData) {
      msg.dynamicTemplateData = options.dynamicData;
    }
  } else {
    if (options.text) msg.text = options.text;
    if (options.html) msg.html = options.html;
  }

  // Add attachments if provided
  if (options.attachments && options.attachments.length > 0) {
    msg.attachments = options.attachments;
  }

  // Add categories for tracking
  if (options.categories) {
    msg.categories = options.categories;
  }

  try {
    const response = await sgMail.send(msg);
    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
      messageId: response[0]?.headers?.['x-message-id']
    });
    return {
      success: true,
      messageId: response[0]?.headers?.['x-message-id'],
      statusCode: response[0]?.statusCode
    };
  } catch (error) {
    logger.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error: error.message,
      code: error.code
    });
    throw error;
  }
};

/**
 * Send email to multiple recipients
 * @param {Object} options - Email options with 'to' as array
 * @returns {Promise<Object>} SendGrid response
 */
const sendBulkEmail = async (options) => {
  if (!config.enabled) {
    throw new Error('SendGrid not configured');
  }

  const messages = options.to.map(recipient => ({
    to: recipient,
    from: options.from || getFromAddress(),
    subject: options.subject,
    text: options.text,
    html: options.html,
    templateId: options.templateId,
    dynamicTemplateData: options.dynamicData,
    replyTo: options.replyTo || config.replyTo
  }));

  try {
    const response = await sgMail.send(messages);
    logger.info('Bulk email sent successfully', {
      recipients: options.to.length,
      subject: options.subject
    });
    return {
      success: true,
      sent: options.to.length
    };
  } catch (error) {
    logger.error('Failed to send bulk email', {
      recipients: options.to.length,
      error: error.message
    });
    throw error;
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  client: sgMail,
  config,
  isEnabled,
  getFromAddress,
  sendEmail,
  sendBulkEmail
};
