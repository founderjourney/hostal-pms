/**
 * Security Configuration - Production Grade
 * Helmet, Rate Limiting, CORS, Input Validation
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Helmet Security Headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow onclick handlers
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Rate Limiting Configuration
 */

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (raised for testing)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Stricter limit for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 write operations per minute
  message: 'Too many write operations, please slow down.',
});

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:5173', // Vite dev server
          'http://127.0.0.1:3000',
          'https://almanik-pms-viajero.vercel.app',
          'https://hostal-pms.vercel.app',
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'session-id'],
};

/**
 * Input Validation Helpers
 */

// Validation middleware handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  // Guest validation
  createGuest: [
    body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
    body('document').trim().isLength({ min: 5, max: 50 }).withMessage('Document is required'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('nationality').optional().trim().isLength({ max: 100 }),
  ],
  
  // Booking validation
  createBooking: [
    body('guest_id').isInt({ min: 1 }).withMessage('Valid guest_id is required'),
    body('bed_id').isInt({ min: 1 }).withMessage('Valid bed_id is required'),
    body('check_in').isISO8601().withMessage('Valid check_in date is required'),
    body('check_out').isISO8601().withMessage('Valid check_out date is required'),
    body('nights').isInt({ min: 1 }).withMessage('Nights must be at least 1'),
    body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  ],
  
  // iCal source validation
  createIcalSource: [
    body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name is required'),
    body('source_type').isIn(['booking', 'hostelworld', 'airbnb', 'custom']).withMessage('Invalid source type'),
    body('ical_url').isURL().withMessage('Valid iCal URL is required'),
    body('room_id').optional().isInt({ min: 1 }),
    body('bed_id').optional().isInt({ min: 1 }),
  ],
  
  // ID parameter validation
  idParam: [
    param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  ],
  
  // Pagination validation
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
};

/**
 * SQL Injection Protection
 * (Already handled by parameterized queries, but additional sanitization)
 */
const sanitizeInput = (req, res, next) => {
  // Remove any SQL keywords from user input
  const sqlKeywords = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)/gi;
  
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(sqlKeywords, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach((key) => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };
  
  // Sanitize body, query, params (only in development warning mode)
  if (process.env.NODE_ENV !== 'production') {
    if (req.body) req.body = sanitize({ ...req.body });
    if (req.query) req.query = sanitize({ ...req.query });
    if (req.params) req.params = sanitize({ ...req.params });
  }
  
  next();
};

/**
 * Security Headers Middleware
 */
const securityHeaders = (req, res, next) => {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Remove powered-by header
  res.removeHeader('X-Powered-By');
  
  next();
};

module.exports = {
  helmetConfig,
  apiLimiter,
  authLimiter,
  writeLimiter,
  corsOptions,
  validate,
  validationRules,
  sanitizeInput,
  securityHeaders,
};
