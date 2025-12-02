/**
 * ============================================================
 * ALMANIK PMS - Evolution API Configuration (WhatsApp)
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @dev DEV4-04
 *
 * Configuracion de Evolution API para WhatsApp.
 * Evolution API es una solucion self-hosted para WhatsApp.
 *
 * Documentacion: https://doc.evolution-api.com
 *
 * Variables de entorno requeridas:
 * - EVOLUTION_API_URL: URL de tu instancia Evolution API
 * - EVOLUTION_API_KEY: API Key global de Evolution
 * - EVOLUTION_INSTANCE: Nombre de la instancia de WhatsApp
 *
 * Uso:
 * const whatsapp = require('./config/whatsapp');
 * if (whatsapp.isEnabled()) {
 *   await whatsapp.sendMessage('+573001234567', 'Hola!');
 * }
 */

const logger = require('./logger');

// Variables de entorno
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'almanik';

// Limpiar URL (quitar trailing slash)
const BASE_URL = EVOLUTION_API_URL.replace(/\/$/, '');

// Estado de configuracion
let evolutionEnabled = false;

if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
  evolutionEnabled = true;
  logger.info('Evolution API initialized', {
    url: BASE_URL,
    instance: EVOLUTION_INSTANCE
  });
} else {
  logger.warn('Evolution API not configured - EVOLUTION_API_URL or EVOLUTION_API_KEY not found');
}

/**
 * Hacer request a Evolution API
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || result.error || 'Evolution API error');
  }

  return result;
}

/**
 * Verificar estado de la instancia
 */
async function getInstanceStatus() {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  try {
    const result = await apiRequest(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
    return result;
  } catch (error) {
    logger.error('Failed to get instance status', { error: error.message });
    throw error;
  }
}

/**
 * Crear nueva instancia si no existe
 */
async function createInstance(instanceName = EVOLUTION_INSTANCE) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const result = await apiRequest('/instance/create', 'POST', {
    instanceName: instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS'
  });

  logger.info('Evolution instance created', { instance: instanceName });
  return result;
}

/**
 * Obtener QR Code para conectar WhatsApp
 */
async function getQRCode() {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const result = await apiRequest(`/instance/connect/${EVOLUTION_INSTANCE}`);
  return result;
}

/**
 * Desconectar instancia
 */
async function disconnect() {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const result = await apiRequest(`/instance/logout/${EVOLUTION_INSTANCE}`, 'DELETE');
  logger.info('Evolution instance disconnected');
  return result;
}

/**
 * Enviar mensaje de texto
 * @param {string} to - Numero de telefono (formato: 573001234567 o +573001234567)
 * @param {string} message - Mensaje a enviar
 */
async function sendTextMessage(to, message) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  // Limpiar numero (solo digitos)
  const cleanNumber = to.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendText/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    text: message
  });

  logger.info('WhatsApp message sent via Evolution', {
    to: cleanNumber,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Enviar imagen
 * @param {string} to - Numero de telefono
 * @param {string} imageUrl - URL de la imagen
 * @param {string} caption - Descripcion opcional
 */
async function sendImage(to, imageUrl, caption = '') {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = to.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendMedia/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    mediatype: 'image',
    media: imageUrl,
    caption: caption
  });

  logger.info('WhatsApp image sent via Evolution', {
    to: cleanNumber,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Enviar documento
 * @param {string} to - Numero de telefono
 * @param {string} documentUrl - URL del documento
 * @param {string} filename - Nombre del archivo
 * @param {string} caption - Descripcion opcional
 */
async function sendDocument(to, documentUrl, filename, caption = '') {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = to.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendMedia/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    mediatype: 'document',
    media: documentUrl,
    fileName: filename,
    caption: caption
  });

  logger.info('WhatsApp document sent via Evolution', {
    to: cleanNumber,
    filename,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Enviar audio
 * @param {string} to - Numero de telefono
 * @param {string} audioUrl - URL del audio
 */
async function sendAudio(to, audioUrl) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = to.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendMedia/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    mediatype: 'audio',
    media: audioUrl
  });

  logger.info('WhatsApp audio sent via Evolution', {
    to: cleanNumber,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Enviar ubicacion
 * @param {string} to - Numero de telefono
 * @param {number} latitude - Latitud
 * @param {number} longitude - Longitud
 * @param {string} name - Nombre del lugar
 * @param {string} address - Direccion
 */
async function sendLocation(to, latitude, longitude, name = '', address = '') {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = to.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendLocation/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    latitude: latitude,
    longitude: longitude,
    name: name,
    address: address
  });

  logger.info('WhatsApp location sent via Evolution', {
    to: cleanNumber,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Enviar contacto
 * @param {string} to - Numero de telefono
 * @param {string} contactName - Nombre del contacto
 * @param {string} contactNumber - Numero del contacto
 */
async function sendContact(to, contactName, contactNumber) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = to.replace(/\D/g, '');
  const cleanContactNumber = contactNumber.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendContact/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    contact: [{
      fullName: contactName,
      wuid: cleanContactNumber,
      phoneNumber: cleanContactNumber
    }]
  });

  logger.info('WhatsApp contact sent via Evolution', {
    to: cleanNumber,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Enviar mensaje con botones (lista)
 * @param {string} to - Numero de telefono
 * @param {string} title - Titulo
 * @param {string} description - Descripcion
 * @param {string} buttonText - Texto del boton
 * @param {Array<{title: string, rows: Array<{title: string, description: string, rowId: string}>}>} sections
 */
async function sendList(to, title, description, buttonText, sections) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = to.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendList/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    title: title,
    description: description,
    buttonText: buttonText,
    sections: sections
  });

  logger.info('WhatsApp list sent via Evolution', {
    to: cleanNumber,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Enviar botones de respuesta rapida
 * @param {string} to - Numero de telefono
 * @param {string} title - Titulo
 * @param {string} description - Descripcion
 * @param {Array<{buttonId: string, buttonText: string}>} buttons - Max 3 botones
 */
async function sendButtons(to, title, description, buttons) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = to.replace(/\D/g, '');

  const result = await apiRequest(`/message/sendButtons/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber,
    title: title,
    description: description,
    buttons: buttons.slice(0, 3)
  });

  logger.info('WhatsApp buttons sent via Evolution', {
    to: cleanNumber,
    messageId: result.key?.id
  });

  return result;
}

/**
 * Verificar si un numero tiene WhatsApp
 * @param {string} number - Numero a verificar
 */
async function checkNumber(number) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = number.replace(/\D/g, '');

  const result = await apiRequest(`/chat/whatsappNumbers/${EVOLUTION_INSTANCE}`, 'POST', {
    numbers: [cleanNumber]
  });

  return result[0] || { exists: false, jid: null };
}

/**
 * Obtener foto de perfil de un numero
 * @param {string} number - Numero
 */
async function getProfilePicture(number) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const cleanNumber = number.replace(/\D/g, '');

  const result = await apiRequest(`/chat/fetchProfilePictureUrl/${EVOLUTION_INSTANCE}`, 'POST', {
    number: cleanNumber
  });

  return result;
}

/**
 * Configurar webhook para recibir mensajes
 * @param {string} webhookUrl - URL del webhook
 * @param {Array<string>} events - Eventos a escuchar
 */
async function setWebhook(webhookUrl, events = ['MESSAGES_UPSERT']) {
  if (!evolutionEnabled) {
    throw new Error('Evolution API is not configured');
  }

  const result = await apiRequest(`/webhook/set/${EVOLUTION_INSTANCE}`, 'POST', {
    webhook: {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: true,
      events: events
    }
  });

  logger.info('Evolution webhook configured', { url: webhookUrl, events });
  return result;
}

// Templates de mensajes para el hostal
const MESSAGE_TEMPLATES = {
  // Confirmacion de reserva
  bookingConfirmation: (guestName, checkIn, checkOut, confirmationCode) =>
    `🏨 *Reserva Confirmada*\n\n` +
    `Hola ${guestName}!\n\n` +
    `Tu reserva en Almanik Hostel ha sido confirmada.\n\n` +
    `📅 Check-in: ${checkIn}\n` +
    `📅 Check-out: ${checkOut}\n` +
    `🔑 Codigo: ${confirmationCode}\n\n` +
    `Te esperamos!`,

  // Recordatorio de check-in
  checkInReminder: (guestName, checkIn) =>
    `👋 *Recordatorio de Check-in*\n\n` +
    `Hola ${guestName}!\n\n` +
    `Te recordamos que tu check-in es manana ${checkIn}.\n\n` +
    `📍 Direccion: [Direccion del hostal]\n` +
    `⏰ Horario: 2:00 PM - 10:00 PM\n\n` +
    `Si necesitas cambiar la hora, respondenos a este mensaje.`,

  // Solicitud de review
  reviewRequest: (guestName, reviewLink) =>
    `⭐ *Tu opinion nos importa*\n\n` +
    `Hola ${guestName}!\n\n` +
    `Esperamos que hayas disfrutado tu estadia en Almanik Hostel.\n\n` +
    `Nos encantaria conocer tu experiencia. Dejanos tu review aqui:\n` +
    `${reviewLink}\n\n` +
    `Gracias por elegirnos! 🙏`,

  // Comprobante de pago
  paymentConfirmation: (guestName, amount, paymentMethod) =>
    `💳 *Pago Recibido*\n\n` +
    `Hola ${guestName}!\n\n` +
    `Hemos recibido tu pago:\n\n` +
    `💰 Monto: $${amount}\n` +
    `📝 Metodo: ${paymentMethod}\n\n` +
    `Gracias!`,

  // Checkout reminder
  checkOutReminder: (guestName, checkOut) =>
    `🛎️ *Recordatorio de Check-out*\n\n` +
    `Hola ${guestName}!\n\n` +
    `Te recordamos que tu check-out es manana ${checkOut} antes de las 11:00 AM.\n\n` +
    `Si necesitas late checkout, consultanos disponibilidad.\n\n` +
    `Gracias por tu estadia!`
};

// Exportar modulo
module.exports = {
  // Estado
  isEnabled: () => evolutionEnabled,
  getInstance: () => EVOLUTION_INSTANCE,
  getApiUrl: () => BASE_URL,

  // Instancia
  getInstanceStatus,
  createInstance,
  getQRCode,
  disconnect,

  // Mensajes
  sendTextMessage,
  sendImage,
  sendDocument,
  sendAudio,
  sendLocation,
  sendContact,
  sendList,
  sendButtons,

  // Utilidades
  checkNumber,
  getProfilePicture,
  setWebhook,

  // Templates
  templates: MESSAGE_TEMPLATES,

  // Alias cortos
  sendMessage: sendTextMessage,
  send: sendTextMessage
};
