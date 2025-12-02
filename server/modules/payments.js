/**
 * ============================================================
 * ALMANIK PMS - Payments Module (Stripe)
 * ============================================================
 * @version 1.3.0
 * @date 2025-11-28
 *
 * Gestion de pagos con tarjeta via Stripe.
 *
 * DEV1-01 Endpoints:
 * - GET    /config              - Get Stripe publishable key
 * - POST   /create-intent       - Create payment intent
 * - POST   /confirm             - Confirm payment intent
 *
 * DEV1-02 Endpoints (pre-auth):
 * - POST   /pre-authorize       - Pre-authorize amount
 * - POST   /capture             - Capture pre-authorized payment
 * - POST   /cancel-auth         - Cancel pre-authorization
 *
 * DEV1-03 Endpoints (charges/refunds):
 * - POST   /charge              - Direct charge
 * - POST   /refund              - Refund payment
 * - GET    /history/:id         - Payment history for reservation
 *
 * DEV1-04 Integration:
 * - Automatic cashbox sync      - Syncs payments to active cashbox session
 *
 * Webhook:
 * - POST   /webhook             - Stripe webhook handler
 */

const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const logger = require('../config/logger');

// ============================================================
// CONSTANTS
// ============================================================

const CURRENCY = 'cop'; // Colombian Peso (can be overridden)
const DEFAULT_PREAUTH_AMOUNT = 5000; // $50 USD equivalent in COP (adjust as needed)

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if Stripe is properly configured
 */
const requireStripe = (req, res, next) => {
  if (!stripe || !stripe.isEnabled()) {
    logger.warn('Stripe payment attempted but not configured');
    return res.status(503).json({
      error: 'Payment service not available',
      message: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment.'
    });
  }
  next();
};

/**
 * Log payment activity to database
 */
const logPaymentActivity = async (req, action, details) => {
  try {
    const db = req.app.locals.db;
    if (!db) return;

    await db.run(
      `INSERT INTO activity_log (action_type, module, description, user_id, entity_id, entity_type, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action,
        'payments',
        details.description || action,
        req.session?.id || null,
        details.reservation_id || null,
        'payment',
        JSON.stringify(details),
        req.ip
      ]
    );
  } catch (error) {
    logger.error('Failed to log payment activity', { error: error.message });
  }
};

/**
 * Store payment record in database
 */
const storePaymentRecord = async (req, paymentData) => {
  try {
    const db = req.app.locals.db;
    if (!db) return null;

    // Check if payments table exists, create if not
    await db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stripe_payment_id TEXT UNIQUE,
        reservation_id INTEGER,
        guest_id INTEGER,
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'cop',
        status TEXT DEFAULT 'pending',
        payment_type TEXT DEFAULT 'payment',
        description TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reservation_id) REFERENCES bookings(id),
        FOREIGN KEY (guest_id) REFERENCES guests(id)
      )
    `);

    const result = await db.run(
      `INSERT INTO payments (stripe_payment_id, reservation_id, guest_id, amount, currency, status, payment_type, description, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentData.stripe_id,
        paymentData.reservation_id || null,
        paymentData.guest_id || null,
        paymentData.amount,
        paymentData.currency || CURRENCY,
        paymentData.status || PAYMENT_STATUS.PENDING,
        paymentData.type || 'payment',
        paymentData.description || null,
        JSON.stringify(paymentData.metadata || {})
      ]
    );

    return result.lastID;
  } catch (error) {
    logger.error('Failed to store payment record', { error: error.message });
    return null;
  }
};

/**
 * Update payment status in database
 */
const updatePaymentStatus = async (req, stripePaymentId, status, metadata = {}) => {
  try {
    const db = req.app.locals.db;
    if (!db) return;

    await db.run(
      `UPDATE payments SET status = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_id = ?`,
      [status, JSON.stringify(metadata), stripePaymentId]
    );
  } catch (error) {
    logger.error('Failed to update payment status', { error: error.message });
  }
};

/**
 * DEV1-04: Sync payment to cashbox
 * Automatically registers Stripe payments in the active cashbox session
 */
const syncToCashbox = async (req, paymentData) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      logger.warn('syncToCashbox: No database connection');
      return null;
    }

    // Check for active cashbox session
    const activeSession = await db.get(
      `SELECT id, session_id FROM cashbox_sessions
       WHERE status = 'active'
       ORDER BY opened_at DESC
       LIMIT 1`
    );

    if (!activeSession) {
      logger.info('syncToCashbox: No active cashbox session, skipping sync');
      return null;
    }

    const { type, amount, currency, description, payment_intent_id, reservation_id, guest_id, refund_id } = paymentData;

    // Determine category and transaction type based on payment type
    let category, transactionType;
    if (type === 'charge' || type === 'capture') {
      category = type === 'capture' ? 'stripe_preauth' : 'stripe_payment';
      transactionType = 'income';
    } else if (type === 'refund') {
      category = 'stripe_refund';
      transactionType = 'expense';
    } else {
      logger.warn('syncToCashbox: Unknown payment type', { type });
      return null;
    }

    // Create transaction in cashbox
    const txDescription = description || `Stripe ${type} - ${payment_intent_id}`;
    const reference = refund_id || payment_intent_id;

    const result = await db.run(
      `INSERT INTO cashbox_transactions
       (session_id, type, category, amount, payment_method, description, reference, reservation_id, guest_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activeSession.id,
        transactionType,
        category,
        Math.abs(amount), // Always positive, type determines income/expense
        'stripe',
        txDescription,
        reference,
        reservation_id || null,
        guest_id || null,
        req.session?.id || null
      ]
    );

    logger.info('syncToCashbox: Transaction created', {
      transaction_id: result.lastID,
      session_id: activeSession.id,
      type: transactionType,
      category,
      amount,
      payment_intent_id
    });

    return result.lastID;
  } catch (error) {
    // Don't fail the payment if cashbox sync fails
    logger.error('syncToCashbox: Failed to sync', {
      error: error.message,
      payment_intent_id: paymentData.payment_intent_id
    });
    return null;
  }
};

// ============================================================
// ROUTES - DEV1-01: Basic Configuration
// ============================================================

/**
 * GET /config
 * Get Stripe configuration (publishable key)
 * Used by frontend to initialize Stripe.js
 */
router.get('/config', (req, res) => {
  const publishableKey = stripe.getPublishableKey();

  if (!publishableKey) {
    return res.status(503).json({
      error: 'Payment service not configured',
      enabled: false
    });
  }

  res.json({
    enabled: stripe.isEnabled(),
    publishableKey: publishableKey,
    mode: stripe.isTestMode() ? 'test' : 'live',
    currency: CURRENCY
  });
});

/**
 * POST /create-intent
 * Create a payment intent for a given amount
 *
 * Body:
 * - amount: number (required) - Amount in smallest currency unit (centavos for COP)
 * - currency: string (optional) - Currency code, defaults to 'cop'
 * - reservation_id: number (optional) - Associated reservation
 * - guest_id: number (optional) - Associated guest
 * - description: string (optional) - Payment description
 * - metadata: object (optional) - Additional metadata
 */
router.post('/create-intent', requireStripe, async (req, res) => {
  try {
    const {
      amount,
      currency = CURRENCY,
      reservation_id,
      guest_id,
      description,
      metadata = {}
    } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure integer
      currency: currency.toLowerCase(),
      description: description || `Almanik PMS - Payment`,
      metadata: {
        ...metadata,
        reservation_id: reservation_id?.toString() || '',
        guest_id: guest_id?.toString() || '',
        source: 'almanik-pms'
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    // Store payment record in database
    await storePaymentRecord(req, {
      stripe_id: paymentIntent.id,
      reservation_id,
      guest_id,
      amount,
      currency,
      status: PAYMENT_STATUS.PENDING,
      type: 'payment',
      description,
      metadata
    });

    // Log activity
    await logPaymentActivity(req, 'payment_intent_created', {
      payment_intent_id: paymentIntent.id,
      reservation_id,
      amount,
      currency
    });

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      reservationId: reservation_id
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });

  } catch (error) {
    logger.error('Failed to create payment intent', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Payment creation failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /confirm
 * Confirm a payment intent (after client-side confirmation)
 *
 * Body:
 * - payment_intent_id: string (required) - The payment intent ID to confirm
 */
router.post('/confirm', requireStripe, async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        error: 'Missing payment_intent_id'
      });
    }

    // Retrieve the payment intent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Update local database
    await updatePaymentStatus(req, payment_intent_id, paymentIntent.status, {
      confirmed_at: new Date().toISOString(),
      confirmed_by: req.session?.id
    });

    // Log activity
    await logPaymentActivity(req, 'payment_confirmed', {
      payment_intent_id,
      status: paymentIntent.status,
      amount: paymentIntent.amount
    });

    logger.info('Payment intent confirmed', {
      paymentIntentId: payment_intent_id,
      status: paymentIntent.status
    });

    res.json({
      success: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error) {
    logger.error('Failed to confirm payment', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Payment confirmation failed',
      message: error.message,
      code: error.code
    });
  }
});

// ============================================================
// ROUTES - DEV1-02: Pre-authorization
// ============================================================

/**
 * POST /pre-authorize
 * Pre-authorize an amount (hold funds without capturing)
 * Used for check-in deposits - funds are held but not charged
 *
 * Body:
 * - amount: number (required) - Amount in smallest currency unit
 * - currency: string (optional) - Currency code, defaults to 'cop'
 * - reservation_id: number (required) - Associated reservation
 * - guest_id: number (optional) - Associated guest
 * - description: string (optional) - Payment description
 * - payment_method_id: string (optional) - Saved payment method ID
 * - metadata: object (optional) - Additional metadata
 *
 * Note: Pre-authorization holds funds for up to 7 days (Stripe limit)
 */
router.post('/pre-authorize', requireStripe, async (req, res) => {
  try {
    const {
      amount,
      currency = CURRENCY,
      reservation_id,
      guest_id,
      description,
      payment_method_id,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    if (!reservation_id) {
      return res.status(400).json({
        error: 'Missing reservation_id',
        message: 'Pre-authorization requires a reservation_id'
      });
    }

    // Check if reservation already has an active pre-auth
    const db = req.app.locals.db;
    if (db) {
      const existingAuth = await db.get(
        `SELECT * FROM payments
         WHERE reservation_id = ?
         AND payment_type = 'pre_auth'
         AND status IN ('pending', 'requires_capture')
         ORDER BY created_at DESC LIMIT 1`,
        [reservation_id]
      );

      if (existingAuth) {
        return res.status(409).json({
          error: 'Pre-authorization exists',
          message: 'This reservation already has an active pre-authorization',
          existing_payment_id: existingAuth.stripe_payment_id
        });
      }
    }

    // Create payment intent with capture_method: 'manual'
    // This authorizes the card but doesn't capture the funds
    const paymentIntentParams = {
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      capture_method: 'manual', // Key for pre-authorization
      description: description || `Almanik PMS - Pre-authorization for reservation #${reservation_id}`,
      metadata: {
        ...metadata,
        reservation_id: reservation_id.toString(),
        guest_id: guest_id?.toString() || '',
        payment_type: 'pre_auth',
        source: 'almanik-pms'
      }
    };

    // If a payment method is provided, attach it
    if (payment_method_id) {
      paymentIntentParams.payment_method = payment_method_id;
      paymentIntentParams.confirm = true;
    } else {
      paymentIntentParams.automatic_payment_methods = { enabled: true };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Store payment record in database
    await storePaymentRecord(req, {
      stripe_id: paymentIntent.id,
      reservation_id,
      guest_id,
      amount,
      currency,
      status: paymentIntent.status === 'requires_capture' ? 'requires_capture' : PAYMENT_STATUS.PENDING,
      type: 'pre_auth',
      description: description || 'Check-in pre-authorization',
      metadata: {
        ...metadata,
        pre_auth: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }
    });

    // Log activity
    await logPaymentActivity(req, 'pre_auth_created', {
      payment_intent_id: paymentIntent.id,
      reservation_id,
      amount,
      currency,
      description: 'Pre-authorization created for check-in'
    });

    logger.info('Pre-authorization created', {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      reservationId: reservation_id,
      status: paymentIntent.status
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === 'requires_action',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    logger.error('Failed to create pre-authorization', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Pre-authorization failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /capture
 * Capture a pre-authorized payment (convert hold to actual charge)
 * Used at check-out to charge the held funds
 *
 * Body:
 * - payment_intent_id: string (required) - The pre-authorized payment intent ID
 * - amount_to_capture: number (optional) - Amount to capture (can be less than auth)
 */
router.post('/capture', requireStripe, async (req, res) => {
  try {
    const { payment_intent_id, amount_to_capture } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        error: 'Missing payment_intent_id'
      });
    }

    // Retrieve the payment intent first
    const existingIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Validate it's a pre-auth that can be captured
    if (existingIntent.capture_method !== 'manual') {
      return res.status(400).json({
        error: 'Invalid payment type',
        message: 'This payment intent was not created for pre-authorization'
      });
    }

    if (existingIntent.status !== 'requires_capture') {
      return res.status(400).json({
        error: 'Cannot capture',
        message: `Payment intent status is '${existingIntent.status}', expected 'requires_capture'`,
        current_status: existingIntent.status
      });
    }

    // Capture the payment
    const captureParams = {};
    if (amount_to_capture && amount_to_capture > 0 && amount_to_capture <= existingIntent.amount) {
      captureParams.amount_to_capture = Math.round(amount_to_capture);
    }

    const paymentIntent = await stripe.paymentIntents.capture(payment_intent_id, captureParams);

    // Update local database
    await updatePaymentStatus(req, payment_intent_id, PAYMENT_STATUS.SUCCEEDED, {
      captured_at: new Date().toISOString(),
      captured_amount: paymentIntent.amount_received,
      captured_by: req.session?.id
    });

    // Log activity
    await logPaymentActivity(req, 'pre_auth_captured', {
      payment_intent_id,
      original_amount: existingIntent.amount,
      captured_amount: paymentIntent.amount_received,
      reservation_id: existingIntent.metadata?.reservation_id,
      description: 'Pre-authorization captured at check-out'
    });

    // DEV1-04: Sync to cashbox
    await syncToCashbox(req, {
      type: 'capture',
      amount: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      payment_intent_id: paymentIntent.id,
      reservation_id: existingIntent.metadata?.reservation_id ? parseInt(existingIntent.metadata.reservation_id) : null,
      guest_id: existingIntent.metadata?.guest_id ? parseInt(existingIntent.metadata.guest_id) : null,
      description: `Pre-auth capturado - ${paymentIntent.id}`
    });

    logger.info('Pre-authorization captured', {
      paymentIntentId: payment_intent_id,
      originalAmount: existingIntent.amount,
      capturedAmount: paymentIntent.amount_received
    });

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      originalAmount: existingIntent.amount,
      capturedAmount: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });

  } catch (error) {
    logger.error('Failed to capture pre-authorization', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Capture failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /cancel-auth
 * Cancel a pre-authorization (release held funds)
 * Used when guest cancels before check-in
 *
 * Body:
 * - payment_intent_id: string (required) - The pre-authorized payment intent ID
 * - reason: string (optional) - Reason for cancellation
 */
router.post('/cancel-auth', requireStripe, async (req, res) => {
  try {
    const { payment_intent_id, reason } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        error: 'Missing payment_intent_id'
      });
    }

    // Retrieve the payment intent first
    const existingIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Validate it can be cancelled
    const cancellableStatuses = ['requires_payment_method', 'requires_capture', 'requires_confirmation', 'requires_action'];
    if (!cancellableStatuses.includes(existingIntent.status)) {
      return res.status(400).json({
        error: 'Cannot cancel',
        message: `Payment intent status is '${existingIntent.status}', cannot be cancelled`,
        current_status: existingIntent.status
      });
    }

    // Cancel the payment intent
    const paymentIntent = await stripe.paymentIntents.cancel(payment_intent_id, {
      cancellation_reason: 'requested_by_customer'
    });

    // Update local database
    await updatePaymentStatus(req, payment_intent_id, PAYMENT_STATUS.CANCELLED, {
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || 'Guest cancelled before check-in',
      cancelled_by: req.session?.id
    });

    // Log activity
    await logPaymentActivity(req, 'pre_auth_cancelled', {
      payment_intent_id,
      amount: existingIntent.amount,
      reason: reason || 'Guest cancelled before check-in',
      reservation_id: existingIntent.metadata?.reservation_id,
      description: 'Pre-authorization cancelled'
    });

    logger.info('Pre-authorization cancelled', {
      paymentIntentId: payment_intent_id,
      amount: existingIntent.amount,
      reason
    });

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      releasedAmount: existingIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      reason: reason || 'Guest cancelled before check-in'
    });

  } catch (error) {
    logger.error('Failed to cancel pre-authorization', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Cancel failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * GET /pre-auth/:reservation_id
 * Get active pre-authorization for a reservation
 */
router.get('/pre-auth/:reservation_id', requireStripe, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { reservation_id } = req.params;

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const preAuth = await db.get(
      `SELECT * FROM payments
       WHERE reservation_id = ?
       AND payment_type = 'pre_auth'
       ORDER BY created_at DESC LIMIT 1`,
      [reservation_id]
    );

    if (!preAuth) {
      return res.json({
        success: true,
        has_pre_auth: false,
        reservation_id: parseInt(reservation_id)
      });
    }

    // If we have a Stripe ID, get current status from Stripe
    let stripeStatus = null;
    if (preAuth.stripe_payment_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(preAuth.stripe_payment_id);
        stripeStatus = paymentIntent.status;
      } catch (e) {
        logger.warn('Could not retrieve Stripe payment intent', { error: e.message });
      }
    }

    res.json({
      success: true,
      has_pre_auth: true,
      reservation_id: parseInt(reservation_id),
      pre_auth: {
        id: preAuth.id,
        stripe_payment_id: preAuth.stripe_payment_id,
        amount: preAuth.amount,
        currency: preAuth.currency,
        status: stripeStatus || preAuth.status,
        local_status: preAuth.status,
        created_at: preAuth.created_at,
        metadata: JSON.parse(preAuth.metadata || '{}')
      }
    });

  } catch (error) {
    logger.error('Failed to get pre-authorization', {
      error: error.message,
      reservation_id: req.params.reservation_id
    });

    res.status(500).json({
      error: 'Failed to retrieve pre-authorization',
      message: error.message
    });
  }
});

// ============================================================
// ROUTES - DEV1-03: Charges & Refunds
// ============================================================

/**
 * POST /charge
 * Direct charge (immediate capture)
 * Creates and immediately captures a payment
 *
 * Body:
 * - amount: number (required) - Amount in smallest currency unit
 * - currency: string (optional) - Currency code, defaults to 'cop'
 * - reservation_id: number (optional) - Associated reservation
 * - guest_id: number (optional) - Associated guest
 * - description: string (optional) - Payment description
 * - payment_method_id: string (required) - Payment method to charge
 * - receipt_email: string (optional) - Email to send receipt
 * - metadata: object (optional) - Additional metadata
 */
router.post('/charge', requireStripe, async (req, res) => {
  try {
    const {
      amount,
      currency = CURRENCY,
      reservation_id,
      guest_id,
      description,
      payment_method_id,
      receipt_email,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    if (!payment_method_id) {
      return res.status(400).json({
        error: 'Missing payment_method_id',
        message: 'A payment method is required for direct charges'
      });
    }

    // Create and confirm payment intent in one step
    const paymentIntentParams = {
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      payment_method: payment_method_id,
      confirm: true, // Immediately confirm
      description: description || `Almanik PMS - Charge${reservation_id ? ` for reservation #${reservation_id}` : ''}`,
      metadata: {
        ...metadata,
        reservation_id: reservation_id?.toString() || '',
        guest_id: guest_id?.toString() || '',
        payment_type: 'charge',
        source: 'almanik-pms'
      },
      // Handle 3D Secure automatically
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    };

    if (receipt_email) {
      paymentIntentParams.receipt_email = receipt_email;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Store payment record in database
    await storePaymentRecord(req, {
      stripe_id: paymentIntent.id,
      reservation_id,
      guest_id,
      amount,
      currency,
      status: paymentIntent.status === 'succeeded' ? PAYMENT_STATUS.SUCCEEDED : paymentIntent.status,
      type: 'charge',
      description: description || 'Direct charge',
      metadata: {
        ...metadata,
        charge_id: paymentIntent.latest_charge
      }
    });

    // Log activity
    await logPaymentActivity(req, 'charge_created', {
      payment_intent_id: paymentIntent.id,
      reservation_id,
      amount,
      currency,
      status: paymentIntent.status,
      description: 'Direct charge processed'
    });

    // DEV1-04: Sync to cashbox (only if succeeded)
    if (paymentIntent.status === 'succeeded') {
      await syncToCashbox(req, {
        type: 'charge',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_intent_id: paymentIntent.id,
        reservation_id: reservation_id || null,
        guest_id: guest_id || null,
        description: description || `Cobro Stripe - ${paymentIntent.id}`
      });
    }

    logger.info('Direct charge processed', {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      status: paymentIntent.status,
      reservationId: reservation_id
    });

    res.json({
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === 'requires_action',
      clientSecret: paymentIntent.status === 'requires_action' ? paymentIntent.client_secret : undefined
    });

  } catch (error) {
    logger.error('Failed to process charge', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Charge failed',
      message: error.message,
      code: error.code,
      decline_code: error.decline_code
    });
  }
});

/**
 * POST /refund
 * Refund a payment (full or partial)
 *
 * Body:
 * - payment_intent_id: string (required) - The payment intent to refund
 * - amount: number (optional) - Amount to refund (defaults to full refund)
 * - reason: string (optional) - Reason for refund (duplicate, fraudulent, requested_by_customer)
 * - metadata: object (optional) - Additional metadata
 */
router.post('/refund', requireStripe, async (req, res) => {
  try {
    const {
      payment_intent_id,
      amount,
      reason,
      metadata = {}
    } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        error: 'Missing payment_intent_id'
      });
    }

    // Get the payment intent to find the charge
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Cannot refund',
        message: `Payment intent status is '${paymentIntent.status}', can only refund succeeded payments`,
        current_status: paymentIntent.status
      });
    }

    // Get the charge ID
    const chargeId = paymentIntent.latest_charge;
    if (!chargeId) {
      return res.status(400).json({
        error: 'No charge found',
        message: 'This payment intent has no associated charge to refund'
      });
    }

    // Create refund params
    const refundParams = {
      charge: chargeId,
      metadata: {
        ...metadata,
        payment_intent_id,
        refunded_by: req.session?.id?.toString() || 'system',
        source: 'almanik-pms'
      }
    };

    // Partial refund
    if (amount && amount > 0) {
      if (amount > paymentIntent.amount) {
        return res.status(400).json({
          error: 'Invalid refund amount',
          message: `Refund amount (${amount}) cannot exceed original payment (${paymentIntent.amount})`
        });
      }
      refundParams.amount = Math.round(amount);
    }

    // Reason (must be one of Stripe's allowed values)
    const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
    if (reason && validReasons.includes(reason)) {
      refundParams.reason = reason;
    }

    const refund = await stripe.refunds.create(refundParams);

    // Update payment status in database
    const isFullRefund = !amount || amount >= paymentIntent.amount;
    await updatePaymentStatus(req, payment_intent_id, isFullRefund ? PAYMENT_STATUS.REFUNDED : 'partial_refund', {
      refund_id: refund.id,
      refund_amount: refund.amount,
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
      refunded_by: req.session?.id
    });

    // Log activity
    await logPaymentActivity(req, isFullRefund ? 'full_refund' : 'partial_refund', {
      payment_intent_id,
      refund_id: refund.id,
      original_amount: paymentIntent.amount,
      refund_amount: refund.amount,
      reason: reason || 'requested_by_customer',
      reservation_id: paymentIntent.metadata?.reservation_id,
      description: `Refund of ${refund.amount} ${refund.currency}`
    });

    // DEV1-04: Sync refund to cashbox (as expense)
    await syncToCashbox(req, {
      type: 'refund',
      amount: refund.amount,
      currency: refund.currency,
      payment_intent_id: payment_intent_id,
      refund_id: refund.id,
      reservation_id: paymentIntent.metadata?.reservation_id ? parseInt(paymentIntent.metadata.reservation_id) : null,
      guest_id: paymentIntent.metadata?.guest_id ? parseInt(paymentIntent.metadata.guest_id) : null,
      description: `Reembolso Stripe - ${refund.id}`
    });

    logger.info('Refund processed', {
      refundId: refund.id,
      paymentIntentId: payment_intent_id,
      originalAmount: paymentIntent.amount,
      refundAmount: refund.amount,
      isFullRefund
    });

    res.json({
      success: true,
      refundId: refund.id,
      paymentIntentId: payment_intent_id,
      originalAmount: paymentIntent.amount,
      refundedAmount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      isFullRefund,
      reason: reason || 'requested_by_customer'
    });

  } catch (error) {
    logger.error('Failed to process refund', {
      error: error.message,
      code: error.code
    });

    res.status(500).json({
      error: 'Refund failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * GET /history/:reservation_id
 * Get complete payment history for a reservation
 * Includes all payment types: charges, pre-auths, refunds
 */
router.get('/history/:reservation_id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { reservation_id } = req.params;

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    let payments = [];

    try {
      // Get all payments for this reservation
      payments = await db.query(
        `SELECT
          id,
          stripe_payment_id,
          amount,
          currency,
          status,
          payment_type,
          description,
          metadata,
          created_at,
          updated_at
         FROM payments
         WHERE reservation_id = ?
         ORDER BY created_at DESC`,
        [reservation_id]
      );
    } catch (tableError) {
      // If table doesn't exist, return empty array
      if (tableError.message && tableError.message.includes('no such table')) {
        payments = [];
      } else {
        throw tableError;
      }
    }

    // Parse metadata for each payment
    const formattedPayments = (payments || []).map(p => ({
      ...p,
      metadata: JSON.parse(p.metadata || '{}')
    }));

    // Calculate totals
    const totals = formattedPayments.reduce((acc, p) => {
      if (p.status === 'succeeded' && p.payment_type !== 'pre_auth') {
        acc.charged += p.amount;
      }
      if (p.status === 'refunded' || p.status === 'partial_refund') {
        const refundAmount = p.metadata?.refund_amount || p.amount;
        acc.refunded += refundAmount;
      }
      if (p.status === 'requires_capture') {
        acc.held += p.amount;
      }
      return acc;
    }, { charged: 0, refunded: 0, held: 0 });

    totals.net = totals.charged - totals.refunded;

    res.json({
      success: true,
      reservation_id: parseInt(reservation_id),
      payments: formattedPayments,
      count: formattedPayments.length,
      totals: {
        charged: totals.charged,
        refunded: totals.refunded,
        held: totals.held,
        net: totals.net,
        currency: CURRENCY
      }
    });

  } catch (error) {
    logger.error('Failed to get payment history', {
      error: error.message,
      reservation_id: req.params.reservation_id
    });

    res.status(500).json({
      error: 'Failed to retrieve payment history',
      message: error.message
    });
  }
});

/**
 * GET /payment/:payment_intent_id
 * Get details of a specific payment from Stripe
 */
router.get('/payment/:payment_intent_id', requireStripe, async (req, res) => {
  try {
    const { payment_intent_id } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: ['charges', 'charges.data.refunds']
    });

    // Get local record
    const db = req.app.locals.db;
    let localRecord = null;
    if (db) {
      localRecord = await db.get(
        'SELECT * FROM payments WHERE stripe_payment_id = ?',
        [payment_intent_id]
      );
    }

    res.json({
      success: true,
      payment: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        capture_method: paymentIntent.capture_method,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
        created: new Date(paymentIntent.created * 1000).toISOString(),
        charges: paymentIntent.charges?.data?.map(c => ({
          id: c.id,
          amount: c.amount,
          refunded: c.refunded,
          amount_refunded: c.amount_refunded,
          refunds: c.refunds?.data?.map(r => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            reason: r.reason,
            created: new Date(r.created * 1000).toISOString()
          }))
        }))
      },
      local_record: localRecord ? {
        ...localRecord,
        metadata: JSON.parse(localRecord.metadata || '{}')
      } : null
    });

  } catch (error) {
    logger.error('Failed to get payment details', {
      error: error.message,
      payment_intent_id: req.params.payment_intent_id
    });

    res.status(500).json({
      error: 'Failed to retrieve payment',
      message: error.message
    });
  }
});

// ============================================================
// WEBHOOK HANDLER
// ============================================================

/**
 * POST /webhook
 * Handle Stripe webhooks
 * Note: This endpoint should NOT have authentication middleware
 * Must be registered BEFORE body parser middleware in server
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = stripe.getWebhookSecret();

  if (!webhookSecret) {
    logger.warn('Webhook received but STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    logger.info('Stripe webhook received', {
      type: event.type,
      id: event.id
    });

    const paymentIntent = event.data.object;

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await updatePaymentStatus(req, paymentIntent.id, PAYMENT_STATUS.SUCCEEDED, {
          webhook_event_id: event.id,
          succeeded_at: new Date().toISOString()
        });
        // Log activity
        await logPaymentActivity(req, 'payment_succeeded_webhook', {
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount,
          reservation_id: paymentIntent.metadata?.reservation_id
        });
        break;

      case 'payment_intent.payment_failed':
        await updatePaymentStatus(req, paymentIntent.id, PAYMENT_STATUS.FAILED, {
          webhook_event_id: event.id,
          failure_message: paymentIntent.last_payment_error?.message,
          failure_code: paymentIntent.last_payment_error?.code,
          failed_at: new Date().toISOString()
        });
        await logPaymentActivity(req, 'payment_failed_webhook', {
          payment_intent_id: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
          reservation_id: paymentIntent.metadata?.reservation_id
        });
        break;

      case 'payment_intent.canceled':
        await updatePaymentStatus(req, paymentIntent.id, PAYMENT_STATUS.CANCELLED, {
          webhook_event_id: event.id,
          cancelled_at: new Date().toISOString()
        });
        await logPaymentActivity(req, 'payment_cancelled_webhook', {
          payment_intent_id: paymentIntent.id,
          reservation_id: paymentIntent.metadata?.reservation_id
        });
        break;

      case 'payment_intent.requires_action':
        await updatePaymentStatus(req, paymentIntent.id, 'requires_action', {
          webhook_event_id: event.id
        });
        break;

      case 'charge.refunded':
        const charge = event.data.object;
        await updatePaymentStatus(req, charge.payment_intent, PAYMENT_STATUS.REFUNDED, {
          webhook_event_id: event.id,
          refund_id: charge.refunds?.data[0]?.id,
          refund_amount: charge.amount_refunded,
          refunded_at: new Date().toISOString()
        });
        await logPaymentActivity(req, 'refund_webhook', {
          payment_intent_id: charge.payment_intent,
          charge_id: charge.id,
          refund_amount: charge.amount_refunded
        });
        break;

      case 'charge.dispute.created':
        const dispute = event.data.object;
        logger.warn('Payment dispute created', {
          chargeId: dispute.charge,
          amount: dispute.amount,
          reason: dispute.reason
        });
        await logPaymentActivity(req, 'dispute_created', {
          charge_id: dispute.charge,
          amount: dispute.amount,
          reason: dispute.reason,
          description: 'ALERT: Payment dispute created - action required'
        });
        break;

      default:
        logger.debug('Unhandled webhook event type', { type: event.type });
    }

    res.json({ received: true });

  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error.message
    });
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

// ============================================================
// STATUS ENDPOINT
// ============================================================

/**
 * GET /status
 * Check payment module status
 */
router.get('/status', (req, res) => {
  res.json({
    module: 'payments',
    version: '1.2.0',
    stripe_enabled: stripe.isEnabled(),
    stripe_mode: stripe.isTestMode() ? 'test' : (stripe.isLiveMode() ? 'live' : 'not configured'),
    currency: CURRENCY,
    endpoints: {
      basic: [
        'GET /config',
        'POST /create-intent',
        'POST /confirm',
        'GET /status'
      ],
      pre_authorization: [
        'POST /pre-authorize',
        'POST /capture',
        'POST /cancel-auth',
        'GET /pre-auth/:reservation_id'
      ],
      charges_refunds: [
        'POST /charge',
        'POST /refund',
        'GET /history/:reservation_id',
        'GET /payment/:payment_intent_id'
      ],
      webhooks: [
        'POST /webhook'
      ]
    },
    webhook_events: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'payment_intent.requires_action',
      'charge.refunded',
      'charge.dispute.created'
    ]
  });
});

module.exports = router;
