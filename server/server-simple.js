// ALMANIK PMS - SERVIDOR ULTRA SIMPLE
// SQLite (desarrollo) + PostgreSQL (producción) + Express

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const DatabaseAdapter = require('./db-adapter');

const app = express();
app.use(express.json());
app.use(cors());

// Database adapter - auto-detecta SQLite o PostgreSQL
const dbAdapter = new DatabaseAdapter();
let db = null;

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
    console.error('Error logging activity:', err);
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
const bcrypt = require('bcrypt');
const activeSessions = new Map(); // Store session data

// Initialize demo users
async function createDemoUsers() {
  console.log('👥 Creating demo users...');

  try {
    // Check if admin user exists
    const adminExists = await dbGet('SELECT id FROM users WHERE username = ?', ['admin']);

    if (!adminExists) {
      // Create admin user
      const adminHash = await bcrypt.hash('admin123', 10);
      await dbRun(`
        INSERT INTO users (username, email, name, password_hash, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['admin', 'admin@hostal.com', 'Administrador Principal', adminHash, 'administrador', JSON.stringify({
        users: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        reports: ['read', 'export'],
        all_modules: true
      })]);

      // Create reception user
      const receptionHash = await bcrypt.hash('recepcion123', 10);
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

app.post('/api/login', async (req, res) => {
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
// IMPORT MODULES
// ============================================

const reservationsModule = require('./modules/reservations');

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
    const guests = await dbAll('SELECT * FROM guests ORDER BY name');
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
    const { name, price, room, status } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    await dbRun(
      'UPDATE beds SET name = ?, price = ?, room = ?, status = ? WHERE id = ?',
      [name, parseFloat(price), room, status || 'clean', id]
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
    const beds = await dbAll(`
      SELECT
        b.*,
        g.name as guest_name,
        g.document as guest_document
      FROM beds b
      LEFT JOIN guests g ON b.guest_id = g.id
      ORDER BY b.room, b.name
    `);

    // Agrupar por habitación
    const bedsByRoom = beds.reduce((acc, bed) => {
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

    console.log(`📊 Generating comprehensive ${type} analytics for ${start} to ${end}`);

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

    console.log(`✅ Generated ${type} report with`, Object.keys(reportData).length, 'sections');
    res.json(reportData);

  } catch (err) {
    console.error('❌ Reports API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// SERVE STATIC FILES
app.use(express.static(path.join(__dirname, '..', 'public')));

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
    const { name, price, category, stock } = req.body;

    await dbRun(
      'UPDATE products SET name = ?, price = ?, category = ?, stock = ? WHERE id = ?',
      [name, price, category, stock, id]
    );

    const updatedProduct = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    res.json(updatedProduct);
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

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// For Vercel serverless deployment
module.exports = app;

// Initialize database and start server
async function startServer() {
  try {
    await dbAdapter.connect();
    console.log('🗄️ Database connected successfully');

    // Initialize database with tables and demo data
    await initializeDatabase();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Almanik PMS Simple running on port ${PORT}`);
      console.log(`🌐 Dashboard: http://localhost:${PORT}`);
      console.log(`🔧 API: http://localhost:${PORT}/api`);
      console.log(`🔑 Login: admin / admin123`);
      console.log('');
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