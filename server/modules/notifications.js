/**
 * ============================================================
 * ALMANIK PMS - Push Notifications Module
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @developer DEV2
 *
 * Sistema de Push Notifications usando Web Push Protocol.
 *
 * Endpoints:
 * - GET    /vapid-public-key      - Get VAPID public key for frontend
 * - POST   /subscribe             - Subscribe device to push notifications
 * - DELETE /unsubscribe           - Unsubscribe device
 * - POST   /send                  - Send notification (admin)
 * - POST   /send-to-role          - Send to all users with role (admin)
 * - GET    /subscriptions         - List subscriptions (admin)
 * - POST   /test                  - Send test notification
 */

const express = require('express');
const router = express.Router();
const webpush = require('web-push');

// ============================================================
// CONFIGURATION
// ============================================================

let vapidConfigured = false;

function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@almanik.com';

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      vapidConfigured = true;
      console.log('✅ VAPID configured for push notifications');
    } catch (error) {
      console.warn('⚠️ VAPID configuration failed:', error.message);
      console.warn('   Push notifications disabled. Check your VAPID keys.');
      vapidConfigured = false;
    }
  } else {
    console.warn('⚠️ VAPID keys not configured. Push notifications disabled.');
    console.warn('   Run: npx web-push generate-vapid-keys');
  }
}

// ============================================================
// CONSTANTS
// ============================================================

const NOTIFICATION_TYPES = {
  NEW_RESERVATION: 'new_reservation',
  CHECKIN_REMINDER: 'checkin_reminder',
  CHECKOUT_REMINDER: 'checkout_reminder',
  PAYMENT_RECEIVED: 'payment_received',
  TASK_ASSIGNED: 'task_assigned',
  LOW_INVENTORY: 'low_inventory',
  NEW_REVIEW: 'new_review',
  SYSTEM_ALERT: 'system_alert'
};

const DEFAULT_ICONS = {
  [NOTIFICATION_TYPES.NEW_RESERVATION]: '/icons/icon-192x192.png',
  [NOTIFICATION_TYPES.CHECKIN_REMINDER]: '/icons/icon-192x192.png',
  [NOTIFICATION_TYPES.CHECKOUT_REMINDER]: '/icons/icon-192x192.png',
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: '/icons/icon-192x192.png',
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: '/icons/icon-192x192.png',
  [NOTIFICATION_TYPES.LOW_INVENTORY]: '/icons/icon-192x192.png',
  [NOTIFICATION_TYPES.NEW_REVIEW]: '/icons/icon-192x192.png',
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: '/icons/icon-192x192.png'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDb(req) {
  return req.app.locals.db;
}

function getUserId(req) {
  return req.session?.id || req.user?.id || null;
}

async function logActivity(db, action, entityType, entityId, details, userId) {
  try {
    await db.query(
      `INSERT INTO activity_log (action_type, module, description, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [action, 'notifications', `${action} ${entityType} #${entityId}`, userId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// ============================================================
// TABLE INITIALIZATION
// ============================================================

async function initializeNotificationsTables(db) {
  const isProduction = db.isProduction;

  if (isProduction) {
    // PostgreSQL
    await db.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        endpoint TEXT NOT NULL UNIQUE,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        user_agent TEXT,
        device_type VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_push_active ON push_subscriptions(is_active)`);

    // Notification history
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT,
        data JSONB,
        sent_to_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        sent_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    // SQLite
    await db.run(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        endpoint TEXT NOT NULL UNIQUE,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        user_agent TEXT,
        device_type VARCHAR(50),
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT,
        data TEXT,
        sent_to_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        sent_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  console.log('✅ Notifications tables initialized');
}

// ============================================================
// ROUTES - PUBLIC
// ============================================================

/**
 * GET /vapid-public-key - Get VAPID public key for frontend subscription
 */
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured on server'
    });
  }

  res.json({
    success: true,
    data: { publicKey }
  });
});

// ============================================================
// ROUTES - AUTHENTICATED
// ============================================================

/**
 * POST /subscribe - Subscribe device to push notifications
 */
router.post('/subscribe', async (req, res) => {
  const db = getDb(req);
  const userId = getUserId(req);
  const { subscription, deviceType = 'unknown' } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({
      success: false,
      error: 'Invalid subscription object'
    });
  }

  const { endpoint, keys } = subscription;
  const userAgent = req.headers['user-agent'] || '';

  try {
    // Check if subscription already exists
    const existing = await db.get(
      `SELECT id FROM push_subscriptions WHERE endpoint = $1`,
      [endpoint]
    );

    if (existing) {
      // Update existing subscription
      await db.run(`
        UPDATE push_subscriptions
        SET user_id = $1, keys_p256dh = $2, keys_auth = $3,
            user_agent = $4, device_type = $5, is_active = true,
            last_used_at = CURRENT_TIMESTAMP
        WHERE endpoint = $6
      `, [userId, keys.p256dh, keys.auth, userAgent, deviceType, endpoint]);

      return res.json({
        success: true,
        message: 'Subscription updated',
        data: { id: existing.id }
      });
    }

    // Create new subscription
    const result = await db.run(`
      INSERT INTO push_subscriptions
        (user_id, endpoint, keys_p256dh, keys_auth, user_agent, device_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, endpoint, keys.p256dh, keys.auth, userAgent, deviceType]);

    await logActivity(db, 'SUBSCRIBE', 'push_subscription', result.id, {
      device_type: deviceType
    }, userId);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to push notifications',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ success: false, error: 'Error al suscribirse' });
  }
});

/**
 * DELETE /unsubscribe - Unsubscribe device
 */
router.delete('/unsubscribe', async (req, res) => {
  const db = getDb(req);
  const userId = getUserId(req);
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ success: false, error: 'Endpoint required' });
  }

  try {
    await db.run(`
      UPDATE push_subscriptions SET is_active = false WHERE endpoint = $1
    `, [endpoint]);

    await logActivity(db, 'UNSUBSCRIBE', 'push_subscription', null, { endpoint }, userId);

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ success: false, error: 'Error al desuscribirse' });
  }
});

/**
 * POST /test - Send test notification to current user
 */
router.post('/test', async (req, res) => {
  const db = getDb(req);
  const userId = getUserId(req);

  if (!vapidConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured'
    });
  }

  try {
    // Get user's subscriptions
    const subscriptions = await db.query(`
      SELECT * FROM push_subscriptions
      WHERE user_id = $1 AND is_active = true
    `, [userId]);

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active subscriptions found for this user'
      });
    }

    const payload = JSON.stringify({
      title: 'Almanik PMS - Test',
      body: 'Las notificaciones push estan funcionando correctamente!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        url: '/',
        timestamp: new Date().toISOString()
      }
    });

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;

        // Update last used
        await db.run(`
          UPDATE push_subscriptions
          SET last_used_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [sub.id]);
      } catch (error) {
        failureCount++;
        console.error('Push error:', error.statusCode, error.body);

        // If subscription expired, mark as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await db.run(`
            UPDATE push_subscriptions SET is_active = false WHERE id = $1
          `, [sub.id]);
        }
      }
    }

    res.json({
      success: true,
      message: `Test notification sent`,
      data: { success: successCount, failure: failureCount }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: 'Error al enviar notificacion' });
  }
});

/**
 * POST /send - Send notification to specific users or all
 */
router.post('/send', async (req, res) => {
  const db = getDb(req);
  const userId = getUserId(req);
  const { title, body, type = 'system_alert', userIds, url, data = {} } = req.body;

  if (!vapidConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured'
    });
  }

  if (!title) {
    return res.status(400).json({ success: false, error: 'Title required' });
  }

  try {
    // Build query for subscriptions
    let query = `SELECT * FROM push_subscriptions WHERE is_active = true`;
    let params = [];

    if (userIds && userIds.length > 0) {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
      query += ` AND user_id IN (${placeholders})`;
      params = userIds;
    }

    const subscriptions = await db.query(query, params);

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active subscriptions found'
      });
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: DEFAULT_ICONS[type] || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `${type}-${Date.now()}`,
      data: {
        type,
        url: url || '/',
        timestamp: new Date().toISOString(),
        ...data
      }
    });

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;

        await db.run(`
          UPDATE push_subscriptions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [sub.id]);
      } catch (error) {
        failureCount++;

        if (error.statusCode === 410 || error.statusCode === 404) {
          await db.run(`
            UPDATE push_subscriptions SET is_active = false WHERE id = $1
          `, [sub.id]);
        }
      }
    }

    // Log notification history
    const dataJson = db.isProduction ? { type, url, ...data } : JSON.stringify({ type, url, ...data });
    await db.run(`
      INSERT INTO notification_history
        (type, title, body, data, sent_to_count, success_count, failure_count, sent_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [type, title, body, dataJson, subscriptions.length, successCount, failureCount, userId]);

    res.json({
      success: true,
      message: 'Notification sent',
      data: {
        sent_to: subscriptions.length,
        success: successCount,
        failure: failureCount
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: 'Error al enviar notificacion' });
  }
});

/**
 * POST /send-to-role - Send notification to all users with specific role
 */
router.post('/send-to-role', async (req, res) => {
  const db = getDb(req);
  const userId = getUserId(req);
  const { title, body, type = 'system_alert', role, url, data = {} } = req.body;

  if (!vapidConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured'
    });
  }

  if (!title || !role) {
    return res.status(400).json({ success: false, error: 'Title and role required' });
  }

  try {
    // Get user IDs with specific role
    const users = await db.query(`
      SELECT id FROM users WHERE role = $1 AND is_active = true
    `, [role]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No users found with role: ${role}`
      });
    }

    const userIds = users.map(u => u.id);

    // Get subscriptions for these users
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
    const subscriptions = await db.query(`
      SELECT * FROM push_subscriptions
      WHERE user_id IN (${placeholders}) AND is_active = true
    `, userIds);

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active subscriptions for users with this role'
      });
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: DEFAULT_ICONS[type] || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `${type}-${Date.now()}`,
      data: {
        type,
        url: url || '/',
        timestamp: new Date().toISOString(),
        ...data
      }
    });

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (error) {
        failureCount++;

        if (error.statusCode === 410 || error.statusCode === 404) {
          await db.run(`
            UPDATE push_subscriptions SET is_active = false WHERE id = $1
          `, [sub.id]);
        }
      }
    }

    res.json({
      success: true,
      message: `Notification sent to ${role} users`,
      data: {
        role,
        users: users.length,
        subscriptions: subscriptions.length,
        success: successCount,
        failure: failureCount
      }
    });
  } catch (error) {
    console.error('Error sending notification to role:', error);
    res.status(500).json({ success: false, error: 'Error al enviar notificacion' });
  }
});

/**
 * GET /subscriptions - List all subscriptions (admin)
 */
router.get('/subscriptions', async (req, res) => {
  const db = getDb(req);
  const { active_only = 'true', limit = 50, offset = 0 } = req.query;

  try {
    let whereClause = active_only === 'true' ? 'WHERE ps.is_active = true' : '';

    const subscriptions = await db.query(`
      SELECT
        ps.*,
        u.username, u.name as user_name, u.role
      FROM push_subscriptions ps
      LEFT JOIN users u ON ps.user_id = u.id
      ${whereClause}
      ORDER BY ps.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const countResult = await db.get(`
      SELECT COUNT(*) as total FROM push_subscriptions ps ${whereClause}
    `);

    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.map(s => ({
          id: s.id,
          user_id: s.user_id,
          username: s.username,
          user_name: s.user_name,
          role: s.role,
          device_type: s.device_type,
          is_active: s.is_active,
          created_at: s.created_at,
          last_used_at: s.last_used_at,
          // Truncate endpoint for privacy
          endpoint_preview: s.endpoint ? s.endpoint.substring(0, 50) + '...' : null
        })),
        pagination: {
          total: parseInt(countResult?.total || 0),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, error: 'Error al obtener suscripciones' });
  }
});

/**
 * GET /history - Notification history (admin)
 */
router.get('/history', async (req, res) => {
  const db = getDb(req);
  const { type, limit = 50, offset = 0 } = req.query;

  try {
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (type) {
      whereClause = `WHERE nh.type = $${paramIndex++}`;
      params.push(type);
    }

    params.push(parseInt(limit), parseInt(offset));

    const history = await db.query(`
      SELECT
        nh.*,
        u.username as sent_by_username, u.name as sent_by_name
      FROM notification_history nh
      LEFT JOIN users u ON nh.sent_by = u.id
      ${whereClause}
      ORDER BY nh.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    res.json({
      success: true,
      data: {
        history: history.map(h => ({
          ...h,
          data: typeof h.data === 'string' ? JSON.parse(h.data) : h.data
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ success: false, error: 'Error al obtener historial' });
  }
});

// ============================================================
// HELPER FUNCTIONS FOR OTHER MODULES
// ============================================================

/**
 * Send notification from other modules
 * @param {Object} db - Database instance
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} options - Additional options (userIds, url, data)
 */
async function sendNotification(db, type, title, body, options = {}) {
  if (!vapidConfigured) {
    console.warn('Push notifications not configured, skipping send');
    return { success: false, error: 'Not configured' };
  }

  const { userIds, url = '/', data = {} } = options;

  try {
    let query = `SELECT * FROM push_subscriptions WHERE is_active = true`;
    let params = [];

    if (userIds && userIds.length > 0) {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
      query += ` AND user_id IN (${placeholders})`;
      params = userIds;
    }

    const subscriptions = await db.query(query, params);

    if (subscriptions.length === 0) {
      return { success: false, error: 'No subscriptions' };
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: DEFAULT_ICONS[type] || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `${type}-${Date.now()}`,
      data: {
        type,
        url,
        timestamp: new Date().toISOString(),
        ...data
      }
    });

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (error) {
        failureCount++;

        if (error.statusCode === 410 || error.statusCode === 404) {
          await db.run(`
            UPDATE push_subscriptions SET is_active = false WHERE id = $1
          `, [sub.id]);
        }
      }
    }

    return { success: true, sent: subscriptions.length, successCount, failureCount };
  } catch (error) {
    console.error('Error in sendNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify all admins about an event
 */
async function notifyAdmins(db, title, body, url = '/') {
  try {
    const admins = await db.query(`SELECT id FROM users WHERE role = 'admin' AND is_active = true`);
    const userIds = admins.map(a => a.id);
    return await sendNotification(db, 'system_alert', title, body, { userIds, url });
  } catch (error) {
    console.error('Error notifying admins:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify staff about new reservation
 */
async function notifyNewReservation(db, reservation) {
  return await sendNotification(
    db,
    NOTIFICATION_TYPES.NEW_RESERVATION,
    'Nueva Reservacion',
    `${reservation.guest_name} - ${reservation.nights} noches`,
    {
      url: '/reservations.html',
      data: { reservation_id: reservation.id }
    }
  );
}

/**
 * Notify staff about check-in reminder
 */
async function notifyCheckinReminder(db, booking) {
  return await sendNotification(
    db,
    NOTIFICATION_TYPES.CHECKIN_REMINDER,
    'Check-in Pendiente',
    `${booking.guest_name} - Hoy`,
    {
      url: '/index.html',
      data: { booking_id: booking.id }
    }
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = router;
module.exports.initializeNotificationsTables = initializeNotificationsTables;
module.exports.configureVapid = configureVapid;
module.exports.sendNotification = sendNotification;
module.exports.notifyAdmins = notifyAdmins;
module.exports.notifyNewReservation = notifyNewReservation;
module.exports.notifyCheckinReminder = notifyCheckinReminder;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
