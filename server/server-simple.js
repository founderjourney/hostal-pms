// ALMANIK PMS - PRODUCTION GRADE SERVER
// SQLite (desarrollo) + PostgreSQL (producción) + Express
// Security: Helmet, Rate Limiting, CORS, Input Validation
// Monitoring: Winston, Sentry, Performance Tracking

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const DatabaseAdapter = require('./db-adapter');

// Import configuration modules
const logger = require('./config/logger');
const {
  helmetConfig,
  apiLimiter,
  authLimiter,
  writeLimiter,
  corsOptions,
  validate,
  validationRules,
  sanitizeInput,
  securityHeaders,
} = require('./config/security');
const {
  initSentry,
  sentryErrorHandler,
  healthCheck,
  performanceMonitoring,
  initPerformanceMetrics,
  getPerformanceStats,
} = require('./config/monitoring');
const {
  QueryMonitor,
  queryStatsMiddleware,
  getQueryStatsHandler,
} = require('./config/queryMonitoring');

const app = express();

// ============================================
// SECURITY & MONITORING MIDDLEWARE (FIRST!)
// ============================================

// Sentry error tracking (must be first)
initSentry(app);

// Compression
app.use(compression());

// Security headers (Helmet)
app.use(helmetConfig);

// Additional security headers
app.use(securityHeaders);

// CORS (restrictive in production)
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(logger.http);

// Performance monitoring
initPerformanceMetrics();
app.use(performanceMonitoring(logger));

// Input sanitization
app.use(sanitizeInput);

// Database adapter - auto-detecta SQLite o PostgreSQL
const dbAdapter = new DatabaseAdapter();
let db = null;

// Query performance monitoring
const queryMonitor = new QueryMonitor(dbAdapter);
app.use(queryStatsMiddleware(queryMonitor));

// Promise wrapper for database operations (compatibilidad)
const dbGet = async (sql, params = []) => {
  return await dbAdapter.get(dbAdapter.convertSQL(sql), params);
};

const dbAll = async (sql, params = []) => {
  return await dbAdapter.query(dbAdapter.convertSQL(sql), params);
};

const dbRun = async (sql, params = []) => {
  return await dbAdapter.run(dbAdapter.convertSQL(sql), params);
};

// Activity logging helper function
async function logActivity(actionType, module, description, userId = null, entityId = null, entityType = null, details = null, ipAddress = null) {
  try {
    await dbRun(
      'INSERT INTO activity_log (action_type, module, description, user_id, entity_id, entity_type, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [actionType, module, description, userId, entityId, entityType, details, ipAddress]
    );
  } catch (err) {
    logger.error('Error logging activity:', err);
  }
}

// Initialize database with tables and demo data
async function initializeDatabase() {
  try {
    console.log('📊 Creating tables...');

    // Create tables
    await dbRun(`CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      document TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS beds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      status TEXT DEFAULT 'clean',
      room TEXT,
      guest_id INTEGER,
      notes TEXT,
      maintenance_reason TEXT,
      reserved_until DATETIME,
      reserved_for_guest_id INTEGER,
      last_cleaned_at DATETIME,
      last_cleaned_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(guest_id) REFERENCES guests(id)
    )`);

    // Bed History Table (tracks all bed state changes)
    await dbRun(`CREATE TABLE IF NOT EXISTS bed_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bed_id INTEGER NOT NULL,
      guest_id INTEGER,
      action TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      notes TEXT,
      performed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bed_id) REFERENCES beds(id),
      FOREIGN KEY(guest_id) REFERENCES guests(id)
    )`);

    // Products Table
    await dbRun(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sale Items Table (for POS)
    await dbRun(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      price_at_sale REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Cashbox Movements Table
    await dbRun(`CREATE TABLE IF NOT EXISTS cashbox_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- income, expense
      category TEXT,
      amount REAL NOT NULL,
      description TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER,
      bed_id INTEGER,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      nights INTEGER NOT NULL DEFAULT 1,
      total REAL NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      bed_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // POS/Products tables
    await dbRun(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Staff management table
    await dbRun(`CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      salary REAL,
      schedule TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tours management tables
    await dbRun(`CREATE TABLE IF NOT EXISTS tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      duration TEXT,
      provider TEXT NOT NULL,
      commission_rate REAL DEFAULT 10,
      booking_url TEXT,
      images TEXT,
      clicks INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS tour_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tour_id INTEGER,
      guest_id INTEGER,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS tour_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tour_id INTEGER,
      guest_id INTEGER,
      amount REAL NOT NULL,
      booking_reference TEXT,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Activity logging table - tracks all system activities for reports
    await dbRun(`CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      module TEXT NOT NULL,
      description TEXT NOT NULL,
      user_id INTEGER,
      entity_id INTEGER,
      entity_type TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Guest Reviews tables (DEV4 - Feedback System)
    await dbRun(`CREATE TABLE IF NOT EXISTS guest_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER REFERENCES guests(id),
      booking_id INTEGER REFERENCES bookings(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      category_ratings TEXT,
      review_token TEXT UNIQUE,
      token_expires_at DATETIME,
      staff_response TEXT,
      responded_by INTEGER,
      responded_at DATETIME,
      is_public BOOLEAN DEFAULT 1,
      is_verified BOOLEAN DEFAULT 0,
      language TEXT DEFAULT 'es',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS review_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER REFERENCES bookings(id),
      review_token TEXT NOT NULL,
      sent_via TEXT DEFAULT 'email',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      opened_at DATETIME,
      completed_at DATETIME,
      reminder_sent_at DATETIME
    )`);

    // Push Notifications tables (DEV2-03)
    await dbRun(`CREATE TABLE IF NOT EXISTS push_subscriptions (
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
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS notification_history (
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
    )`);

    // Migration: Add image_url to products if not exists (DEV2-05)
    try {
      await dbRun(`ALTER TABLE products ADD COLUMN image_url TEXT`);
      console.log('✅ Migration: Added image_url to products table');
    } catch (e) {
      // Column already exists, ignore
    }

    // Check if we need demo data
    const guestCount = await dbGet('SELECT COUNT(*) as count FROM guests');
    if (guestCount.count === 0) {
      await createDemoData();
    }

    // Create demo users
    await createDemoUsers();

    console.log('✅ Database initialization complete');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
  }
}

async function createDemoData() {
  console.log('📋 Creating demo data...');

  try {
    // Insert demo guests (nombres colombianos)
    await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
      ['Juan Carlos Pérez', 'juan.perez@gmail.com', '+57 310 234 5678', '1012345678']);
    await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
      ['María González Hernández', 'maria.gonzalez@hotmail.com', '+57 311 987 6543', '1098765432']);
    await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
      ['Carlos Eduardo Silva', 'carlos.silva@gmail.com', '+57 312 555 1234', '1023456789']);
    await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
      ['Ana Lucía Rodríguez', 'ana.rodriguez@yahoo.com', '+57 315 888 9999', '1087654321']);
    await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
      ['Diego Alejandro Martínez', 'diego.martinez@gmail.com', '+57 318 777 2222', '1034567890']);
    await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
      ['Valentina Morales López', 'valentina.morales@gmail.com', '+57 319 444 3333', '1056789012']);

    // Insert real beds based on habitaciones.txt structure

    // Habitacion 1: 9 camas (1-1 to 1-9)
    for (let i = 1; i <= 9; i++) {
      const status = i <= 2 ? 'occupied' : i <= 6 ? 'clean' : 'dirty';
      await dbRun('INSERT INTO beds (name, price, status, room) VALUES (?, ?, ?, ?)', [`1-${i}`, 25.00, status, 'Habitacion 1']);
    }

    // Habitacion 2: 6 camas (2-1 to 2-6)
    for (let i = 1; i <= 6; i++) {
      const status = i <= 1 ? 'occupied' : i <= 4 ? 'clean' : 'dirty';
      await dbRun('INSERT INTO beds (name, price, status, room) VALUES (?, ?, ?, ?)', [`2-${i}`, 25.00, status, 'Habitacion 2']);
    }

    // Habitacion 3: 4 camas (3-1 to 3-4)
    for (let i = 1; i <= 4; i++) {
      const status = i <= 2 ? 'clean' : 'dirty';
      await dbRun('INSERT INTO beds (name, price, status, room) VALUES (?, ?, ?, ?)', [`3-${i}`, 25.00, status, 'Habitacion 3']);
    }

    // Habitacion 4: 5 camas (4-1 to 4-5)
    for (let i = 1; i <= 5; i++) {
      const status = i <= 3 ? 'clean' : 'dirty';
      await dbRun('INSERT INTO beds (name, price, status, room) VALUES (?, ?, ?, ?)', [`4-${i}`, 25.00, status, 'Habitacion 4']);
    }

    // Priv 1: 2 camas privadas
    await dbRun('INSERT INTO beds (name, price, status, room) VALUES (?, ?, ?, ?)', ['Priv1-1', 50.00, 'occupied', 'Priv 1']);
    await dbRun('INSERT INTO beds (name, price, status, room) VALUES (?, ?, ?, ?)', ['Priv1-2', 50.00, 'clean', 'Priv 1']);

    // Priv 2: 1 cama privada
    await dbRun('INSERT INTO beds (name, price, status, room) VALUES (?, ?, ?, ?)', ['Priv2-1', 60.00, 'clean', 'Priv 2']);

    // Create active bookings
    const guest1 = await dbGet('SELECT id FROM guests WHERE document = ?', ['1012345678']);
    const bed1 = await dbGet('SELECT id FROM beds WHERE name = ?', ['1-1']);

    if (guest1 && bed1) {
      const booking1 = await dbRun(
        'INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total) VALUES (?, ?, date("now"), date("now", "+3 days"), 3, 75.00)',
        [guest1.id, bed1.id]
      );

      await dbRun('UPDATE beds SET guest_id = ? WHERE id = ?', [guest1.id, bed1.id]);

      // Add transactions
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking1.id, 'charge', 'Cargo habitación - 3 noches', 75.00]);
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking1.id, 'payment', 'Pago anticipo', 25.00]);
    }

    // Second active booking
    const guest2 = await dbGet('SELECT id FROM guests WHERE document = ?', ['1098765432']);
    const bed2 = await dbGet('SELECT id FROM beds WHERE name = ?', ['Priv1-1']);

    if (guest2 && bed2) {
      const booking2 = await dbRun(
        'INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total) VALUES (?, ?, date("now"), date("now", "+2 days"), 2, 100.00)',
        [guest2.id, bed2.id]
      );

      await dbRun('UPDATE beds SET guest_id = ? WHERE id = ?', [guest2.id, bed2.id]);

      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking2.id, 'charge', 'Cargo habitación - 2 noches', 100.00]);
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking2.id, 'charge', 'Cerveza Águila x2', 7.00]);
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking2.id, 'payment', 'Pago completo', 107.00]);
    }

    // Demo direct sales
    await dbRun('INSERT INTO transactions (type, description, amount, method) VALUES (?, ?, ?, ?)',
      ['sale', 'Café Colombiano x2', 4.00, 'cash']);
    await dbRun('INSERT INTO transactions (type, description, amount, method) VALUES (?, ?, ?, ?)',
      ['sale', 'Agua Cristal', 1.00, 'cash']);

    // Demo products for POS
    const products = [
      ['Café Colombiano', 2.50, 'Bebidas', 50],
      ['Cerveza Corona', 4.00, 'Bebidas', 30],
      ['Cerveza Águila', 3.50, 'Bebidas', 25],
      ['Agua Botella', 1.50, 'Bebidas', 60],
      ['Gaseosa Coca-Cola', 2.00, 'Bebidas', 40],
      ['Arepa con Queso', 3.00, 'Comida', 20],
      ['Sandwich Jamón', 5.50, 'Comida', 15],
      ['Empanada', 1.80, 'Comida', 25],
      ['Chips Papas', 2.20, 'Snacks', 35],
      ['Galletas Oreo', 1.50, 'Snacks', 40]
    ];

    for (const [name, price, category, stock] of products) {
      await dbRun('INSERT INTO products (name, price, category, stock) VALUES (?, ?, ?, ?)',
        [name, price, category, stock]);
    }

    // Demo staff members
    const staff = [
      ['Juan Pérez', 'Recepcionista', '+57 310 234 5678', 'juan.recepcion@almanik.com', 1200000, 'Mañana: 6:00-14:00'],
      ['María García', 'Limpieza', '+57 311 987 6543', 'maria.limpieza@almanik.com', 950000, 'Completo: 8:00-16:00'],
      ['Carlos López', 'Seguridad', '+57 312 555 1234', 'carlos.seguridad@almanik.com', 1100000, 'Noche: 22:00-6:00'],
      ['Ana Ruiz', 'Recepcionista', '+57 315 888 9999', 'ana.recepcion@almanik.com', 1200000, 'Tarde: 14:00-22:00'],
      ['Pedro Silva', 'Mantenimiento', '+57 318 777 2222', 'pedro.mantenimiento@almanik.com', 1050000, 'Mañana: 7:00-15:00']
    ];

    for (const [name, position, phone, email, salary, schedule] of staff) {
      await dbRun('INSERT INTO staff (name, position, phone, email, salary, schedule) VALUES (?, ?, ?, ?, ?, ?)',
        [name, position, phone, email, salary, schedule]);
    }

    // Demo tours
    const tours = [
      [
        'City Tour Medellín',
        'Recorrido completo por los sitios más emblemáticos de Medellín incluyendo Plaza Botero, Pueblito Paisa y Metrocable.',
        65000,
        '6 horas',
        'TurMedellín',
        15,
        'https://turismo-medellin.com/city-tour',
        JSON.stringify(['https://example.com/medellin1.jpg', 'https://example.com/medellin2.jpg'])
      ],
      [
        'Guatapé y Piedra del Peñón',
        'Visita al colorido pueblo de Guatapé y escalada a la famosa Piedra del Peñón con vista panorámica.',
        85000,
        '8 horas',
        'Guatapé Tours',
        20,
        'https://guatape-tours.com/penon',
        JSON.stringify(['https://example.com/guatape1.jpg', 'https://example.com/penon1.jpg'])
      ],
      [
        'Comuna 13 Graffiti Tour',
        'Tour por la transformación urbana de la Comuna 13 con sus increíbles grafitis y escaleras eléctricas.',
        45000,
        '4 horas',
        'Comuna13 Experience',
        18,
        'https://comuna13tours.com/graffiti',
        JSON.stringify(['https://example.com/comuna13-1.jpg', 'https://example.com/graffiti1.jpg'])
      ],
      [
        'Jardín Botánico y Parque Explora',
        'Visita educativa al Jardín Botánico de Medellín y el interactivo Parque Explora.',
        40000,
        '5 horas',
        'EcoTours Medellín',
        12,
        'https://ecotours-medellin.com/botanico',
        JSON.stringify(['https://example.com/botanico1.jpg', 'https://example.com/explora1.jpg'])
      ],
      [
        'Pablo Escobar Historical Tour',
        'Tour histórico siguiendo los sitios relacionados con Pablo Escobar y la historia de Medellín.',
        55000,
        '5 horas',
        'Historia Viva Tours',
        15,
        'https://historia-viva.com/escobar-tour',
        JSON.stringify(['https://example.com/historical1.jpg', 'https://example.com/medellin-history.jpg'])
      ]
    ];

    for (const [name, description, price, duration, provider, commission_rate, booking_url, images] of tours) {
      await dbRun('INSERT INTO tours (name, description, price, duration, provider, commission_rate, booking_url, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, description, price, duration, provider, commission_rate, booking_url, images]);
    }

    console.log('✅ Demo data created successfully');
  } catch (err) {
    console.error('❌ Demo data creation failed:', err);
  }
}

// AUTH SYSTEM WITH ROLES
const bcrypt = require('bcryptjs');
const activeSessions = new Map(); // Store session data

// Initialize demo users
async function createDemoUsers() {
  console.log('👥 Creating demo users...');

  try {
    // Check if admin user exists
    const adminExists = await dbGet('SELECT id FROM users WHERE username = ?', ['admin']);

    if (!adminExists) {
      // Create admin user with password from environment
      const adminPassword = process.env.ADMIN_PASSWORD || 'CHANGE_ME_IN_PRODUCTION';
      if (adminPassword === 'CHANGE_ME_IN_PRODUCTION' && process.env.NODE_ENV === 'production') {
        throw new Error('🚨 FATAL: ADMIN_PASSWORD must be set in production environment!');
      }
      if (adminPassword === 'CHANGE_ME_IN_PRODUCTION') {
        console.warn('⚠️  WARNING: Using default admin password. Set ADMIN_PASSWORD in .env!');
      }
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await dbRun(`
        INSERT INTO users (username, email, name, password_hash, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['admin', 'admin@hostal.com', 'Administrador Principal', adminHash, 'administrador', JSON.stringify({
        users: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        reports: ['read', 'export'],
        all_modules: true
      })]);

      // Create reception user with password from environment
      const receptionPassword = process.env.RECEPTION_PASSWORD || 'CHANGE_ME_IN_PRODUCTION';
      if (receptionPassword === 'CHANGE_ME_IN_PRODUCTION' && process.env.NODE_ENV === 'production') {
        throw new Error('🚨 FATAL: RECEPTION_PASSWORD must be set in production environment!');
      }
      const receptionHash = await bcrypt.hash(receptionPassword, 10);
      await dbRun(`
        INSERT INTO users (username, email, name, password_hash, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['recepcion', 'recepcion@hostal.com', 'Personal de Recepción', receptionHash, 'recepcionista', JSON.stringify({
        guests: ['create', 'read', 'update'],
        bookings: ['create', 'read', 'update'],
        pos: ['create', 'read'],
        reports: ['read']
      })]);

      // Create volunteer user
      const volunteerHash = await bcrypt.hash('voluntario123', 10);
      await dbRun(`
        INSERT INTO users (username, email, name, password_hash, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['voluntario', 'voluntario@hostal.com', 'Voluntario', volunteerHash, 'voluntario', JSON.stringify({
        guests: ['read'],
        pos: ['create', 'read'],
        tours: ['read']
      })]);

      console.log('✅ Demo users created successfully');
    }
  } catch (err) {
    console.error('❌ Error creating demo users:', err);
  }
}

// Debug endpoint to check database connectivity
app.get('/api/debug/users', async (req, res) => {
  try {
    let users;
    if (process.env.NODE_ENV === 'production') {
      users = await dbAdapter.query('SELECT username, role, is_active FROM users LIMIT 5');
    } else {
      users = await dbAll('SELECT username, role, is_active FROM users LIMIT 5');
    }
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Debug endpoint to test login (temporary - remove in production)
app.post('/api/debug/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Debug login attempt:', username);

    // Get user
    const user = await dbAdapter.get(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (!user) {
      return res.json({ step: 'user_lookup', error: 'User not found', username });
    }

    console.log('User found, checking password...');

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);

    res.json({
      step: 'complete',
      userFound: true,
      passwordValid: isValid,
      role: user.role,
      hashPrefix: user.password_hash.substring(0, 10)
    });
  } catch (err) {
    res.status(500).json({
      step: 'error',
      error: err.message,
      stack: err.stack
    });
  }
});

// Apply rate limiting to API routes (disabled in development)
if (process.env.NODE_ENV === 'production') {
  app.use('/api', apiLimiter);
} else {
  console.log('⚠️ Rate limiting disabled in development mode');
}

// Login endpoint with strict rate limiting
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // Get user from database
    let user;
    try {
      if (process.env.NODE_ENV === 'production') {
        // Direct PostgreSQL query
        user = await dbAdapter.get(
          'SELECT id, username, email, name, password_hash, role, permissions, is_active FROM users WHERE username = $1 AND is_active = true',
          [username]
        );
      } else {
        // SQLite query
        user = await dbGet(
          'SELECT id, username, email, name, password_hash, role, permissions, is_active FROM users WHERE username = ? AND is_active = true',
          [username]
        );
      }
    } catch (dbErr) {
      console.error('Database error:', dbErr);
      return res.status(500).json({ success: false, message: 'Database connection error' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptErr) {
      console.error('Bcrypt error:', bcryptErr);
      return res.status(500).json({ success: false, message: 'Password verification error' });
    }

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    try {
      if (process.env.NODE_ENV === 'production') {
        await dbAdapter.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
      } else {
        await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      }
    } catch (updateErr) {
      console.error('Update login error:', updateErr);
      // Continue anyway
    }

    // Create session
    const sessionId = Date.now().toString();
    activeSessions.set(sessionId, {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
      loginTime: new Date()
    });

    res.json({
      success: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: JSON.parse(user.permissions || '{}')
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  const { sessionId } = req.body;
  activeSessions.delete(sessionId);
  res.json({ success: true });
});

// Auth middleware
const requireAuth = (req, res, next) => {
  const sessionId = req.headers['session-id'];
  const session = activeSessions.get(sessionId);

  if (session) {
    req.user = session; // Attach user info to request
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};

// ============================================
// FEEDBACK ENDPOINT (Day 8)
// ============================================
app.post('/api/feedback', async (req, res) => {
  try {
    const { type, message, rating, email } = req.body;

    if (!message || !type) {
      return res.status(400).json({ error: 'Type and message are required' });
    }

    // Log feedback to database (activity_log for now, or a new table if needed)
    // Using activity_log is a quick win for Day 8
    await logActivity(
      'feedback_received',
      'feedback',
      `Feedback (${type}): ${message.substring(0, 50)}...`,
      req.user ? req.user.id : null,
      null,
      null,
      JSON.stringify({ type, message, rating, email })
    );

    // Also log to file via Winston
    logger.info(`Feedback received: [${type}] ${message} (Rating: ${rating})`);

    res.json({ success: true, message: 'Feedback received' });
  } catch (error) {
    logger.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ADVANCED REPORTING & AI ENDPOINTS (Day 10)
// ============================================

// 1. Advanced Financial Report
app.get('/api/reports/financial', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // 1. Revenue Breakdown
    const revenueQuery = `
      SELECT type, category, SUM(amount) as total
      FROM cashbox_movements
      WHERE created_at BETWEEN ? AND ? AND type = 'income'
      GROUP BY type, category
    `;
    const revenueRows = await dbAll(revenueQuery, [start + ' 00:00:00', end + ' 23:59:59']);

    // 2. Occupancy Stats
    const bedsQuery = `SELECT COUNT(*) as total FROM beds WHERE status != 'maintenance'`;
    const bedsResult = await dbGet(bedsQuery);
    const totalBeds = bedsResult ? parseInt(bedsResult.total) : 1;

    const bookingsQuery = `
      SELECT COUNT(*) as occupied
      FROM bookings
      WHERE check_in <= ? AND check_out >= ? AND status IN ('confirmed', 'checked_in')
    `;
    const bookingsResult = await dbGet(bookingsQuery, [end, start]); // Note: Overlap logic check_in <= end AND check_out >= start
    const occupiedBeds = bookingsResult ? parseInt(bookingsResult.occupied) : 0;

    const occupancyRate = (occupiedBeds / totalBeds) * 100;

    // 3. RevPAB (Revenue Per Available Bed)
    const totalRevenue = revenueRows.reduce((sum, row) => sum + parseFloat(row.total), 0);
    const revPAB = totalRevenue / totalBeds;

    res.json({
      period: { start, end },
      financials: {
        total_revenue: totalRevenue,
        breakdown: revenueRows,
        rev_pab: revPAB.toFixed(2)
      },
      occupancy: {
        total_beds: totalBeds,
        occupied_beds: occupiedBeds,
        rate: occupancyRate.toFixed(1) + '%'
      }
    });
  } catch (error) {
    logger.error('Error in financial report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Occupancy Forecast (Basic AI/Projection)
app.get('/api/reports/forecast', async (req, res) => {
  try {
    // Simple projection for next 7 days
    const forecast = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Count confirmed bookings for this date
      const query = `
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE check_in <= ? AND check_out > ? AND status IN ('confirmed', 'checked_in')
      `;
      const result = await dbGet(query, [dateStr, dateStr]);
      const confirmed = result ? parseInt(result.count) : 0;

      // Add "predicted" walk-ins (simple heuristic: random 1-3 for demo or avg based on history)
      const predictedWalkIns = Math.floor(Math.random() * 3) + 1;

      forecast.push({
        date: dateStr,
        confirmed: confirmed,
        predicted_walkins: predictedWalkIns,
        total_projected: confirmed + predictedWalkIns
      });
    }

    res.json({ forecast });
  } catch (error) {
    logger.error('Error in forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Smart Insights (Business Alerts)
app.get('/api/reports/insights', async (req, res) => {
  try {
    const insights = [];

    // Check Occupancy for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const bedsQuery = `SELECT COUNT(*) as total FROM beds WHERE status != 'maintenance'`;
    const bedsResult = await dbGet(bedsQuery);
    const totalBeds = bedsResult ? parseInt(bedsResult.total) : 27;

    const bookingsQuery = `
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE check_in <= ? AND check_out > ? AND status IN ('confirmed', 'checked_in')
    `;
    const bookingsResult = await dbGet(bookingsQuery, [dateStr, dateStr]);
    const occupied = bookingsResult ? parseInt(bookingsResult.count) : 0;
    const occupancyRate = (occupied / totalBeds) * 100;

    if (occupancyRate < 30) {
      insights.push({
        type: 'warning',
        icon: 'fa-exclamation-triangle',
        title: 'Low Occupancy Alert',
        message: `Tomorrow's occupancy is only ${occupancyRate.toFixed(1)}%. Consider running a promotion.`
      });
    } else if (occupancyRate > 90) {
      insights.push({
        type: 'success',
        icon: 'fa-chart-line',
        title: 'High Demand Alert',
        message: `Tomorrow is ${occupancyRate.toFixed(1)}% full! Ensure all staff are scheduled.`
      });
    }

    // Check Top Selling Product
    const topProductQuery = `
      SELECT p.name, SUM(si.quantity) as total
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.name
      ORDER BY total DESC
      LIMIT 1
    `;
    const topProductRows = await dbAll(topProductQuery);
    if (topProductRows.length > 0) {
      insights.push({
        type: 'info',
        icon: 'fa-trophy',
        title: 'Top Seller',
        message: `${topProductRows[0].name} is your best selling item. Keep it in stock!`
      });
    }

    res.json({ insights });
  } catch (error) {
    logger.error('Error in insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DEV2-06: GRAFICOS INTERACTIVOS - ENDPOINTS
// ============================================

// 4. Monthly Occupancy Data (Bar Chart)
app.get('/api/reports/occupancy-monthly', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const values = [];

    const bedsResult = await dbGet(`SELECT COUNT(*) as total FROM beds WHERE status != 'maintenance'`);
    const totalBeds = bedsResult ? parseInt(bedsResult.total) : 27;

    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === 12
        ? `${parseInt(year) + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const daysInMonth = new Date(year, month, 0).getDate();

      const query = `
        SELECT COUNT(*) as nights
        FROM bookings
        WHERE check_in < ? AND check_out > ?
          AND status IN ('confirmed', 'checked_in', 'checked_out')
      `;
      const result = await dbGet(query, [endDate, startDate]);
      const occupiedNights = result ? parseInt(result.nights) : 0;

      const maxNights = totalBeds * daysInMonth;
      const occupancy = maxNights > 0 ? Math.round((occupiedNights / maxNights) * 100) : 0;
      values.push(Math.min(occupancy, 100));
    }

    res.json({ labels, values });
  } catch (error) {
    logger.error('Error in occupancy-monthly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Weekly Revenue Data (Line Chart)
app.get('/api/reports/revenue-weekly', async (req, res) => {
  try {
    const labels = [];
    const values = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      labels.push(`Sem ${12 - i}`);

      // Sum from cashbox transactions
      const query = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM cashbox_transactions
        WHERE transaction_type = 'income'
          AND created_at >= ? AND created_at < ?
      `;
      const result = await dbGet(query, [startStr, endStr]);
      values.push(result ? parseFloat(result.total) : 0);
    }

    res.json({ labels, values });
  } catch (error) {
    logger.error('Error in revenue-weekly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Guest Distribution Data (Pie Chart)
// Uses booking source or guest nationality for distribution
app.get('/api/reports/guest-distribution', async (req, res) => {
  try {
    const { by = 'source' } = req.query; // 'source' or 'nationality'

    if (by === 'nationality') {
      // Distribution by guest nationality
      const query = `
        SELECT
          COALESCE(g.nationality, 'No especificado') as type,
          COUNT(DISTINCT b.id) as count
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        WHERE b.status IN ('confirmed', 'checked_in', 'checked_out')
        GROUP BY g.nationality
        ORDER BY count DESC
        LIMIT 10
      `;
      const rows = await dbAll(query);

      if (rows.length > 0) {
        res.json({
          labels: rows.map(r => r.type),
          values: rows.map(r => parseInt(r.count))
        });
        return;
      }
    }

    // Default: Distribution by booking source
    const sourceQuery = `
      SELECT
        COALESCE(source, 'walkin') as type,
        COUNT(*) as count
      FROM bookings
      WHERE status IN ('confirmed', 'checked_in', 'checked_out', 'pending')
      GROUP BY source
      ORDER BY count DESC
    `;
    const sourceRows = await dbAll(sourceQuery);

    const sourceLabels = {
      'walkin': 'Walk-in',
      'booking': 'Booking.com',
      'airbnb': 'Airbnb',
      'direct': 'Directo',
      'phone': 'Teléfono',
      'email': 'Email',
      'website': 'Web',
      'referral': 'Referido'
    };

    if (sourceRows.length > 0) {
      res.json({
        labels: sourceRows.map(r => sourceLabels[r.type] || r.type),
        values: sourceRows.map(r => parseInt(r.count))
      });
    } else {
      // Return sample data if no bookings
      res.json({
        labels: ['Walk-in', 'Booking.com', 'Directo', 'Teléfono'],
        values: [40, 30, 20, 10]
      });
    }
  } catch (error) {
    logger.error('Error in guest-distribution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Year-over-Year Comparison Data (Line Chart)
app.get('/api/reports/yoy-comparison', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYearData = [];
    const previousYearData = [];

    for (let month = 1; month <= 12; month++) {
      // Current year
      const currStart = `${currentYear}-${String(month).padStart(2, '0')}-01`;
      const currEnd = month === 12
        ? `${currentYear + 1}-01-01`
        : `${currentYear}-${String(month + 1).padStart(2, '0')}-01`;

      const currQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM cashbox_transactions
        WHERE transaction_type = 'income'
          AND created_at >= ? AND created_at < ?
      `;
      const currResult = await dbGet(currQuery, [currStart, currEnd]);
      currentYearData.push(currResult ? parseFloat(currResult.total) : 0);

      // Previous year
      const prevStart = `${previousYear}-${String(month).padStart(2, '0')}-01`;
      const prevEnd = month === 12
        ? `${previousYear + 1}-01-01`
        : `${previousYear}-${String(month + 1).padStart(2, '0')}-01`;

      const prevResult = await dbGet(currQuery, [prevStart, prevEnd]);
      previousYearData.push(prevResult ? parseFloat(prevResult.total) : 0);
    }

    res.json({
      labels,
      currentYear: currentYearData,
      previousYear: previousYearData
    });
  } catch (error) {
    logger.error('Error in yoy-comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// IMPORT MODULES
// ============================================

const reservationsModule = require('./modules/reservations');
const icalSyncModule = require('./modules/ical-sync');
const analyticsModule = require('./modules/analytics');
const staffModule = require('./modules/staff');
const tasksModule = require('./modules/tasks');
const cashboxModule = require('./modules/cashbox');
const bedsAdvancedModule = require('./modules/beds-advanced');
const frontDeskModule = require('./modules/front-desk');
const paymentsModule = require('./modules/payments');
const reviewsModule = require('./modules/reviews');
const adminBackupsModule = require('./modules/admin-backups');
const pricingModule = require('./modules/pricing');
const auditModule = require('./modules/audit');
const notificationsModule = require('./modules/notifications');
const whatsappModule = require('./modules/whatsapp');
const emailModule = require('./modules/email');
const smsModule = require('./modules/sms');
const ICalSyncCron = require('./cron/sync-ical');
const whatsappAutomation = require('./cron/whatsapp-automation');
const smsAutomation = require('./cron/sms-automation');

// ============================================
// MIDDLEWARES
// ============================================

// Permission check middleware
const requirePermission = (module, action) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Admin has all permissions
    if (user.role === 'administrador' || user.permissions.all_modules) {
      return next();
    }

    // Check specific permission
    const modulePermissions = user.permissions[module];
    if (modulePermissions && modulePermissions.includes(action)) {
      return next();
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// ================================================
// MONITORING & HEALTH ENDPOINTS
// ================================================

// Ping endpoint - ultra-fast, no database (for Vercel warm-up)
app.get('/ping', (req, res) => {
  res.json({
    pong: true,
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Warmup endpoint - pre-warms database connection
app.get('/warmup', async (req, res) => {
  const startTime = Date.now();
  try {
    await dbAdapter.get('SELECT 1 as warmup');
    res.json({
      status: 'warm',
      dbResponseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'cold',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint (public, no auth)
app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck(dbAdapter);
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Performance metrics endpoint (requires auth)
app.get('/api/metrics/performance', requireAuth, (req, res) => {
  try {
    const stats = getPerformanceStats();
    res.json(stats);
  } catch (error) {
    logger.error('Performance metrics failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query performance metrics endpoint (requires auth)
app.get('/api/metrics/queries', requireAuth, getQueryStatsHandler(queryMonitor));

// ================================================
// USER MANAGEMENT ENDPOINTS
// ================================================

// ============================================
// MODULE ROUTES
// ============================================

// Reservations module (new)
app.use('/api/reservations', requireAuth, (req, res, next) => {
  // Attach session info for the module to use
  req.session = req.user;
  next();
}, reservationsModule);

// iCal Sync module (OTA integration)
// Export endpoints are public (OTAs need to access them)
// Management endpoints require auth
app.use('/api/ical', (req, res, next) => {
  // Public endpoints (iCal export)
  if (req.path.match(/\.(ics)$/)) {
    // Allow public access to .ics files
    req.app.locals.db = dbAdapter;
    return next();
  }

  // All other endpoints require auth
  requireAuth(req, res, () => {
    req.sessionInfo = req.user;
    req.app.locals.db = dbAdapter;
    next();
  });
}, icalSyncModule);

// Analytics module (business intelligence)
app.use('/api/analytics', requireAuth, (req, res, next) => {
  req.app.locals.db = dbAdapter;
  next();
}, analyticsModule);

// Staff Management module
app.use('/api/staff', requireAuth, (req, res, next) => {
  req.app.locals.db = dbAdapter;
  req.session = req.user;
  next();
}, staffModule);

// Tasks/Maintenance module
app.use('/api/tasks', requireAuth, (req, res, next) => {
  req.app.locals.db = dbAdapter;
  req.session = req.user;
  next();
}, tasksModule);

// Cashbox/Finance module
app.use('/api/cashbox', requireAuth, (req, res, next) => {
  req.app.locals.db = dbAdapter;
  req.session = req.user;
  next();
}, cashboxModule);

// Payments module (Stripe integration)
// Note: /webhook endpoint should be accessible without auth for Stripe webhooks
app.use('/api/payments', (req, res, next) => {
  req.app.locals.db = dbAdapter;
  // Skip auth for webhook endpoint
  if (req.path === '/webhook') {
    return next();
  }
  // All other endpoints require authentication
  requireAuth(req, res, () => {
    req.session = req.user;
    next();
  });
}, paymentsModule);

// Email module (SendGrid integration)
app.use('/api/email', (req, res, next) => {
  req.app.locals.db = dbAdapter;
  // Status endpoint is public
  if (req.path === '/status' && req.method === 'GET') {
    return next();
  }
  // All other endpoints require authentication
  requireAuth(req, res, () => {
    req.session = req.user;
    next();
  });
}, emailModule);

// SMS module (Twilio integration)
app.use('/api/sms', (req, res, next) => {
  req.app.locals.db = dbAdapter;
  // Status endpoint is public
  if (req.path === '/status' && req.method === 'GET') {
    return next();
  }
  // All other endpoints require authentication
  requireAuth(req, res, () => {
    req.session = req.user;
    next();
  });
}, smsModule);

// Reviews module (guest feedback system)
// Public endpoints: GET /public, GET /token/:token, POST / (with token)
// Auth required: GET /, GET /stats, GET /:id, POST /:id/respond, PUT /:id/visibility, POST /request/:bookingId
app.use('/api/reviews', (req, res, next) => {
  req.app.locals.db = dbAdapter;
  // Public endpoints (no auth required)
  const publicPaths = ['/public', '/token'];
  const isPublicGet = req.method === 'GET' && publicPaths.some(p => req.path.startsWith(p));
  const isPublicPost = req.method === 'POST' && req.path === '/';

  if (isPublicGet || isPublicPost) {
    return next();
  }
  // All other endpoints require authentication
  requireAuth(req, res, () => {
    req.session = req.user;
    next();
  });
}, reviewsModule);

// Admin Backups module (backup/restore management)
// All endpoints require admin authentication
app.use('/api/admin/backups', requireAuth, (req, res, next) => {
  req.app.set('db', dbAdapter);
  req.session = req.user;
  // Only admins can access backup functions
  if (req.user.role !== 'admin' && req.user.role !== 'administrador') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, adminBackupsModule);

// Audit module (DEV3-11: Complete Audit Logging)
// All endpoints require admin authentication
auditModule.initDb(dbAll, dbGet, dbRun);
auditModule.migrateAuditTable().catch(err => logger.error('Audit migration error:', err));
app.use('/api/admin/audit', requireAuth, (req, res, next) => {
  req.session = req.user;
  if (req.session?.role !== 'admin' && req.session?.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, auditModule.router);

// Push Notifications module (DEV2-03)
// Public endpoints: GET /vapid-public-key
// Auth required: POST /subscribe, DELETE /unsubscribe, POST /test, POST /send, GET /subscriptions
notificationsModule.configureVapid();
app.use('/api/notifications', (req, res, next) => {
  req.app.locals.db = dbAdapter;
  // Public endpoint (no auth required)
  if (req.method === 'GET' && req.path === '/vapid-public-key') {
    return next();
  }
  // All other endpoints require authentication
  requireAuth(req, res, () => {
    req.session = req.user;
    next();
  });
}, notificationsModule);

// WhatsApp module (DEV4-04: Evolution API Integration)
// Public endpoints: POST /webhook (for incoming messages)
// Auth required: All other endpoints
app.use('/api/whatsapp', (req, res, next) => {
  req.db = dbAdapter;
  // Webhook endpoint is public (called by Evolution API)
  if (req.method === 'POST' && req.path === '/webhook') {
    return next();
  }
  // All other endpoints require authentication
  requireAuth(req, res, () => {
    req.session = req.user;
    next();
  });
}, whatsappModule);

// Pricing module (DEV3-05: Dynamic Pricing)
// Initialize pricing module with database functions
pricingModule.initDb(dbAll, dbGet, dbRun);
pricingModule.initPricingTables().then(() => {
  console.log('   ✅ Pricing tables initialized');
}).catch(err => {
  console.error('   ❌ Pricing tables error:', err.message);
});
app.use('/api/pricing', requireAuth, (req, res, next) => {
  req.app.locals.db = dbAdapter;
  req.session = req.user;
  next();
}, pricingModule.router);

// Advanced Bed Management module (in-app routes)
bedsAdvancedModule.registerBedAdvancedRoutes(app, requireAuth, dbAll, dbGet, dbRun, logActivity);

// Front Desk module (quick check-in/out for 2am scenarios)
frontDeskModule.registerFrontDeskRoutes(app, requireAuth, dbAll, dbGet, dbRun, logActivity);

// ============================================
// API ROUTES
// ============================================

// Get all users (admin only)
app.get('/api/users', requireAuth, requirePermission('users', 'read'), async (req, res) => {
  try {
    const users = await dbAll(`
      SELECT id, username, email, name, role, is_active, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user (admin only)
app.post('/api/users', requireAuth, requirePermission('users', 'create'), async (req, res) => {
  try {
    const { username, email, name, password, role, permissions } = req.body;

    if (!username || !name || !password || !role) {
      return res.status(400).json({ error: 'Username, name, password and role are required' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Default permissions based on role
    let defaultPermissions = {};

    switch (role) {
      case 'administrador':
        defaultPermissions = {
          users: ['create', 'read', 'update', 'delete'],
          settings: ['read', 'update'],
          reports: ['read', 'export'],
          all_modules: true
        };
        break;
      case 'recepcionista':
        defaultPermissions = {
          guests: ['create', 'read', 'update'],
          bookings: ['create', 'read', 'update'],
          pos: ['create', 'read'],
          reports: ['read']
        };
        break;
      case 'voluntario':
        defaultPermissions = {
          guests: ['read'],
          pos: ['create', 'read'],
          tours: ['read']
        };
        break;
      default:
        defaultPermissions = {
          tours: ['read']
        };
    }

    const finalPermissions = permissions || defaultPermissions;

    const result = await dbRun(`
      INSERT INTO users (username, email, name, password_hash, role, permissions)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, email, name, passwordHash, role, JSON.stringify(finalPermissions)]);

    const newUser = await dbGet(`
      SELECT id, username, email, name, role, is_active, created_at
      FROM users WHERE id = ?
    `, [result.id]);

    res.json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint') || err.message.includes('duplicate key')) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Get user roles and permissions structure
app.get('/api/roles', requireAuth, requirePermission('users', 'read'), (req, res) => {
  const roles = {
    administrador: {
      name: 'Administrador',
      description: 'Acceso completo al sistema',
      permissions: {
        users: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        reports: ['read', 'export'],
        all_modules: true
      }
    },
    recepcionista: {
      name: 'Recepcionista',
      description: 'Gestión de huéspedes y reservas',
      permissions: {
        guests: ['create', 'read', 'update'],
        bookings: ['create', 'read', 'update'],
        pos: ['create', 'read'],
        reports: ['read']
      }
    },
    voluntario: {
      name: 'Voluntario',
      description: 'Acceso limitado para voluntarios',
      permissions: {
        guests: ['read'],
        pos: ['create', 'read'],
        tours: ['read']
      }
    }
  };

  res.json(roles);
});

// ================================================
// API ENDPOINTS
// ================================================

// GUESTS
app.get('/api/guests', requireAuth, async (req, res) => {
  try {
    // Query mejorada: incluye cama actual y booking activo
    const guests = await dbAll(`
      SELECT
        g.*,
        b.id as current_bed_id,
        b.name as current_bed_name,
        b.room as current_room,
        bk.check_in,
        bk.check_out,
        bk.total as booking_total
      FROM guests g
      LEFT JOIN beds b ON b.guest_id = g.id AND b.status = 'occupied'
      LEFT JOIN bookings bk ON bk.guest_id = g.id AND bk.bed_id = b.id AND bk.status = 'active'
      ORDER BY g.name
    `);
    res.json(guests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/guests', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, document } = req.body;

    if (!name || !document) {
      return res.status(400).json({ error: 'Name and document are required' });
    }

    const result = await dbRun(
      'INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
      [name, email, phone, document]
    );

    const newGuest = await dbGet('SELECT * FROM guests WHERE id = ?', [result.id]);
    res.json(newGuest);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Document number already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// CRUD COMPLETO PARA HUÉSPEDES
app.get('/api/guests/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const guests = await dbAll(`
      SELECT g.*,
             b.name as current_bed_name,
             b.id as current_bed_id,
             bk.check_in,
             bk.check_out
      FROM guests g
      LEFT JOIN beds b ON g.id = b.guest_id AND b.status = 'occupied'
      LEFT JOIN bookings bk ON g.id = bk.guest_id AND bk.status = 'active'
      WHERE g.name LIKE ? OR g.document LIKE ? OR g.email LIKE ? OR g.phone LIKE ?
      ORDER BY g.name
    `, [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);

    res.json(guests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/guests/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, document } = req.body;

    if (!name || !document) {
      return res.status(400).json({ error: 'Name and document are required' });
    }

    await dbRun(
      'UPDATE guests SET name = ?, email = ?, phone = ?, document = ? WHERE id = ?',
      [name, email, phone, document, id]
    );

    const updatedGuest = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
    res.json(updatedGuest);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Document number already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete('/api/guests/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el huésped no esté actualmente hospedado
    const activeBooking = await dbGet('SELECT id FROM bookings WHERE guest_id = ? AND status = ?', [id, 'active']);
    if (activeBooking) {
      return res.status(400).json({ error: 'Cannot delete guest with active booking' });
    }

    await dbRun('DELETE FROM guests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Guest deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guests/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const guest = await dbGet(`
      SELECT g.*,
             b.name as current_bed_name,
             b.id as current_bed_id,
             bk.check_in,
             bk.check_out,
             bk.nights,
             bk.total as booking_total
      FROM guests g
      LEFT JOIN beds b ON g.id = b.guest_id AND b.status = 'occupied'
      LEFT JOIN bookings bk ON g.id = bk.guest_id AND bk.status = 'active'
      WHERE g.id = ?
    `, [id]);

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    // Obtener historial de reservas
    const bookingHistory = await dbAll(`
      SELECT bk.*, b.name as bed_name
      FROM bookings bk
      LEFT JOIN beds b ON bk.bed_id = b.id
      WHERE bk.guest_id = ?
      ORDER BY bk.created_at DESC
    `, [id]);

    res.json({
      ...guest,
      booking_history: bookingHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guests/stats', requireAuth, async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT
        COUNT(*) as total_guests,
        COUNT(CASE WHEN b.guest_id IS NOT NULL THEN 1 END) as currently_staying,
        COUNT(CASE WHEN bk.status = 'active' THEN 1 END) as active_bookings
      FROM guests g
      LEFT JOIN beds b ON g.id = b.guest_id AND b.status = 'occupied'
      LEFT JOIN bookings bk ON g.id = bk.guest_id AND bk.status = 'active'
    `);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GDPR ENDPOINTS (DEV3-12)

/**
 * GET /api/guests/:id/export-data
 * Export all data related to a guest (GDPR Data Portability)
 */
app.get('/api/guests/:id/export-data', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get guest basic info
    const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    // Get all bookings
    const bookings = await dbAll(`
      SELECT b.*, bed.name as bed_name, bed.room
      FROM bookings b
      LEFT JOIN beds bed ON b.bed_id = bed.id
      WHERE b.guest_id = ?
      ORDER BY b.created_at DESC
    `, [id]);

    // Get all transactions
    const transactions = await dbAll(`
      SELECT t.*
      FROM transactions t
      JOIN bookings b ON t.booking_id = b.id
      WHERE b.guest_id = ?
      ORDER BY t.created_at DESC
    `, [id]);

    // Get all reviews
    const reviews = await dbAll(`
      SELECT * FROM guest_reviews
      WHERE guest_id = ?
      ORDER BY created_at DESC
    `, [id]);

    // Get activity log related to this guest
    const activityLog = await dbAll(`
      SELECT * FROM activity_log
      WHERE entity_type = 'guest' AND entity_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [id]);

    // Get push subscriptions (if any)
    const subscriptions = await dbAll(`
      SELECT endpoint, created_at FROM push_subscriptions
      WHERE user_id = ?
    `, [id]);

    const exportData = {
      exportDate: new Date().toISOString(),
      dataSubject: {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        document: guest.document,
        nationality: guest.nationality,
        createdAt: guest.created_at
      },
      bookings: bookings.map(b => ({
        id: b.id,
        bedName: b.bed_name,
        room: b.room,
        checkIn: b.check_in,
        checkOut: b.check_out,
        nights: b.nights,
        total: b.total,
        status: b.status,
        source: b.source,
        notes: b.notes,
        createdAt: b.created_at
      })),
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        paymentMethod: t.payment_method,
        description: t.description,
        createdAt: t.created_at
      })),
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        staffResponse: r.staff_response,
        createdAt: r.created_at
      })),
      activityLog: activityLog.map(a => ({
        action: a.action_type,
        description: a.description,
        createdAt: a.created_at
      })),
      pushSubscriptions: subscriptions.length,
      metadata: {
        totalBookings: bookings.length,
        totalTransactions: transactions.length,
        totalSpent: transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
        firstVisit: bookings.length > 0 ? bookings[bookings.length - 1].check_in : null,
        lastVisit: bookings.length > 0 ? bookings[0].check_in : null
      }
    };

    // Log the export
    await dbRun(`
      INSERT INTO activity_log (action_type, module, description, user_id, entity_type, entity_id, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['gdpr_export', 'guests', `Data export for guest: ${guest.name}`, req.user?.id, 'guest', id, req.ip]);

    res.json({
      success: true,
      format: 'JSON',
      data: exportData
    });
  } catch (err) {
    logger.error('GDPR export error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/guests/:id/anonymize
 * Anonymize guest data (GDPR Right to Erasure)
 * Preserves booking records for business reporting but removes PII
 */
app.delete('/api/guests/:id/anonymize', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has admin role
    if (req.user?.role !== 'admin' && req.user?.role !== 'administrador') {
      return res.status(403).json({ error: 'Admin access required for anonymization' });
    }

    // Get guest info for logging
    const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    // Check for active bookings
    const activeBooking = await dbGet(`
      SELECT id FROM bookings
      WHERE guest_id = ? AND status IN ('confirmed', 'checked_in', 'pending')
    `, [id]);

    if (activeBooking) {
      return res.status(400).json({
        error: 'Cannot anonymize guest with active bookings',
        activeBookingId: activeBooking.id
      });
    }

    // Generate anonymous identifier
    const anonymousId = `ANON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Anonymize guest record
    await dbRun(`
      UPDATE guests
      SET name = ?,
          email = NULL,
          phone = NULL,
          document = ?,
          nationality = NULL,
          notes = 'Data anonymized per GDPR request'
      WHERE id = ?
    `, [`Anonymous Guest (${anonymousId})`, anonymousId, id]);

    // Anonymize booking notes that might contain PII
    await dbRun(`
      UPDATE bookings
      SET notes = CASE WHEN notes IS NOT NULL THEN '[Anonymized]' ELSE NULL END
      WHERE guest_id = ?
    `, [id]);

    // Remove from reviews (keep rating for stats, remove personal comments)
    await dbRun(`
      UPDATE guest_reviews
      SET comment = '[Removed per GDPR request]'
      WHERE guest_id = ?
    `, [id]);

    // Delete push subscriptions
    await dbRun(`DELETE FROM push_subscriptions WHERE user_id = ?`, [id]);

    // Log the anonymization
    await dbRun(`
      INSERT INTO activity_log (action_type, module, description, user_id, entity_type, entity_id, ip_address, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'gdpr_anonymize',
      'guests',
      `Guest data anonymized: ${guest.name} -> ${anonymousId}`,
      req.user?.id,
      'guest',
      id,
      req.ip,
      JSON.stringify({
        originalName: guest.name,
        originalEmail: guest.email,
        anonymousId,
        reason: req.body?.reason || 'GDPR request'
      })
    ]);

    res.json({
      success: true,
      message: 'Guest data has been anonymized',
      anonymousId,
      details: {
        guestRecordAnonymized: true,
        bookingNotesCleared: true,
        reviewsAnonymized: true,
        pushSubscriptionsDeleted: true
      }
    });
  } catch (err) {
    logger.error('GDPR anonymize error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/gdpr/retention-policy
 * Get data retention policy information
 */
app.get('/api/gdpr/retention-policy', requireAuth, async (req, res) => {
  res.json({
    success: true,
    policy: {
      guestData: {
        retentionPeriod: '3 years after last checkout',
        legalBasis: 'Contractual obligation and legitimate interest',
        automaticDeletion: false
      },
      bookingRecords: {
        retentionPeriod: '7 years (tax/accounting requirements)',
        legalBasis: 'Legal obligation',
        automaticDeletion: false
      },
      transactionRecords: {
        retentionPeriod: '7 years (tax/accounting requirements)',
        legalBasis: 'Legal obligation',
        automaticDeletion: false
      },
      activityLogs: {
        retentionPeriod: '2 years',
        legalBasis: 'Legitimate interest (security)',
        automaticDeletion: true
      },
      reviews: {
        retentionPeriod: 'Until deletion request',
        legalBasis: 'Consent',
        automaticDeletion: false
      }
    },
    dataSubjectRights: {
      access: 'GET /api/guests/:id/export-data',
      rectification: 'PUT /api/guests/:id',
      erasure: 'DELETE /api/guests/:id/anonymize',
      portability: 'GET /api/guests/:id/export-data (JSON format)'
    },
    contact: {
      dataController: 'Almanik PMS',
      email: process.env.GDPR_CONTACT_EMAIL || 'privacy@example.com'
    }
  });
});

// BEDS
app.get('/api/beds', requireAuth, async (req, res) => {
  try {
    const beds = await dbAll(`
      SELECT
        b.*,
        g.name as guest_name,
        g.document as guest_document
      FROM beds b
      LEFT JOIN guests g ON b.guest_id = g.id
      ORDER BY b.name
    `);
    res.json(beds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/beds/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === 'clean') {
      await dbRun('UPDATE beds SET status = ?, guest_id = NULL WHERE id = ?', [status, id]);
    } else {
      await dbRun('UPDATE beds SET status = ? WHERE id = ?', [status, id]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD COMPLETO PARA CAMAS
app.post('/api/beds', requireAuth, async (req, res) => {
  try {
    const { name, price, room } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = await dbRun(
      'INSERT INTO beds (name, price, room, status) VALUES (?, ?, ?, ?)',
      [name, parseFloat(price), room, 'clean']
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Bed created successfully'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Bed name already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.put('/api/beds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, room, status, notes } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    await dbRun(
      'UPDATE beds SET name = ?, price = ?, room = ?, status = ?, notes = ? WHERE id = ?',
      [name, parseFloat(price), room, status || 'clean', notes || null, id]
    );

    res.json({ success: true, message: 'Bed updated successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Bed name already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete('/api/beds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la cama no esté ocupada
    const bed = await dbGet('SELECT status FROM beds WHERE id = ?', [id]);
    if (!bed) {
      return res.status(404).json({ error: 'Bed not found' });
    }

    if (bed.status === 'occupied') {
      return res.status(400).json({ error: 'Cannot delete occupied bed' });
    }

    await dbRun('DELETE FROM beds WHERE id = ?', [id]);
    res.json({ success: true, message: 'Bed deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/beds/by-room', requireAuth, async (req, res) => {
  try {
    // Query mejorada: incluye datos del booking activo y pagos
    const beds = await dbAll(`
      SELECT
        b.*,
        g.name as guest_name,
        g.document as guest_document,
        g.phone as guest_phone,
        g.email as guest_email,
        bk.id as booking_id,
        bk.check_in,
        bk.check_out,
        bk.nights,
        bk.total as booking_total,
        bk.status as booking_status,
        COALESCE(
          (SELECT SUM(amount) FROM transactions WHERE booking_id = bk.id AND type = 'payment'),
          0
        ) as amount_paid,
        rg.name as reserved_guest_name
      FROM beds b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN bookings bk ON bk.bed_id = b.id AND bk.status = 'active'
      LEFT JOIN guests rg ON b.reserved_for_guest_id = rg.id
      ORDER BY b.room, b.name
    `);

    // Calcular saldo pendiente y agregar a cada cama
    const bedsWithBalance = beds.map(bed => ({
      ...bed,
      amount_due: bed.booking_total ? (bed.booking_total - (bed.amount_paid || 0)) : 0
    }));

    // Agrupar por habitación
    const bedsByRoom = bedsWithBalance.reduce((acc, bed) => {
      const room = bed.room || 'Sin Asignar';
      if (!acc[room]) {
        acc[room] = [];
      }
      acc[room].push(bed);
      return acc;
    }, {});

    res.json(bedsByRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DASHBOARD OPERATIVO - Check-ins y Check-outs del día
app.get('/api/dashboard/today', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check-outs programados para hoy
    const checkoutsToday = await dbAll(`
      SELECT
        bk.id as booking_id,
        bk.check_out,
        bk.total,
        b.name as bed_name,
        b.room,
        g.name as guest_name,
        g.phone as guest_phone,
        COALESCE(
          (SELECT SUM(amount) FROM transactions WHERE booking_id = bk.id AND type = 'payment'),
          0
        ) as amount_paid
      FROM bookings bk
      JOIN beds b ON bk.bed_id = b.id
      JOIN guests g ON bk.guest_id = g.id
      WHERE bk.check_out = ? AND bk.status = 'active'
      ORDER BY b.room, b.name
    `, [today]);

    // Check-ins programados para hoy (reservas que comienzan hoy)
    const checkinsToday = await dbAll(`
      SELECT
        bk.id as booking_id,
        bk.check_in,
        bk.check_out,
        bk.nights,
        bk.total,
        b.name as bed_name,
        b.room,
        g.name as guest_name,
        g.phone as guest_phone
      FROM bookings bk
      JOIN beds b ON bk.bed_id = b.id
      JOIN guests g ON bk.guest_id = g.id
      WHERE bk.check_in = ? AND bk.status IN ('pending', 'confirmed')
      ORDER BY b.room, b.name
    `, [today]);

    // Check-outs de mañana (preview)
    const checkoutsTomorrow = await dbAll(`
      SELECT
        bk.id as booking_id,
        bk.check_out,
        b.name as bed_name,
        b.room,
        g.name as guest_name
      FROM bookings bk
      JOIN beds b ON bk.bed_id = b.id
      JOIN guests g ON bk.guest_id = g.id
      WHERE bk.check_out = ? AND bk.status = 'active'
      ORDER BY b.room, b.name
    `, [tomorrow]);

    // Estadísticas de ocupación
    const occupancyStats = await dbGet(`
      SELECT
        COUNT(*) as total_beds,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'clean' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'dirty' THEN 1 ELSE 0 END) as needs_cleaning,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM beds
    `);

    // Ingresos del día
    const todayRevenue = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'payment' AND DATE(created_at) = ?
    `, [today]);

    // Agregar saldo pendiente a checkouts
    const checkoutsWithBalance = checkoutsToday.map(co => ({
      ...co,
      amount_due: co.total - (co.amount_paid || 0)
    }));

    res.json({
      date: today,
      checkouts_today: checkoutsWithBalance,
      checkins_today: checkinsToday,
      checkouts_tomorrow: checkoutsTomorrow,
      occupancy: {
        ...occupancyStats,
        occupancy_rate: occupancyStats.total_beds > 0
          ? Math.round((occupancyStats.occupied / occupancyStats.total_beds) * 100)
          : 0
      },
      revenue_today: todayRevenue.total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DASHBOARD KPI WIDGETS - DEV2-10
// ============================================
app.get('/api/dashboard/kpi', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // ===== OCCUPANCY KPI =====
    const occupancyStats = await dbGet(`
      SELECT
        COUNT(*) as total_beds,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'clean' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'dirty' THEN 1 ELSE 0 END) as dirty
      FROM beds
    `);

    // Yesterday's occupancy (from activity_log if available, otherwise estimate)
    const yesterdayOccupancy = await dbGet(`
      SELECT COUNT(DISTINCT bed_id) as occupied
      FROM bookings
      WHERE status = 'active'
        AND check_in <= ? AND check_out > ?
    `, [yesterday, yesterday]) || { occupied: 0 };

    const occupancyRate = occupancyStats.total_beds > 0
      ? Math.round((occupancyStats.occupied / occupancyStats.total_beds) * 100)
      : 0;

    const yesterdayRate = occupancyStats.total_beds > 0
      ? Math.round((yesterdayOccupancy.occupied / occupancyStats.total_beds) * 100)
      : 0;

    // ===== REVENUE KPI =====
    const todayRevenue = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type IN ('payment', 'sale', 'tour_sale')
        AND DATE(created_at) = ?
    `, [today]);

    const yesterdayRevenue = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type IN ('payment', 'sale', 'tour_sale')
        AND DATE(created_at) = ?
    `, [yesterday]);

    // ===== CHECK-INS PENDING KPI =====
    const pendingCheckins = await dbAll(`
      SELECT
        bk.id,
        bk.check_in,
        g.name as guest_name,
        b.name as bed_name
      FROM bookings bk
      JOIN beds b ON bk.bed_id = b.id
      JOIN guests g ON bk.guest_id = g.id
      WHERE bk.check_in = ? AND bk.status IN ('pending', 'confirmed')
      ORDER BY g.name
    `, [today]);

    // ===== PENDING TASKS KPI =====
    let pendingTasks = [];
    try {
      pendingTasks = await dbAll(`
        SELECT id, title, priority, due_date, assigned_to
        FROM tasks
        WHERE status != 'completed'
          AND (due_date <= ? OR due_date IS NULL)
        ORDER BY
          CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
          due_date
        LIMIT 10
      `, [today]);
    } catch (e) {
      // tasks table may not exist
      pendingTasks = [];
    }

    // ===== ALERTS KPI =====
    const alerts = [];

    // Beds needing cleaning
    if (occupancyStats.dirty > 0) {
      const dirtyBeds = await dbAll(`
        SELECT name, room FROM beds WHERE status = 'dirty' LIMIT 5
      `);
      dirtyBeds.forEach(bed => {
        alerts.push({
          type: 'warning',
          icon: 'fa-broom',
          message: `Cama ${bed.name} necesita limpieza`,
          action: 'beds'
        });
      });
    }

    // Unpaid bookings (active with balance due)
    const unpaidBookings = await dbAll(`
      SELECT
        bk.id,
        bk.total,
        g.name as guest_name,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE booking_id = bk.id AND type = 'payment'), 0) as paid
      FROM bookings bk
      JOIN guests g ON bk.guest_id = g.id
      WHERE bk.status = 'active'
        AND bk.total > COALESCE((SELECT SUM(amount) FROM transactions WHERE booking_id = bk.id AND type = 'payment'), 0)
      LIMIT 5
    `);

    unpaidBookings.forEach(booking => {
      const balance = booking.total - booking.paid;
      if (balance > 0) {
        alerts.push({
          type: 'danger',
          icon: 'fa-dollar-sign',
          message: `${booking.guest_name}: $${balance.toLocaleString()} pendiente`,
          action: 'guests',
          booking_id: booking.id
        });
      }
    });

    // Late checkouts (past checkout time, still active)
    const now = new Date();
    const checkoutHour = parseInt(process.env.CHECKOUT_TIME?.split(':')[0] || '11');
    if (now.getHours() >= checkoutHour) {
      const lateCheckouts = await dbAll(`
        SELECT
          bk.id,
          g.name as guest_name,
          b.name as bed_name
        FROM bookings bk
        JOIN beds b ON bk.bed_id = b.id
        JOIN guests g ON bk.guest_id = g.id
        WHERE bk.check_out = ? AND bk.status = 'active'
        LIMIT 3
      `, [today]);

      lateCheckouts.forEach(booking => {
        alerts.push({
          type: 'info',
          icon: 'fa-clock',
          message: `Check-out tardío: ${booking.guest_name} (${booking.bed_name})`,
          action: 'beds',
          booking_id: booking.id
        });
      });
    }

    // ===== RESPONSE =====
    res.json({
      timestamp: new Date().toISOString(),

      occupancy: {
        rate: occupancyRate,
        occupied: occupancyStats.occupied,
        available: occupancyStats.available,
        total: occupancyStats.total_beds,
        vs_yesterday: occupancyRate - yesterdayRate,
        yesterday_rate: yesterdayRate
      },

      revenue: {
        today: todayRevenue.total || 0,
        yesterday: yesterdayRevenue.total || 0,
        vs_yesterday: yesterdayRevenue.total > 0
          ? Math.round(((todayRevenue.total - yesterdayRevenue.total) / yesterdayRevenue.total) * 100)
          : (todayRevenue.total > 0 ? 100 : 0),
        formatted: `$${(todayRevenue.total || 0).toLocaleString()}`
      },

      checkins: {
        count: pendingCheckins.length,
        items: pendingCheckins.slice(0, 5)
      },

      tasks: {
        count: pendingTasks.length,
        items: pendingTasks.slice(0, 5)
      },

      alerts: {
        count: alerts.length,
        items: alerts
      }
    });
  } catch (err) {
    logger.error('KPI endpoint error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// CHECK-IN
app.post('/api/checkin', requireAuth, async (req, res) => {
  try {
    const { guest_id, bed_id, check_in, check_out, total } = req.body;

    // Check bed availability
    const bed = await dbGet('SELECT * FROM beds WHERE id = ? AND status = ?', [bed_id, 'clean']);
    if (!bed) {
      return res.status(400).json({ error: 'Bed is not available' });
    }

    // Calculate nights
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    // Create booking
    const booking = await dbRun(
      'INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total) VALUES (?, ?, ?, ?, ?, ?)',
      [guest_id, bed_id, check_in, check_out, nights, total]
    );

    // Update bed status
    await dbRun('UPDATE beds SET status = ?, guest_id = ? WHERE id = ?', ['occupied', guest_id, bed_id]);

    // Create charge
    await dbRun(
      'INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
      [booking.id, 'charge', `Room charge - ${nights} nights`, total]
    );

    res.json({ success: true, booking_id: booking.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHECK-OUT
app.post('/api/checkout/:bed_id', requireAuth, async (req, res) => {
  try {
    const { bed_id } = req.params;
    const { payment_amount, payment_method } = req.body;

    // Get active booking
    const booking = await dbGet(
      'SELECT * FROM bookings WHERE bed_id = ? AND status = ?',
      [bed_id, 'active']
    );

    if (!booking) {
      return res.status(404).json({ error: 'No active booking found' });
    }

    // Add payment if provided
    if (payment_amount && payment_amount > 0) {
      await dbRun(
        'INSERT INTO transactions (booking_id, type, description, amount, method) VALUES (?, ?, ?, ?, ?)',
        [booking.id, 'payment', 'Check-out payment', payment_amount, payment_method || 'cash']
      );
    }

    // Complete booking
    await dbRun('UPDATE bookings SET status = ? WHERE id = ?', ['completed', booking.id]);

    // Update bed status
    await dbRun('UPDATE beds SET status = ?, guest_id = NULL WHERE id = ?', ['dirty', bed_id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BALANCE
app.get('/api/balance/:bed_id', requireAuth, async (req, res) => {
  try {
    const { bed_id } = req.params;

    const booking = await dbGet(
      'SELECT * FROM bookings WHERE bed_id = ? AND status = ?',
      [bed_id, 'active']
    );

    if (!booking) {
      return res.status(404).json({ error: 'No active booking' });
    }

    const transactions = await dbAll(
      'SELECT * FROM transactions WHERE booking_id = ? ORDER BY created_at',
      [booking.id]
    );

    let totalCharges = 0;
    let totalPayments = 0;

    transactions.forEach(t => {
      if (t.type === 'charge') totalCharges += t.amount;
      if (t.type === 'payment') totalPayments += t.amount;
    });

    res.json({
      booking,
      transactions,
      totalCharges,
      totalPayments,
      balance: totalCharges - totalPayments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POS SALES
app.post('/api/sell', requireAuth, async (req, res) => {
  try {
    const { product_id, quantity, booking_id } = req.body;

    const products = [
      { id: 1, name: 'Cerveza Águila', price: 3.50 },
      { id: 2, name: 'Agua Cristal', price: 1.00 },
      { id: 3, name: 'Gaseosa Colombiana', price: 2.00 },
      { id: 4, name: 'Arepa con Queso', price: 5.00 },
      { id: 5, name: 'Empanada', price: 2.50 },
      { id: 6, name: 'Café Colombiano', price: 2.00 }
    ];

    const product = products.find(p => p.id === parseInt(product_id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const total = product.price * quantity;
    const description = `${product.name} x${quantity}`;

    if (booking_id) {
      // Charge to room
      await dbRun(
        'INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking_id, 'charge', description, total]
      );
    } else {
      // Direct sale
      await dbRun(
        'INSERT INTO transactions (type, description, amount, method) VALUES (?, ?, ?, ?)',
        ['sale', description, total, 'cash']
      );
    }

    res.json({ success: true, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PRODUCTS (Productos colombianos)
app.get('/api/products', requireAuth, (req, res) => {
  const products = [
    { id: 1, name: 'Cerveza Águila', price: 3.50, category: 'bebidas' },
    { id: 2, name: 'Agua Cristal', price: 1.00, category: 'bebidas' },
    { id: 3, name: 'Gaseosa Colombiana', price: 2.00, category: 'bebidas' },
    { id: 4, name: 'Arepa con Queso', price: 5.00, category: 'comida' },
    { id: 5, name: 'Empanada', price: 2.50, category: 'comida' },
    { id: 6, name: 'Café Colombiano', price: 2.00, category: 'bebidas' }
  ];
  res.json(products);
});

// DASHBOARD
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    // Today's revenue
    const todayRevenue = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type IN ('payment', 'sale')
      AND DATE(created_at) = DATE('now')
    `);

    // Active bookings
    const activeBookings = await dbGet(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE status = 'active'
    `);

    res.json({
      todayRevenue: todayRevenue.total,
      activeBookings: activeBookings.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// COMPREHENSIVE ANALYTICS & REPORTS API
// ============================================

app.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const { start, end, type = 'overview' } = req.query;
    let reportData;

    logger.info(`Generating comprehensive ${type} analytics for ${start} to ${end}`);

    // Validate dates
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999); // Include full end date

    // Log activity
    await logActivity('generate_report', 'reports', `Generated ${type} report for ${start} to ${end}`, null, null, 'report', JSON.stringify({ type, start, end }));

    // ================================================
    // OVERVIEW REPORT - COMPREHENSIVE ANALYTICS
    // ================================================
    if (type === 'overview') {
      // Get all data needed for comprehensive analytics
      const [
        totalRevenue,
        totalBookings,
        totalGuests,
        occupancyData,
        topGuests,
        topProducts,
        weeklyRevenue,
        dailyOccupancy,
        additionalMetrics
      ] = await Promise.all([
        // Total Revenue (bookings + POS)
        dbGet(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'charge' THEN amount ELSE 0 END), 0) as bookingRevenue,
            COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END), 0) as posRevenue
          FROM transactions
          WHERE created_at BETWEEN ? AND ?
        `, [start, end]),

        // Total Bookings
        dbGet(`
          SELECT COUNT(*) as count, AVG(total) as avgRate, SUM(nights) as totalNights
          FROM bookings
          WHERE created_at BETWEEN ? AND ?
        `, [start, end]),

        // Unique Guests
        dbGet(`
          SELECT
            COUNT(DISTINCT guest_id) as uniqueGuests,
            COUNT(*) as totalBookings
          FROM bookings
          WHERE created_at BETWEEN ? AND ?
        `, [start, end]),

        // Occupancy Calculation (simplified)
        dbGet(`
          SELECT
            COUNT(*) as occupiedNights,
            (SELECT COUNT(*) FROM beds) as totalBeds
          FROM bookings
          WHERE check_in <= ? AND check_out >= ?
        `, [end, start]),

        // Top Guests by nights
        dbAll(`
          SELECT g.name, SUM(b.nights) as nights
          FROM guests g
          JOIN bookings b ON g.id = b.guest_id
          WHERE b.created_at BETWEEN ? AND ?
          GROUP BY g.id, g.name
          ORDER BY nights DESC
          LIMIT 5
        `, [start, end]),

        // Top Products (simulated data for now)
        dbAll(`
          SELECT 'Cerveza Corona' as name, 45 as quantity
          UNION SELECT 'Agua Botella', 38
          UNION SELECT 'Sandwich Jamón', 22
          UNION SELECT 'Café', 67
          UNION SELECT 'Arepa Queso', 31
          ORDER BY quantity DESC
          LIMIT 5
        `),

        // Daily occupancy simulation
        dbAll(`
          SELECT
            DATE(check_in) as date,
            COUNT(*) as bookings
          FROM bookings
          WHERE check_in BETWEEN ? AND ?
          GROUP BY DATE(check_in)
          ORDER BY date DESC
          LIMIT 7
        `, [start, end])
      ]);

      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const totalRevenueCombined = (totalRevenue?.bookingRevenue || 0) + (totalRevenue?.posRevenue || 0);
      const avgOccupancy = occupancyData?.totalBeds > 0 ?
        ((occupancyData?.occupiedNights || 0) / (occupancyData.totalBeds * daysDiff)) * 100 : 0;

      reportData = {
        kpis: {
          totalRevenue: totalRevenueCombined,
          avgOccupancy: avgOccupancy,
          totalGuests: totalGuests?.uniqueGuests || 0,
          repeatGuests: Math.max(0, (totalGuests?.totalBookings || 0) - (totalGuests?.uniqueGuests || 0)),
          avgDailyRate: totalBookings?.avgRate || 0,
          totalNights: totalBookings?.totalNights || 0
        },
        trends: {
          weeklyRevenue: [1200, 1400, 1100, 1350], // Simulated weekly data
          dailyOccupancy: [75, 82, 68, 91, 77, 85, 93] // Simulated daily percentages
        },
        topGuests: topGuests || [],
        topProducts: topProducts || []
      };
    }

    // ================================================
    // REVENUE REPORT - ANÁLISIS FINANCIERO DETALLADO
    // ================================================
    else if (type === 'revenue') {
      const revenueBreakdown = await dbGet(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'charge' THEN amount ELSE 0 END), 0) as accommodation,
          COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END), 0) as pos,
          COALESCE(SUM(amount), 0) as total,
          COUNT(CASE WHEN type = 'charge' THEN 1 END) as accommodationTxns,
          COUNT(CASE WHEN type = 'sale' THEN 1 END) as posTxns
        FROM transactions
        WHERE created_at BETWEEN ? AND ?
      `, [start, end]);

      reportData = {
        revenue: {
          accommodation: revenueBreakdown?.accommodation || 0,
          pos: revenueBreakdown?.pos || 0,
          total: revenueBreakdown?.total || 0,
          accommodationTransactions: revenueBreakdown?.accommodationTxns || 0,
          posTransactions: revenueBreakdown?.posTxns || 0
        }
      };
    }

    // ================================================
    // OCCUPANCY REPORT - ANÁLISIS DE OCUPACIÓN
    // ================================================
    else if (type === 'occupancy') {
      const [occupancyStats, bedUtilization] = await Promise.all([
        dbGet(`
          SELECT
            COUNT(*) as totalBookings,
            SUM(nights) as totalNights,
            AVG(nights) as avgStay,
            (SELECT COUNT(*) FROM beds) as totalBeds
          FROM bookings
          WHERE check_in BETWEEN ? AND ?
        `, [start, end]),

        dbAll(`
          SELECT
            b.name as bedName,
            COUNT(bk.id) as bookings,
            SUM(bk.nights) as nights
          FROM beds b
          LEFT JOIN bookings bk ON b.id = bk.bed_id
            AND bk.check_in BETWEEN ? AND ?
          GROUP BY b.id, b.name
          ORDER BY nights DESC
        `, [start, end])
      ]);

      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const totalPossibleNights = (occupancyStats?.totalBeds || 0) * daysDiff;
      const avgOccupancy = totalPossibleNights > 0 ?
        ((occupancyStats?.totalNights || 0) / totalPossibleNights) * 100 : 0;

      reportData = {
        occupancy: {
          average: avgOccupancy,
          peak: Math.min(100, avgOccupancy * 1.2), // Estimated peak
          totalNights: occupancyStats?.totalNights || 0,
          totalBookings: occupancyStats?.totalBookings || 0,
          avgStay: occupancyStats?.avgStay || 0,
          bedUtilization: bedUtilization || []
        }
      };
    }

    // ================================================
    // GUESTS REPORT - ANÁLISIS DE HUÉSPEDES
    // ================================================
    else if (type === 'guests') {
      const [guestStats, repeatGuests, nationalityStats] = await Promise.all([
        dbGet(`
          SELECT
            COUNT(DISTINCT guest_id) as uniqueGuests,
            COUNT(*) as totalBookings,
            AVG(nights) as avgStay,
            SUM(nights) as totalNights
          FROM bookings
          WHERE created_at BETWEEN ? AND ?
        `, [start, end]),

        dbGet(`
          SELECT
            COUNT(*) as repeatCount
          FROM (
            SELECT guest_id, COUNT(*) as bookings
            FROM bookings
            WHERE created_at BETWEEN ? AND ?
            GROUP BY guest_id
            HAVING bookings > 1
          ) repeat_guests
        `, [start, end]),

        // Simulated nationality data
        dbAll(`
          SELECT 'Colombia' as nationality, 45 as count
          UNION SELECT 'Argentina', 23
          UNION SELECT 'Brasil', 18
          UNION SELECT 'Chile', 12
          UNION SELECT 'Peru', 8
          ORDER BY count DESC
        `)
      ]);

      reportData = {
        guests: {
          total: guestStats?.uniqueGuests || 0,
          repeat: repeatGuests?.repeatCount || 0,
          avgStay: guestStats?.avgStay || 0,
          totalNights: guestStats?.totalNights || 0,
          repeatRate: guestStats?.uniqueGuests > 0 ?
            ((repeatGuests?.repeatCount || 0) / guestStats.uniqueGuests * 100) : 0,
          nationalities: nationalityStats || []
        }
      };
    }

    // ================================================
    // POS REPORT - ANÁLISIS DE VENTAS
    // ================================================
    else if (type === 'pos') {
      // Simulated POS data since we don't have detailed POS transactions yet
      const posStats = {
        totalSales: 2450,
        totalTransactions: 87,
        averageTicket: 28.16,
        topCategories: [
          { category: 'Bebidas', sales: 1200 },
          { category: 'Snacks', sales: 680 },
          { category: 'Comidas', sales: 570 }
        ],
        dailySales: [120, 340, 180, 290, 230, 190, 410]
      };

      reportData = {
        pos: posStats
      };
    }

    logger.info(`Generated ${type} report with ${Object.keys(reportData).length} sections`);
    res.json(reportData);

  } catch (err) {
    logger.error('Reports API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// SERVE STATIC FILES WITH CACHE OPTIMIZATION
// Cache static assets for better performance
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0, // 7 days in production, no cache in dev
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Different cache strategies for different file types
    if (filePath.endsWith('.html')) {
      // HTML files - short cache (1 hour) for frequent updates
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (filePath.match(/\.(css|js)$/)) {
      // CSS/JS files - medium cache (1 day)
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (filePath.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/)) {
      // Images - long cache (7 days)
      res.setHeader('Cache-Control', 'public, max-age=604800');
    } else if (filePath.match(/\.(woff|woff2|ttf|eot)$/)) {
      // Fonts - very long cache (30 days)
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  }
};

app.use(express.static(path.join(__dirname, '..', 'public'), staticOptions));

// ================================================
// POS (POINT OF SALE) ENDPOINTS
// ================================================

// Get all products
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const products = await dbAll('SELECT * FROM products ORDER BY category, name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new product
app.post('/api/products', requireAuth, async (req, res) => {
  try {
    const { name, price, category, stock } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price and category are required' });
    }

    const result = await dbRun(
      'INSERT INTO products (name, price, category, stock) VALUES (?, ?, ?, ?)',
      [name, price, category, stock || 0]
    );

    const newProduct = await dbGet('SELECT * FROM products WHERE id = ?', [result.id]);
    res.json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, stock, image_url } = req.body;

    await dbRun(
      'UPDATE products SET name = ?, price = ?, category = ?, stock = ?, image_url = ? WHERE id = ?',
      [name, price, category, stock, image_url || null, id]
    );

    const updatedProduct = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload product image (base64)
app.post('/api/products/:id/image', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body; // base64 image data

    if (!image) {
      return res.status(400).json({ error: 'Image data required' });
    }

    // Validate product exists
    const product = await dbGet('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Extract base64 data and file type
    const matches = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Use base64 data URL' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size (max 2MB)
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Max 2MB' });
    }

    // Generate filename and save
    const filename = `product_${id}_${Date.now()}.${ext}`;
    const filepath = path.join(__dirname, '../public/uploads/products', filename);

    // Ensure directory exists
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../public/uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Delete old image if exists
    const oldProduct = await dbGet('SELECT image_url FROM products WHERE id = ?', [id]);
    if (oldProduct && oldProduct.image_url) {
      const oldPath = path.join(__dirname, '../public', oldProduct.image_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new image
    fs.writeFileSync(filepath, buffer);

    // Update product with image URL
    const imageUrl = `/uploads/products/${filename}`;
    await dbRun('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, id]);

    const updatedProduct = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ success: true, image_url: imageUrl, product: updatedProduct });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete product image
app.delete('/api/products/:id/image', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs');

    const product = await dbGet('SELECT image_url FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.image_url) {
      const imagePath = path.join(__dirname, '../public', product.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await dbRun('UPDATE products SET image_url = NULL WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process sale
app.post('/api/pos/sale', requireAuth, async (req, res) => {
  try {
    const { items, payment_method, total, bed_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    // Create sale transaction
    const result = await dbRun(
      'INSERT INTO transactions (type, description, amount, method, bed_id) VALUES (?, ?, ?, ?, ?)',
      ['sale', `POS Sale - ${items.length} items`, total, payment_method || 'cash', bed_id || null]
    );

    // Update stock for each item
    for (const item of items) {
      await dbRun(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );

      // Record individual item sale
      await dbRun(
        'INSERT INTO sale_items (transaction_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [result.id, item.id, item.quantity, item.price]
      );
    }

    res.json({ success: true, transaction_id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sales history
app.get('/api/pos/sales', requireAuth, async (req, res) => {
  try {
    const { start, end } = req.query;

    let query = `
      SELECT t.*,
             GROUP_CONCAT(p.name || ' x' || si.quantity) as items
      FROM transactions t
      LEFT JOIN sale_items si ON t.id = si.transaction_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE t.type = 'sale'
    `;

    const params = [];

    if (start && end) {
      query += ' AND t.created_at BETWEEN ? AND ?';
      params.push(start, end);
    }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    const sales = await dbAll(query, params);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================
// STAFF MANAGEMENT ENDPOINTS
// ================================================

// Get all staff
app.get('/api/staff', requireAuth, async (req, res) => {
  try {
    const staff = await dbAll('SELECT * FROM staff ORDER BY name');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new staff member
app.post('/api/staff', requireAuth, async (req, res) => {
  try {
    const { name, position, phone, email, salary, schedule } = req.body;

    if (!name || !position) {
      return res.status(400).json({ error: 'Name and position are required' });
    }

    const result = await dbRun(
      'INSERT INTO staff (name, position, phone, email, salary, schedule) VALUES (?, ?, ?, ?, ?, ?)',
      [name, position, phone, email, salary, schedule]
    );

    const newStaff = await dbGet('SELECT * FROM staff WHERE id = ?', [result.id]);
    res.json(newStaff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update staff member
app.put('/api/staff/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, phone, email, salary, schedule } = req.body;

    await dbRun(
      'UPDATE staff SET name = ?, position = ?, phone = ?, email = ?, salary = ?, schedule = ? WHERE id = ?',
      [name, position, phone, email, salary, schedule, id]
    );

    const updatedStaff = await dbGet('SELECT * FROM staff WHERE id = ?', [id]);
    res.json(updatedStaff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete staff member
app.delete('/api/staff/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM staff WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================
// TOURS MANAGEMENT ENDPOINTS
// ================================================

// Get all tours
app.get('/api/tours', requireAuth, async (req, res) => {
  try {
    const tours = await dbAll('SELECT * FROM tours ORDER BY name');
    res.json(tours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new tour
app.post('/api/tours', requireAuth, async (req, res) => {
  try {
    const { name, description, price, duration, provider, commission_rate, booking_url, images } = req.body;

    if (!name || !price || !provider) {
      return res.status(400).json({ error: 'Name, price and provider are required' });
    }

    const result = await dbRun(
      'INSERT INTO tours (name, description, price, duration, provider, commission_rate, booking_url, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, duration, provider, commission_rate || 10, booking_url, JSON.stringify(images || [])]
    );

    const newTour = await dbGet('SELECT * FROM tours WHERE id = ?', [result.id]);
    res.json(newTour);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track tour click
app.post('/api/tours/:id/click', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { guest_id } = req.body;

    await dbRun(
      'INSERT INTO tour_clicks (tour_id, guest_id, clicked_at) VALUES (?, ?, datetime("now"))',
      [id, guest_id || null]
    );

    // Update click count
    await dbRun('UPDATE tours SET clicks = clicks + 1 WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record tour commission
app.post('/api/tours/:id/commission', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { guest_id, amount, booking_reference } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Commission amount is required' });
    }

    await dbRun(
      'INSERT INTO tour_commissions (tour_id, guest_id, amount, booking_reference, earned_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [id, guest_id, amount, booking_reference]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tour stats
app.get('/api/tours/stats', requireAuth, async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT
        COUNT(*) as total_tours,
        SUM(clicks) as total_clicks,
        COALESCE(SUM(tc.amount), 0) as total_commissions
      FROM tours t
      LEFT JOIN tour_commissions tc ON t.id = tc.tour_id
    `);

    const topTours = await dbAll(`
      SELECT t.name, t.clicks, COALESCE(SUM(tc.amount), 0) as total_commission
      FROM tours t
      LEFT JOIN tour_commissions tc ON t.id = tc.tour_id
      GROUP BY t.id
      ORDER BY t.clicks DESC
      LIMIT 5
    `);

    res.json({
      ...stats,
      top_tours: topTours
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ============================================
// ERROR HANDLING (MUST BE LAST!)
// ============================================

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);

// Custom error handler
app.use((err, req, res, next) => {
  // Log error with Winston
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Send appropriate response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// FASE 1: NUEVOS ENDPOINTS - ARQUITECTURA COHERENTE
// ============================================

/**
 * GET /api/dashboard/occupancy
 * RESPONDE: "¿Quién está hospedado actualmente?"
 * Retorna lista de huéspedes con booking activo (checked_in o active)
 */
app.get('/api/dashboard/occupancy', requireAuth, async (req, res) => {
  try {
    const currentGuests = await dbAll(`
      SELECT
        b.id as booking_id,
        b.confirmation_code,
        b.check_in,
        b.check_out,
        b.nights,
        b.total as total_amount,
        b.status as booking_status,
        b.checked_in_at,
        g.id as guest_id,
        g.name as guest_name,
        g.document as guest_document,
        g.phone as guest_phone,
        g.email as guest_email,
        bd.id as bed_id,
        bd.name as bed_name,
        bd.room as room_name,
        bd.price as price_per_night,
        COALESCE(
          (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
          0
        ) as amount_paid,
        b.total - COALESCE(
          (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
          0
        ) as balance
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN beds bd ON b.bed_id = bd.id
      WHERE b.status IN ('active', 'checked_in')
      ORDER BY bd.room, bd.name
    `);

    // Calcular estadísticas
    const totalBeds = await dbGet('SELECT COUNT(*) as count FROM beds');
    const occupiedCount = currentGuests.length;
    const totalBalance = currentGuests.reduce((sum, g) => sum + (g.balance || 0), 0);

    res.json({
      success: true,
      count: occupiedCount,
      total_beds: totalBeds.count,
      occupancy_rate: totalBeds.count > 0
        ? Math.round((occupiedCount / totalBeds.count) * 100)
        : 0,
      total_pending_balance: totalBalance,
      guests: currentGuests
    });
  } catch (err) {
    logger.error('Error fetching occupancy:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search
 * Búsqueda universal: huésped, reserva, o cama
 */
app.get('/api/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchTerm = `%${q}%`;

    // Buscar huéspedes
    const guests = await dbAll(`
      SELECT
        'guest' as type,
        g.id,
        g.name,
        g.document,
        g.phone,
        g.email,
        (SELECT bd.name FROM beds bd
         JOIN bookings bk ON bd.id = bk.bed_id
         WHERE bk.guest_id = g.id AND bk.status IN ('active', 'checked_in')
         LIMIT 1) as current_bed
      FROM guests g
      WHERE g.name LIKE ? OR g.document LIKE ? OR g.email LIKE ? OR g.phone LIKE ?
      LIMIT 10
    `, [searchTerm, searchTerm, searchTerm, searchTerm]);

    // Buscar reservas por código de confirmación
    const bookings = await dbAll(`
      SELECT
        'booking' as type,
        b.id,
        b.confirmation_code,
        b.check_in,
        b.check_out,
        b.status,
        g.name as guest_name,
        bd.name as bed_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN beds bd ON b.bed_id = bd.id
      WHERE b.confirmation_code LIKE ? OR g.name LIKE ?
      ORDER BY b.created_at DESC
      LIMIT 10
    `, [searchTerm, searchTerm]);

    // Buscar camas
    const beds = await dbAll(`
      SELECT
        'bed' as type,
        bd.id,
        bd.name,
        bd.room,
        bd.status,
        bd.price,
        g.name as guest_name
      FROM beds bd
      LEFT JOIN guests g ON bd.guest_id = g.id
      WHERE bd.name LIKE ? OR bd.room LIKE ?
      LIMIT 10
    `, [searchTerm, searchTerm]);

    res.json({
      success: true,
      query: q,
      results: {
        guests,
        bookings,
        beds
      },
      total: guests.length + bookings.length + beds.length
    });
  } catch (err) {
    logger.error('Error in search:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/bookings/:id/do-checkin
 * Check-in UNIFICADO - Un solo endpoint para hacer check-in
 */
app.post('/api/bookings/:id/do-checkin', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_amount, payment_method } = req.body;

    // 1. Obtener booking con validaciones
    const booking = await dbGet(`
      SELECT
        b.*,
        g.name as guest_name,
        g.document as guest_document,
        bd.name as bed_name,
        bd.status as bed_status,
        bd.room as room_name
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN beds bd ON b.bed_id = bd.id
      WHERE b.id = ?
    `, [id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }

    // Validar estado del booking
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: `No se puede hacer check-in a una reserva con estado: ${booking.status}`
      });
    }

    // 2. Validar estado de cama
    if (!['clean', 'reserved'].includes(booking.bed_status)) {
      return res.status(400).json({
        success: false,
        error: `La cama no está lista. Estado actual: ${booking.bed_status}`
      });
    }

    // 3. Actualizar booking a checked_in/active
    await dbRun(`
      UPDATE bookings
      SET status = 'active',
          checked_in_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `, [id]);

    // 4. Actualizar cama a occupied
    await dbRun(`
      UPDATE beds
      SET status = 'occupied',
          guest_id = ?
      WHERE id = ?
    `, [booking.guest_id, booking.bed_id]);

    // 5. Registrar pago si se proporciona
    if (payment_amount && payment_amount > 0) {
      await dbRun(`
        INSERT INTO transactions (booking_id, type, description, amount, method, created_at)
        VALUES (?, 'payment', 'Pago al check-in', ?, ?, datetime('now'))
      `, [id, payment_amount, payment_method || 'cash']);
    }

    // 6. Log de actividad
    await logActivity(
      'checkin',
      'bookings',
      `Check-in: ${booking.guest_name} → Cama ${booking.bed_name}`,
      null, id, 'booking'
    );

    // 7. Obtener booking actualizado con balance
    const result = await dbGet(`
      SELECT
        b.*,
        g.name as guest_name,
        bd.name as bed_name,
        bd.room as room_name,
        COALESCE(
          (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
          0
        ) as amount_paid,
        b.total - COALESCE(
          (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
          0
        ) as balance
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN beds bd ON b.bed_id = bd.id
      WHERE b.id = ?
    `, [id]);

    res.json({
      success: true,
      message: `Check-in exitoso. ${booking.guest_name} está ahora en ${booking.bed_name}`,
      booking: result
    });

  } catch (err) {
    logger.error('Error in check-in:', err);
    res.status(500).json({
      success: false,
      error: 'Error al procesar check-in: ' + err.message
    });
  }
});

/**
 * POST /api/bookings/:id/do-checkout
 * Check-out UNIFICADO
 */
app.post('/api/bookings/:id/do-checkout', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_amount, payment_method } = req.body;

    // 1. Obtener booking
    const booking = await dbGet(`
      SELECT
        b.*,
        g.name as guest_name,
        bd.id as bed_id,
        bd.name as bed_name,
        COALESCE(
          (SELECT SUM(amount) FROM transactions WHERE booking_id = b.id AND type = 'payment'),
          0
        ) as amount_paid
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN beds bd ON b.bed_id = bd.id
      WHERE b.id = ?
    `, [id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `No se puede hacer check-out a una reserva con estado: ${booking.status}`
      });
    }

    // 2. Registrar pago final si se proporciona
    if (payment_amount && payment_amount > 0) {
      await dbRun(`
        INSERT INTO transactions (booking_id, type, description, amount, method, created_at)
        VALUES (?, 'payment', 'Pago al check-out', ?, ?, datetime('now'))
      `, [id, payment_amount, payment_method || 'cash']);
    }

    // 3. Completar booking
    await dbRun(`
      UPDATE bookings
      SET status = 'completed',
          checked_out_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `, [id]);

    // 4. Marcar cama como dirty
    await dbRun(`
      UPDATE beds
      SET status = 'dirty',
          guest_id = NULL
      WHERE id = ?
    `, [booking.bed_id]);

    // 5. Log de actividad
    await logActivity(
      'checkout',
      'bookings',
      `Check-out: ${booking.guest_name} de Cama ${booking.bed_name}`,
      null, id, 'booking'
    );

    // 6. Calcular balance final
    const finalPayments = booking.amount_paid + (payment_amount || 0);
    const finalBalance = booking.total - finalPayments;

    res.json({
      success: true,
      message: `Check-out completado. ${booking.guest_name} ha dejado ${booking.bed_name}`,
      summary: {
        guest_name: booking.guest_name,
        bed_name: booking.bed_name,
        total_charged: booking.total,
        total_paid: finalPayments,
        final_balance: finalBalance
      }
    });

  } catch (err) {
    logger.error('Error in check-out:', err);
    res.status(500).json({
      success: false,
      error: 'Error al procesar check-out: ' + err.message
    });
  }
});

/**
 * POST /api/walkin
 * Walk-in completo: Crear huésped + booking + check-in en un solo paso
 */
app.post('/api/walkin', requireAuth, async (req, res) => {
  try {
    const {
      guest_name,
      guest_document,
      guest_email,
      guest_phone,
      guest_nationality,
      bed_id,
      check_in,
      check_out,
      payment_amount,
      payment_method
    } = req.body;

    // Validaciones básicas
    if (!guest_name || !guest_document || !bed_id || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: guest_name, guest_document, bed_id, check_in, check_out'
      });
    }

    // 1. Verificar disponibilidad de cama
    const bed = await dbGet('SELECT * FROM beds WHERE id = ? AND status = ?', [bed_id, 'clean']);
    if (!bed) {
      return res.status(400).json({
        success: false,
        error: 'La cama no está disponible'
      });
    }

    // 2. Buscar o crear huésped
    let guest = await dbGet('SELECT * FROM guests WHERE document = ?', [guest_document]);

    if (!guest) {
      const guestResult = await dbRun(`
        INSERT INTO guests (name, document, email, phone, nationality, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [guest_name, guest_document, guest_email || null, guest_phone || null, guest_nationality || 'Colombia']);

      guest = { id: guestResult.id, name: guest_name, document: guest_document };
    }

    // 3. Calcular noches y total
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const total = bed.price * nights;

    // 4. Generar código de confirmación
    const now = new Date();
    const confirmationCode = `ALM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

    // 5. Crear booking en estado active (ya es check-in)
    const bookingResult = await dbRun(`
      INSERT INTO bookings (
        guest_id, bed_id, check_in, check_out, nights, total,
        status, confirmation_code, source, checked_in_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 'walkin', datetime('now'), datetime('now'))
    `, [guest.id, bed_id, check_in, check_out, nights, total, confirmationCode]);

    // 6. Actualizar cama
    await dbRun(`
      UPDATE beds SET status = 'occupied', guest_id = ? WHERE id = ?
    `, [guest.id, bed_id]);

    // 7. Crear cargo de habitación
    await dbRun(`
      INSERT INTO transactions (booking_id, type, description, amount, created_at)
      VALUES (?, 'charge', ?, ?, datetime('now'))
    `, [bookingResult.id, `Alojamiento - ${nights} noches`, total]);

    // 8. Registrar pago si se proporciona
    if (payment_amount && payment_amount > 0) {
      await dbRun(`
        INSERT INTO transactions (booking_id, type, description, amount, method, created_at)
        VALUES (?, 'payment', 'Pago al check-in', ?, ?, datetime('now'))
      `, [bookingResult.id, payment_amount, payment_method || 'cash']);
    }

    // 9. Log de actividad
    await logActivity(
      'walkin',
      'bookings',
      `Walk-in: ${guest.name} → Cama ${bed.name}`,
      null, bookingResult.id, 'booking'
    );

    res.status(201).json({
      success: true,
      message: `Walk-in exitoso. ${guest.name} está ahora en ${bed.name}`,
      booking: {
        id: bookingResult.id,
        confirmation_code: confirmationCode,
        guest_name: guest.name,
        bed_name: bed.name,
        room: bed.room,
        check_in,
        check_out,
        nights,
        total,
        amount_paid: payment_amount || 0,
        balance: total - (payment_amount || 0)
      }
    });

  } catch (err) {
    logger.error('Error in walk-in:', err);
    res.status(500).json({
      success: false,
      error: 'Error al procesar walk-in: ' + err.message
    });
  }
});

// Initialize database connection (lazy, on first request)
let dbInitialized = false;
async function ensureDbConnection() {
  if (!dbInitialized) {
    try {
      await dbAdapter.connect();
      await initializeDatabase();
      dbInitialized = true;
      console.log('🗄️ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }
}

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    res.status(503).json({ error: 'Database connection failed', message: error.message });
  }
});

// For Vercel serverless deployment
module.exports = app;

// Initialize database and start server (local development only)
async function startServer() {
  try {
    await ensureDbConnection();

    // Start cron jobs only in local development (not in serverless)
    if (!process.env.VERCEL) {
      const icalCron = new ICalSyncCron();
      icalCron.startCronJob();
      whatsappAutomation.start();
      smsAutomation.startCronJob(app);
    }

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`🚀 Almanik PMS Production Server running on port ${PORT}`);
      logger.info(`🌐 Dashboard: http://localhost:${PORT}`);
      logger.info(`🔧 API: http://localhost:${PORT}/api`);
      logger.info(`🩺 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🔑 Login: admin / [check .env ADMIN_PASSWORD]`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// For local development
if (require.main === module) {
  startServer();
}