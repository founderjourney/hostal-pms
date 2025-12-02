/**
 * ============================================================
 * ALMANIK PMS - Stripe Configuration
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 *
 * Configuracion de Stripe para pagos con tarjeta.
 *
 * Variables de entorno requeridas:
 * - STRIPE_SECRET_KEY: API key secreta (sk_test_... o sk_live_...)
 * - STRIPE_PUBLISHABLE_KEY: API key publica (pk_test_... o pk_live_...)
 * - STRIPE_WEBHOOK_SECRET: Secreto para verificar webhooks (whsec_...)
 *
 * Uso:
 * const stripe = require('./config/stripe');
 * if (stripe.isEnabled()) {
 *   const paymentIntent = await stripe.client.paymentIntents.create({...});
 * }
 */

const Stripe = require('stripe');
const logger = require('./logger');

// Validar que las variables de entorno estan configuradas
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Crear instancia de Stripe solo si hay key configurada
let stripeClient = null;
let stripeEnabled = false;

if (STRIPE_SECRET_KEY) {
  try {
    stripeClient = Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'Almanik PMS',
        version: '1.0.0',
        url: 'https://github.com/almanik-pms'
      }
    });
    stripeEnabled = true;
    logger.info('Stripe initialized successfully', {
      mode: STRIPE_SECRET_KEY.startsWith('sk_live') ? 'PRODUCTION' : 'TEST'
    });
  } catch (error) {
    logger.error('Failed to initialize Stripe', { error: error.message });
  }
} else {
  logger.warn('Stripe not configured - STRIPE_SECRET_KEY not found in environment');
}

// Exportar objeto con cliente y utilidades
const stripeModule = {
  // El cliente de Stripe (null si no configurado)
  client: stripeClient,

  // Verificar si Stripe esta habilitado
  isEnabled: () => stripeEnabled,

  // Obtener publishable key (para frontend)
  getPublishableKey: () => STRIPE_PUBLISHABLE_KEY,

  // Obtener webhook secret
  getWebhookSecret: () => STRIPE_WEBHOOK_SECRET,

  // Verificar si esta en modo test
  isTestMode: () => STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.startsWith('sk_test'),

  // Verificar si esta en modo live
  isLiveMode: () => STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.startsWith('sk_live'),

  // Proxy para acceder a metodos de Stripe directamente
  // Permite usar stripe.paymentIntents.create() en lugar de stripe.client.paymentIntents.create()
  get paymentIntents() {
    return stripeClient?.paymentIntents;
  },

  get refunds() {
    return stripeClient?.refunds;
  },

  get webhooks() {
    return stripeClient?.webhooks;
  },

  get customers() {
    return stripeClient?.customers;
  }
};

module.exports = stripeModule;
