/**
 * ============================================================
 * ALMANIK PMS - WhatsApp Module (Evolution API)
 * ============================================================
 * @version 1.1.0
 * @date 2025-11-29
 * @dev DEV4-04, DEV4-05, DEV4-07
 *
 * Endpoints para WhatsApp via Evolution API.
 * Incluye Bot Básico para respuestas automáticas.
 *
 * Endpoints:
 * - GET  /api/whatsapp/status - Estado de conexion
 * - GET  /api/whatsapp/qr - Obtener QR para conectar
 * - POST /api/whatsapp/send - Enviar mensaje
 * - POST /api/whatsapp/send-template - Enviar mensaje con template
 * - POST /api/whatsapp/webhook - Recibir mensajes entrantes (con bot)
 * - GET  /api/whatsapp/check/:number - Verificar si numero tiene WhatsApp
 * - GET  /api/whatsapp/bot/config - Configuración del bot
 * - PUT  /api/whatsapp/bot/config - Actualizar configuración del bot
 */

const express = require('express');
const router = express.Router();
const whatsapp = require('../config/whatsapp');
const logger = require('../config/logger');

// ============================================================
// CONFIGURACIÓN DEL BOT
// ============================================================

// Configuración por defecto del bot (puede ser sobrescrita desde DB)
let botConfig = {
  enabled: true,
  hostalName: process.env.HOSTAL_NAME || 'Almanik Hostel',
  wifiPassword: process.env.WIFI_PASSWORD || 'AlmanikGuest2024',
  wifiNetwork: process.env.WIFI_NETWORK || 'Almanik-Guest',
  checkInTime: '2:00 PM',
  checkOutTime: '11:00 AM',
  receptionPhone: process.env.RECEPTION_PHONE || '+573001234567',
  address: process.env.HOSTAL_ADDRESS || 'Calle Principal #123, Ciudad',
  welcomeKeywords: ['hola', 'hello', 'hi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'menu', 'inicio', 'start'],
  helpKeywords: ['ayuda', 'help', '?', 'opciones', 'commands', 'comandos']
};

// Estado de conversación por usuario (en memoria, se puede mover a Redis para producción)
const conversationState = new Map();

// Middleware para verificar que WhatsApp esta configurado
function requireWhatsApp(req, res, next) {
  if (!whatsapp.isEnabled()) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp not configured',
      message: 'Evolution API is not configured. Set EVOLUTION_API_URL and EVOLUTION_API_KEY in environment.'
    });
  }
  next();
}

/**
 * GET /api/whatsapp/status
 * Obtener estado de conexion de WhatsApp
 */
router.get('/status', requireWhatsApp, async (req, res) => {
  try {
    const status = await whatsapp.getInstanceStatus();

    res.json({
      success: true,
      data: {
        instance: whatsapp.getInstance(),
        ...status
      }
    });
  } catch (error) {
    logger.error('Failed to get WhatsApp status', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/qr
 * Obtener QR code para conectar WhatsApp
 */
router.get('/qr', requireWhatsApp, async (req, res) => {
  try {
    const qrData = await whatsapp.getQRCode();

    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    logger.error('Failed to get WhatsApp QR', { error: error.message });

    // Si la instancia no existe, intentar crearla
    if (error.message.includes('not found') || error.message.includes('404')) {
      try {
        await whatsapp.createInstance();
        const qrData = await whatsapp.getQRCode();

        return res.json({
          success: true,
          data: qrData,
          message: 'Instance created'
        });
      } catch (createError) {
        return res.status(500).json({
          success: false,
          error: createError.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/disconnect
 * Desconectar WhatsApp
 */
router.post('/disconnect', requireWhatsApp, async (req, res) => {
  try {
    await whatsapp.disconnect();

    res.json({
      success: true,
      message: 'WhatsApp disconnected'
    });
  } catch (error) {
    logger.error('Failed to disconnect WhatsApp', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/send
 * Enviar mensaje de texto
 *
 * Body:
 * - number: string (numero de telefono)
 * - message: string (mensaje)
 * - type: 'text' | 'image' | 'document' | 'location' (opcional, default: text)
 * - mediaUrl: string (para image/document)
 * - filename: string (para document)
 * - caption: string (para image/document)
 * - latitude: number (para location)
 * - longitude: number (para location)
 */
router.post('/send', requireWhatsApp, async (req, res) => {
  try {
    const { number, message, type = 'text', mediaUrl, filename, caption, latitude, longitude, name, address } = req.body;

    if (!number) {
      return res.status(400).json({
        success: false,
        error: 'Number is required'
      });
    }

    let result;

    switch (type) {
      case 'image':
        if (!mediaUrl) {
          return res.status(400).json({
            success: false,
            error: 'mediaUrl is required for image type'
          });
        }
        result = await whatsapp.sendImage(number, mediaUrl, caption || '');
        break;

      case 'document':
        if (!mediaUrl || !filename) {
          return res.status(400).json({
            success: false,
            error: 'mediaUrl and filename are required for document type'
          });
        }
        result = await whatsapp.sendDocument(number, mediaUrl, filename, caption || '');
        break;

      case 'audio':
        if (!mediaUrl) {
          return res.status(400).json({
            success: false,
            error: 'mediaUrl is required for audio type'
          });
        }
        result = await whatsapp.sendAudio(number, mediaUrl);
        break;

      case 'location':
        if (!latitude || !longitude) {
          return res.status(400).json({
            success: false,
            error: 'latitude and longitude are required for location type'
          });
        }
        result = await whatsapp.sendLocation(number, latitude, longitude, name || '', address || '');
        break;

      case 'text':
      default:
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'Message is required for text type'
          });
        }
        result = await whatsapp.sendTextMessage(number, message);
        break;
    }

    // Guardar en log de mensajes
    const db = req.db;
    if (db) {
      try {
        await db.run(`
          INSERT INTO whatsapp_messages (number, message_type, content, direction, message_id, status, created_at)
          VALUES (?, ?, ?, 'outgoing', ?, 'sent', datetime('now'))
        `, [number, type, message || mediaUrl, result.key?.id]);
      } catch (dbError) {
        // Tabla puede no existir, ignorar
        logger.debug('Could not log WhatsApp message', { error: dbError.message });
      }
    }

    res.json({
      success: true,
      data: {
        messageId: result.key?.id,
        to: number,
        type: type
      }
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp message', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/send-template
 * Enviar mensaje usando template predefinido
 *
 * Body:
 * - number: string
 * - template: string (nombre del template)
 * - params: object (parametros del template)
 */
router.post('/send-template', requireWhatsApp, async (req, res) => {
  try {
    const { number, template, params = {} } = req.body;

    if (!number || !template) {
      return res.status(400).json({
        success: false,
        error: 'Number and template are required'
      });
    }

    // Obtener funcion de template
    const templateFn = whatsapp.templates[template];

    if (!templateFn) {
      return res.status(400).json({
        success: false,
        error: `Template '${template}' not found`,
        availableTemplates: Object.keys(whatsapp.templates)
      });
    }

    // Generar mensaje desde template
    let message;
    try {
      // Los templates esperan parametros en orden especifico
      switch (template) {
        case 'bookingConfirmation':
          message = templateFn(params.guestName, params.checkIn, params.checkOut, params.confirmationCode);
          break;
        case 'checkInReminder':
          message = templateFn(params.guestName, params.checkIn);
          break;
        case 'reviewRequest':
          message = templateFn(params.guestName, params.reviewLink);
          break;
        case 'paymentConfirmation':
          message = templateFn(params.guestName, params.amount, params.paymentMethod);
          break;
        case 'checkOutReminder':
          message = templateFn(params.guestName, params.checkOut);
          break;
        default:
          message = templateFn(...Object.values(params));
      }
    } catch (templateError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template parameters',
        message: templateError.message
      });
    }

    // Enviar mensaje
    const result = await whatsapp.sendTextMessage(number, message);

    res.json({
      success: true,
      data: {
        messageId: result.key?.id,
        to: number,
        template: template,
        message: message
      }
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp template', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/send-buttons
 * Enviar mensaje con botones
 *
 * Body:
 * - number: string
 * - title: string
 * - description: string
 * - buttons: Array<{buttonId: string, buttonText: string}>
 */
router.post('/send-buttons', requireWhatsApp, async (req, res) => {
  try {
    const { number, title, description, buttons } = req.body;

    if (!number || !title || !description || !buttons || !buttons.length) {
      return res.status(400).json({
        success: false,
        error: 'Number, title, description, and buttons are required'
      });
    }

    const result = await whatsapp.sendButtons(number, title, description, buttons);

    res.json({
      success: true,
      data: {
        messageId: result.key?.id,
        to: number
      }
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp buttons', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/check/:number
 * Verificar si un numero tiene WhatsApp
 */
router.get('/check/:number', requireWhatsApp, async (req, res) => {
  try {
    const { number } = req.params;

    const result = await whatsapp.checkNumber(number);

    res.json({
      success: true,
      data: {
        number: number,
        hasWhatsApp: result.exists || false,
        jid: result.jid
      }
    });
  } catch (error) {
    logger.error('Failed to check WhatsApp number', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/profile/:number
 * Obtener foto de perfil de un numero
 */
router.get('/profile/:number', requireWhatsApp, async (req, res) => {
  try {
    const { number } = req.params;

    const result = await whatsapp.getProfilePicture(number);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get WhatsApp profile', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/webhook
 * Recibir mensajes entrantes de Evolution API
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    logger.info('WhatsApp webhook received', {
      event: event.event,
      instance: event.instance
    });

    // Verificar que es nuestra instancia
    if (event.instance !== whatsapp.getInstance()) {
      return res.status(200).json({ received: true });
    }

    // Procesar segun tipo de evento
    switch (event.event) {
      case 'messages.upsert':
        await handleIncomingMessage(req.db, event.data);
        break;

      case 'messages.update':
        await handleMessageUpdate(req.db, event.data);
        break;

      case 'connection.update':
        logger.info('WhatsApp connection update', event.data);
        break;

      default:
        logger.debug('Unhandled WhatsApp event', { event: event.event });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('WhatsApp webhook error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Procesar mensaje entrante con Bot
 */
async function handleIncomingMessage(db, data) {
  if (!data || !data.key) return;

  const message = {
    id: data.key.id,
    from: data.key.remoteJid?.replace('@s.whatsapp.net', ''),
    fromMe: data.key.fromMe,
    timestamp: data.messageTimestamp,
    type: Object.keys(data.message || {})[0] || 'unknown',
    content: extractMessageContent(data.message)
  };

  // Ignorar mensajes propios
  if (message.fromMe) return;

  logger.info('Incoming WhatsApp message', {
    from: message.from,
    type: message.type,
    content: message.content?.substring(0, 50)
  });

  // Guardar en base de datos si existe
  if (db) {
    try {
      await db.run(`
        INSERT INTO whatsapp_messages (number, message_type, content, direction, message_id, status, created_at)
        VALUES (?, ?, ?, 'incoming', ?, 'received', datetime('now'))
      `, [message.from, message.type, message.content, message.id]);
    } catch (dbError) {
      logger.debug('Could not save incoming message', { error: dbError.message });
    }
  }

  // Procesar con el bot si está habilitado
  if (botConfig.enabled && whatsapp.isEnabled()) {
    await processBotMessage(db, message);
  }
}

// ============================================================
// LÓGICA DEL BOT
// ============================================================

/**
 * Procesar mensaje con el bot
 */
async function processBotMessage(db, message) {
  const { from, content } = message;
  const text = (content || '').toLowerCase().trim();

  try {
    // Verificar si el usuario tiene opt-out
    if (db) {
      const guest = await db.get(`
        SELECT whatsapp_opt_out FROM guests WHERE phone = ? OR phone LIKE ?
      `, [from, `%${from.slice(-10)}`]);

      if (guest?.whatsapp_opt_out) {
        logger.debug('Guest has opted out of WhatsApp bot', { from });
        return;
      }
    }

    // Determinar tipo de respuesta
    let response = null;

    // Saludo o inicio -> Menú principal
    if (botConfig.welcomeKeywords.some(kw => text.includes(kw))) {
      response = await getBotMenuResponse(db, from);
    }
    // Opción 1 -> Ver reserva
    else if (text === '1' || text.includes('reserva') || text.includes('booking')) {
      response = await getReservationResponse(db, from);
    }
    // Opción 2 -> WiFi
    else if (text === '2' || text.includes('wifi') || text.includes('internet')) {
      response = getWifiResponse();
    }
    // Opción 3 -> Hablar con recepción
    else if (text === '3' || text.includes('recepcion') || text.includes('reception') || text.includes('ayuda humana')) {
      response = getReceptionResponse();
    }
    // Opción 4 -> Información del hostal
    else if (text === '4' || text.includes('info') || text.includes('direccion') || text.includes('horarios')) {
      response = getHostalInfoResponse();
    }
    // Ayuda
    else if (botConfig.helpKeywords.some(kw => text === kw || text.includes(kw))) {
      response = getHelpResponse();
    }
    // Opt-out
    else if (text.includes('stop') || text.includes('parar') || text.includes('no mas')) {
      response = await handleOptOut(db, from);
    }
    // Fallback - no entendido
    else if (text.length > 0 && text.length < 200) {
      response = getFallbackResponse();
    }

    // Enviar respuesta si existe
    if (response) {
      await whatsapp.sendTextMessage(from, response);

      // Guardar respuesta del bot en DB
      if (db) {
        try {
          await db.run(`
            INSERT INTO whatsapp_messages (number, message_type, content, direction, message_id, status, created_at)
            VALUES (?, 'text', ?, 'outgoing', ?, 'sent', datetime('now'))
          `, [from, response, `bot_${Date.now()}`]);
        } catch (dbError) {
          logger.debug('Could not save bot response', { error: dbError.message });
        }
      }

      logger.info('Bot response sent', { to: from });
    }
  } catch (error) {
    logger.error('Bot processing error', { error: error.message, from });
  }
}

/**
 * Respuesta: Menú principal
 */
async function getBotMenuResponse(db, phoneNumber) {
  // Intentar obtener nombre del huésped
  let guestName = '';
  if (db) {
    try {
      const guest = await db.get(`
        SELECT name FROM guests WHERE phone = ? OR phone LIKE ?
      `, [phoneNumber, `%${phoneNumber.slice(-10)}`]);
      if (guest?.name) {
        guestName = guest.name.split(' ')[0]; // Solo primer nombre
      }
    } catch (err) {
      logger.debug('Could not fetch guest name', { error: err.message });
    }
  }

  const greeting = guestName ? `Hola ${guestName}! 👋` : 'Hola! 👋';

  return `${greeting}\n\n` +
    `Soy el asistente virtual de *${botConfig.hostalName}*.\n\n` +
    `Escribe el número de la opción que necesitas:\n\n` +
    `*1* 📋 Ver mi reserva\n` +
    `*2* 📶 Obtener WiFi\n` +
    `*3* 🛎️ Hablar con recepción\n` +
    `*4* ℹ️ Info del hostal\n\n` +
    `_Escribe AYUDA para ver más opciones_`;
}

/**
 * Respuesta: Información de reserva
 */
async function getReservationResponse(db, phoneNumber) {
  if (!db) {
    return `No puedo acceder a la información de reservas en este momento.\n\n` +
      `Por favor contacta a recepción:\n📞 ${botConfig.receptionPhone}`;
  }

  try {
    // Buscar reserva activa o próxima por número de teléfono
    const booking = await db.get(`
      SELECT b.id, b.confirmation_code, b.check_in, b.check_out, b.status, b.total_price,
             g.name as guest_name,
             bed.name as bed_name, r.name as room_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      LEFT JOIN beds bed ON b.bed_id = bed.id
      LEFT JOIN rooms r ON bed.room_id = r.id
      WHERE (g.phone = ? OR g.phone LIKE ?)
        AND b.status IN ('confirmed', 'checked_in', 'pending')
      ORDER BY b.check_in ASC
      LIMIT 1
    `, [phoneNumber, `%${phoneNumber.slice(-10)}`]);

    if (!booking) {
      return `No encontré ninguna reserva activa asociada a este número.\n\n` +
        `Si tienes una reserva, puede estar registrada con otro teléfono.\n\n` +
        `Contacta a recepción para más información:\n📞 ${botConfig.receptionPhone}`;
    }

    const statusEmoji = {
      pending: '⏳',
      confirmed: '✅',
      checked_in: '🏨'
    };

    const statusText = {
      pending: 'Pendiente de confirmación',
      confirmed: 'Confirmada',
      checked_in: 'Checked-in (estás aquí!)'
    };

    return `📋 *Tu Reserva*\n\n` +
      `👤 ${booking.guest_name}\n` +
      `🔑 Código: *${booking.confirmation_code || 'ALM-' + booking.id}*\n\n` +
      `📅 Check-in: ${formatDate(booking.check_in)}\n` +
      `📅 Check-out: ${formatDate(booking.check_out)}\n` +
      `🛏️ ${booking.bed_name || 'Cama asignada al check-in'}${booking.room_name ? ` - ${booking.room_name}` : ''}\n\n` +
      `${statusEmoji[booking.status] || '📌'} Estado: ${statusText[booking.status] || booking.status}\n` +
      (booking.total_price ? `💰 Total: $${Number(booking.total_price).toLocaleString()}\n` : '') +
      `\n⏰ Check-in: ${botConfig.checkInTime}\n` +
      `⏰ Check-out: ${botConfig.checkOutTime}`;

  } catch (error) {
    logger.error('Error fetching reservation for bot', { error: error.message });
    return `Hubo un error al buscar tu reserva.\n\n` +
      `Por favor contacta a recepción:\n📞 ${botConfig.receptionPhone}`;
  }
}

/**
 * Respuesta: WiFi
 */
function getWifiResponse() {
  return `📶 *Datos de WiFi*\n\n` +
    `🌐 Red: *${botConfig.wifiNetwork}*\n` +
    `🔐 Contraseña: *${botConfig.wifiPassword}*\n\n` +
    `_Si tienes problemas de conexión, acércate a recepción._`;
}

/**
 * Respuesta: Recepción
 */
function getReceptionResponse() {
  return `🛎️ *Contacto de Recepción*\n\n` +
    `Puedes contactar a nuestro equipo:\n\n` +
    `📞 Teléfono: ${botConfig.receptionPhone}\n` +
    `📍 En persona: Recepción en planta baja\n\n` +
    `⏰ Horario: 24/7\n\n` +
    `_Un miembro de nuestro equipo te atenderá pronto._`;
}

/**
 * Respuesta: Info del hostal
 */
function getHostalInfoResponse() {
  return `ℹ️ *${botConfig.hostalName}*\n\n` +
    `📍 *Dirección:*\n${botConfig.address}\n\n` +
    `⏰ *Horarios:*\n` +
    `• Check-in: ${botConfig.checkInTime}\n` +
    `• Check-out: ${botConfig.checkOutTime}\n\n` +
    `📞 *Contacto:*\n${botConfig.receptionPhone}\n\n` +
    `🌐 *WiFi:*\n` +
    `Red: ${botConfig.wifiNetwork}\n` +
    `Clave: ${botConfig.wifiPassword}`;
}

/**
 * Respuesta: Ayuda
 */
function getHelpResponse() {
  return `❓ *Ayuda*\n\n` +
    `Comandos disponibles:\n\n` +
    `*1* o *reserva* - Ver tu reserva\n` +
    `*2* o *wifi* - Datos de WiFi\n` +
    `*3* o *recepción* - Contactar recepción\n` +
    `*4* o *info* - Info del hostal\n\n` +
    `*hola* o *menú* - Ver menú principal\n` +
    `*stop* - Dejar de recibir mensajes\n\n` +
    `_Para hablar con una persona, escribe 3_`;
}

/**
 * Respuesta: Fallback (no entendido)
 */
function getFallbackResponse() {
  return `🤔 No entendí tu mensaje.\n\n` +
    `Escribe *HOLA* para ver el menú de opciones\n` +
    `o *AYUDA* para ver comandos disponibles.\n\n` +
    `Para hablar con una persona, escribe *3*`;
}

/**
 * Manejar opt-out
 */
async function handleOptOut(db, phoneNumber) {
  if (db) {
    try {
      await db.run(`
        UPDATE guests SET whatsapp_opt_out = 1
        WHERE phone = ? OR phone LIKE ?
      `, [phoneNumber, `%${phoneNumber.slice(-10)}`]);
    } catch (err) {
      logger.debug('Could not update opt-out', { error: err.message });
    }
  }

  return `✅ Has sido removido de los mensajes automáticos.\n\n` +
    `No recibirás más mensajes de nuestro bot.\n\n` +
    `Si cambias de opinión, escribe *ACTIVAR* o contacta a recepción.`;
}

/**
 * Formatear fecha para mostrar
 */
function formatDate(dateStr) {
  if (!dateStr) return 'No definida';
  try {
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('es-ES', options);
  } catch {
    return dateStr;
  }
}

/**
 * Procesar actualizacion de estado de mensaje
 */
async function handleMessageUpdate(db, data) {
  if (!data || !data.key) return;

  const update = {
    id: data.key.id,
    status: data.update?.status
  };

  logger.debug('WhatsApp message update', update);

  // Actualizar estado en DB si existe
  if (db && update.status) {
    try {
      await db.run(`
        UPDATE whatsapp_messages
        SET status = ?, updated_at = datetime('now')
        WHERE message_id = ?
      `, [update.status, update.id]);
    } catch (dbError) {
      logger.debug('Could not update message status', { error: dbError.message });
    }
  }
}

/**
 * Extraer contenido del mensaje
 */
function extractMessageContent(message) {
  if (!message) return '';

  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;

  return JSON.stringify(message);
}

/**
 * POST /api/whatsapp/configure-webhook
 * Configurar webhook en Evolution API
 */
router.post('/configure-webhook', requireWhatsApp, async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'webhookUrl is required'
      });
    }

    const result = await whatsapp.setWebhook(webhookUrl, [
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
      'CONNECTION_UPDATE'
    ]);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to configure webhook', { error: error.message });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/templates
 * Listar templates disponibles
 */
router.get('/templates', (req, res) => {
  const templates = Object.keys(whatsapp.templates).map(name => ({
    name,
    description: getTemplateDescription(name)
  }));

  res.json({
    success: true,
    data: templates
  });
});

function getTemplateDescription(name) {
  const descriptions = {
    bookingConfirmation: 'Confirmacion de reserva (guestName, checkIn, checkOut, confirmationCode)',
    checkInReminder: 'Recordatorio de check-in (guestName, checkIn)',
    reviewRequest: 'Solicitud de review (guestName, reviewLink)',
    paymentConfirmation: 'Confirmacion de pago (guestName, amount, paymentMethod)',
    checkOutReminder: 'Recordatorio de check-out (guestName, checkOut)'
  };
  return descriptions[name] || name;
}

// ============================================================
// ENDPOINTS DEL BOT
// ============================================================

/**
 * GET /api/whatsapp/bot/config
 * Obtener configuración del bot
 */
router.get('/bot/config', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: botConfig.enabled,
      hostalName: botConfig.hostalName,
      wifiNetwork: botConfig.wifiNetwork,
      wifiPassword: botConfig.wifiPassword,
      checkInTime: botConfig.checkInTime,
      checkOutTime: botConfig.checkOutTime,
      receptionPhone: botConfig.receptionPhone,
      address: botConfig.address,
      welcomeKeywords: botConfig.welcomeKeywords,
      helpKeywords: botConfig.helpKeywords
    }
  });
});

/**
 * PUT /api/whatsapp/bot/config
 * Actualizar configuración del bot
 *
 * Body: cualquier propiedad de botConfig
 */
router.put('/bot/config', (req, res) => {
  try {
    const allowedFields = [
      'enabled', 'hostalName', 'wifiNetwork', 'wifiPassword',
      'checkInTime', 'checkOutTime', 'receptionPhone', 'address',
      'welcomeKeywords', 'helpKeywords'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        botConfig[field] = req.body[field];
        updates[field] = req.body[field];
      }
    }

    logger.info('Bot config updated', { updates: Object.keys(updates) });

    res.json({
      success: true,
      message: 'Bot configuration updated',
      data: botConfig
    });
  } catch (error) {
    logger.error('Failed to update bot config', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/bot/test
 * Enviar mensaje de prueba del bot (simula recepción de mensaje)
 *
 * Body:
 * - number: string (número para responder)
 * - message: string (mensaje a simular)
 */
router.post('/bot/test', requireWhatsApp, async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: 'number and message are required'
      });
    }

    // Simular mensaje entrante
    const simulatedMessage = {
      from: number.replace(/\D/g, ''),
      content: message,
      fromMe: false
    };

    // Procesar con el bot
    await processBotMessage(req.db, simulatedMessage);

    res.json({
      success: true,
      message: 'Bot test message processed',
      data: {
        simulatedFrom: simulatedMessage.from,
        simulatedMessage: message
      }
    });
  } catch (error) {
    logger.error('Bot test failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/bot/stats
 * Obtener estadísticas del bot
 */
router.get('/bot/stats', async (req, res) => {
  try {
    const db = req.db;

    if (!db) {
      return res.json({
        success: true,
        data: {
          enabled: botConfig.enabled,
          messagesProcessed: 0,
          note: 'Database not available for stats'
        }
      });
    }

    // Obtener estadísticas de mensajes
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_messages,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing,
        SUM(CASE WHEN message_id LIKE 'bot_%' THEN 1 ELSE 0 END) as bot_responses
      FROM whatsapp_messages
      WHERE created_at >= datetime('now', '-7 days')
    `);

    // Mensajes por día (últimos 7 días)
    const dailyStats = await db.all(`
      SELECT
        date(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
      FROM whatsapp_messages
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        enabled: botConfig.enabled,
        last7Days: {
          totalMessages: stats?.total_messages || 0,
          incoming: stats?.incoming || 0,
          outgoing: stats?.outgoing || 0,
          botResponses: stats?.bot_responses || 0
        },
        dailyBreakdown: dailyStats || []
      }
    });
  } catch (error) {
    logger.error('Failed to get bot stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/bot/toggle
 * Activar/desactivar el bot
 */
router.post('/bot/toggle', (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled === 'boolean') {
    botConfig.enabled = enabled;
  } else {
    botConfig.enabled = !botConfig.enabled;
  }

  logger.info('Bot toggled', { enabled: botConfig.enabled });

  res.json({
    success: true,
    data: {
      enabled: botConfig.enabled
    }
  });
});

/**
 * GET /api/whatsapp/conversations
 * Listar conversaciones recientes
 */
router.get('/conversations', async (req, res) => {
  try {
    const db = req.db;

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    const limit = parseInt(req.query.limit) || 20;

    // Obtener conversaciones únicas con último mensaje
    const conversations = await db.all(`
      SELECT
        wm.number,
        wm.content as last_message,
        wm.direction as last_direction,
        wm.created_at as last_message_at,
        g.name as guest_name,
        g.id as guest_id,
        (SELECT COUNT(*) FROM whatsapp_messages WHERE number = wm.number) as message_count
      FROM whatsapp_messages wm
      LEFT JOIN guests g ON (g.phone = wm.number OR g.phone LIKE '%' || substr(wm.number, -10))
      WHERE wm.id IN (
        SELECT MAX(id) FROM whatsapp_messages GROUP BY number
      )
      ORDER BY wm.created_at DESC
      LIMIT ?
    `, [limit]);

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    logger.error('Failed to get conversations', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/conversations/:number
 * Obtener historial de conversación con un número
 */
router.get('/conversations/:number', async (req, res) => {
  try {
    const db = req.db;
    const { number } = req.params;

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    const cleanNumber = number.replace(/\D/g, '');
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Obtener mensajes de la conversación
    const messages = await db.all(`
      SELECT id, number, message_type, content, direction, status, created_at
      FROM whatsapp_messages
      WHERE number = ? OR number LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [cleanNumber, `%${cleanNumber.slice(-10)}`, limit, offset]);

    // Obtener info del guest si existe
    const guest = await db.get(`
      SELECT id, name, email, phone
      FROM guests
      WHERE phone = ? OR phone LIKE ?
    `, [cleanNumber, `%${cleanNumber.slice(-10)}`]);

    res.json({
      success: true,
      data: {
        number: cleanNumber,
        guest: guest || null,
        messages: messages.reverse(), // Ordenar cronológicamente
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    logger.error('Failed to get conversation', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/conversations/:number/assign
 * Asignar conversación a un miembro del staff
 */
router.post('/conversations/:number/assign', async (req, res) => {
  try {
    const db = req.db;
    const { number } = req.params;
    const { assignTo, staffId } = req.body;

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    const cleanNumber = number.replace(/\D/g, '');

    // Verificar si existe tabla de asignaciones, si no, usar activity_log
    try {
      await db.run(`
        INSERT INTO activity_log (action, entity_type, entity_id, description, user_id, ip_address, created_at)
        VALUES ('assign', 'whatsapp_conversation', ?, ?, ?, ?, datetime('now'))
      `, [cleanNumber, `Conversación asignada a: ${assignTo || 'nadie'}`, staffId || null, req.ip]);
    } catch (dbError) {
      logger.debug('Could not log assignment', { error: dbError.message });
    }

    logger.info('Conversation assigned', { number: cleanNumber, assignTo });

    res.json({
      success: true,
      message: 'Conversation assigned',
      data: {
        number: cleanNumber,
        assignedTo: assignTo
      }
    });
  } catch (error) {
    logger.error('Failed to assign conversation', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/conversations/:number/read
 * Marcar conversación como leída
 */
router.post('/conversations/:number/read', async (req, res) => {
  try {
    const db = req.db;
    const { number } = req.params;

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    const cleanNumber = number.replace(/\D/g, '');

    // Actualizar estado de mensajes
    await db.run(`
      UPDATE whatsapp_messages
      SET status = 'read', updated_at = datetime('now')
      WHERE (number = ? OR number LIKE ?)
        AND direction = 'incoming'
        AND status != 'read'
    `, [cleanNumber, `%${cleanNumber.slice(-10)}`]);

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error) {
    logger.error('Failed to mark as read', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/reply
 * Enviar respuesta manual (sin activar bot)
 */
router.post('/reply', requireWhatsApp, async (req, res) => {
  try {
    const { number, message, staffId, staffName } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: 'Number and message are required'
      });
    }

    // Enviar mensaje
    const result = await whatsapp.sendTextMessage(number, message);

    // Guardar en DB con referencia al staff
    const db = req.db;
    if (db) {
      try {
        await db.run(`
          INSERT INTO whatsapp_messages (number, message_type, content, direction, message_id, status, created_at)
          VALUES (?, 'text', ?, 'outgoing', ?, 'sent', datetime('now'))
        `, [number.replace(/\D/g, ''), message, result.key?.id || `staff_${Date.now()}`]);

        // Log de actividad
        await db.run(`
          INSERT INTO activity_log (action, entity_type, entity_id, description, user_id, created_at)
          VALUES ('whatsapp_reply', 'whatsapp_conversation', ?, ?, ?, datetime('now'))
        `, [number.replace(/\D/g, ''), `Respuesta manual: ${message.substring(0, 50)}...`, staffId || null]);
      } catch (dbError) {
        logger.debug('Could not save staff reply', { error: dbError.message });
      }
    }

    logger.info('Staff reply sent', { to: number, by: staffName || 'unknown' });

    res.json({
      success: true,
      data: {
        messageId: result.key?.id,
        to: number
      }
    });
  } catch (error) {
    logger.error('Failed to send reply', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/unread-count
 * Obtener conteo de mensajes sin leer
 */
router.get('/unread-count', async (req, res) => {
  try {
    const db = req.db;

    if (!db) {
      return res.json({
        success: true,
        data: { count: 0 }
      });
    }

    const result = await db.get(`
      SELECT COUNT(DISTINCT number) as count
      FROM whatsapp_messages
      WHERE direction = 'incoming'
        AND (status IS NULL OR status != 'read')
        AND created_at >= datetime('now', '-24 hours')
    `);

    res.json({
      success: true,
      data: {
        count: result?.count || 0
      }
    });
  } catch (error) {
    logger.error('Failed to get unread count', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
