/**
 * ============================================================
 * ALMANIK PMS - Twilio Configuration
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-29
 * @author DEV1
 *
 * Configuracion del cliente Twilio para envio de SMS.
 *
 * Variables de entorno requeridas:
 * - TWILIO_ACCOUNT_SID: Account SID de Twilio
 * - TWILIO_AUTH_TOKEN: Auth Token de Twilio
 * - TWILIO_PHONE_NUMBER: Numero de telefono Twilio (formato +1234567890)
 */

const logger = require('./logger');

let twilioClient = null;
let isEnabled = false;

// Configuracion
const config = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  // Opcional: numero de WhatsApp (si usas Twilio para WhatsApp)
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
};

/**
 * Inicializar cliente Twilio
 */
const initialize = () => {
  if (!config.accountSid || !config.authToken) {
    logger.warn('Twilio not configured - TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not found');
    return false;
  }

  if (!config.phoneNumber) {
    logger.warn('Twilio phone number not configured - TWILIO_PHONE_NUMBER not found');
    return false;
  }

  try {
    const twilio = require('twilio');
    twilioClient = twilio(config.accountSid, config.authToken);
    isEnabled = true;
    logger.info('Twilio client initialized successfully', {
      phoneNumber: config.phoneNumber
    });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Twilio client', { error: error.message });
    return false;
  }
};

/**
 * Verificar si Twilio esta habilitado
 */
const checkEnabled = () => {
  return isEnabled && twilioClient !== null;
};

/**
 * Obtener numero de telefono configurado
 */
const getPhoneNumber = () => {
  return config.phoneNumber;
};

/**
 * Formatear numero de telefono a formato E.164
 * @param {string} phone - Numero de telefono
 * @param {string} defaultCountry - Codigo de pais por defecto (ej: '57' para Colombia)
 */
const formatPhoneNumber = (phone, defaultCountry = '57') => {
  if (!phone) return null;

  // Remover espacios, guiones y parentesis
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Si ya tiene formato E.164 (+1234567890)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Si empieza con 00, reemplazar por +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }

  // Si no tiene codigo de pais, agregar el default
  if (!cleaned.startsWith(defaultCountry)) {
    // Si empieza con 0, quitarlo
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = defaultCountry + cleaned;
  }

  return '+' + cleaned;
};

/**
 * Enviar SMS
 * @param {Object} options - Opciones del mensaje
 * @param {string} options.to - Numero destino (formato E.164)
 * @param {string} options.body - Contenido del mensaje
 * @param {string} options.from - Numero origen (opcional, usa default)
 */
const sendSMS = async (options) => {
  if (!checkEnabled()) {
    throw new Error('Twilio is not configured');
  }

  const { to, body, from = config.phoneNumber } = options;

  if (!to) {
    throw new Error('Recipient phone number is required');
  }

  if (!body) {
    throw new Error('Message body is required');
  }

  // Formatear numero destino
  const formattedTo = formatPhoneNumber(to);

  try {
    const message = await twilioClient.messages.create({
      body: body,
      from: from,
      to: formattedTo
    });

    logger.info('SMS sent successfully', {
      sid: message.sid,
      to: formattedTo,
      status: message.status
    });

    return {
      success: true,
      sid: message.sid,
      to: formattedTo,
      status: message.status,
      dateCreated: message.dateCreated
    };
  } catch (error) {
    logger.error('Failed to send SMS', {
      to: formattedTo,
      error: error.message,
      code: error.code
    });

    throw error;
  }
};

/**
 * Enviar SMS masivo
 * @param {Object} options - Opciones
 * @param {string[]} options.to - Array de numeros destino
 * @param {string} options.body - Contenido del mensaje
 */
const sendBulkSMS = async (options) => {
  if (!checkEnabled()) {
    throw new Error('Twilio is not configured');
  }

  const { to, body } = options;

  if (!Array.isArray(to) || to.length === 0) {
    throw new Error('Recipients array is required');
  }

  if (to.length > 100) {
    throw new Error('Maximum 100 recipients per request');
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const phone of to) {
    try {
      await sendSMS({ to: phone, body });
      results.sent++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        phone,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Obtener historial de mensajes
 * @param {Object} options - Opciones de filtro
 * @param {number} options.limit - Limite de resultados
 * @param {string} options.to - Filtrar por destinatario
 */
const getMessageHistory = async (options = {}) => {
  if (!checkEnabled()) {
    throw new Error('Twilio is not configured');
  }

  const { limit = 20, to } = options;

  try {
    const filters = { limit };
    if (to) {
      filters.to = formatPhoneNumber(to);
    }

    const messages = await twilioClient.messages.list(filters);

    return messages.map(msg => ({
      sid: msg.sid,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      status: msg.status,
      direction: msg.direction,
      dateCreated: msg.dateCreated,
      dateSent: msg.dateSent,
      price: msg.price,
      priceUnit: msg.priceUnit
    }));
  } catch (error) {
    logger.error('Failed to get message history', { error: error.message });
    throw error;
  }
};

/**
 * Obtener balance de cuenta
 */
const getAccountBalance = async () => {
  if (!checkEnabled()) {
    throw new Error('Twilio is not configured');
  }

  try {
    const balance = await twilioClient.balance.fetch();
    return {
      balance: balance.balance,
      currency: balance.currency
    };
  } catch (error) {
    logger.error('Failed to get account balance', { error: error.message });
    throw error;
  }
};

// Intentar inicializar al cargar el modulo
initialize();

module.exports = {
  initialize,
  isEnabled: checkEnabled,
  getPhoneNumber,
  formatPhoneNumber,
  sendSMS,
  sendBulkSMS,
  getMessageHistory,
  getAccountBalance,
  client: () => twilioClient
};
