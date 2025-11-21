// ALMANIK PMS - BACKEND ULTRA SIMPLE
// TODO EL SISTEMA EN 1 ARCHIVO - MÁXIMA SIMPLICIDAD

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Database simple - SQLite (máxima simplicidad)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'almanik.db');
const db = new sqlite3.Database(dbPath);

// Convert to promise-based interface
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve({ rows });
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ insertId: this.lastID, changes: this.changes });
    });
  });
};

// Initialize database
async function initializeDatabase() {
  try {
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
      guest_id INTEGER REFERENCES guests(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER REFERENCES guests(id),
      bed_id INTEGER REFERENCES beds(id),
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      nights INTEGER NOT NULL DEFAULT 1,
      total REAL NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER REFERENCES bookings(id),
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Check if we have demo data
    const guestsCount = await dbQuery('SELECT COUNT(*) as count FROM guests');
    if (guestsCount.rows[0].count === 0) {
      await createDemoData();
    }

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
  }
}

async function createDemoData() {
  console.log('📊 Creating demo data...');

  // Demo guests
  await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
    ['Juan Pérez', 'juan@email.com', '+1234567890', 'PASS123456']);
  await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
    ['Maria González', 'maria@email.com', '+0987654321', 'ID789012']);
  await dbRun('INSERT INTO guests (name, email, phone, document) VALUES (?, ?, ?, ?)',
    ['Carlos Silva', 'carlos@email.com', '+1122334455', 'DOC345678']);

  // Demo beds
  await dbRun('INSERT INTO beds (name, price, status) VALUES (?, ?, ?)', ['1-A', 25.00, 'clean']);
  await dbRun('INSERT INTO beds (name, price, status) VALUES (?, ?, ?)', ['1-B', 25.00, 'occupied']);
  await dbRun('INSERT INTO beds (name, price, status) VALUES (?, ?, ?)', ['2-A', 25.00, 'clean']);
  await dbRun('INSERT INTO beds (name, price, status) VALUES (?, ?, ?)', ['2-B', 25.00, 'dirty']);
  await dbRun('INSERT INTO beds (name, price, status) VALUES (?, ?, ?)', ['Private-1', 50.00, 'occupied']);
  await dbRun('INSERT INTO beds (name, price, status) VALUES (?, ?, ?)', ['Private-2', 50.00, 'clean']);

  // Demo active booking
  const guest1 = await dbQuery('SELECT id FROM guests WHERE document = ?', ['PASS123456']);
  const bed1 = await dbQuery('SELECT id FROM beds WHERE name = ?', ['1-B']);

  if (guest1.rows[0] && bed1.rows[0]) {
    await dbRun('INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total) VALUES (?, ?, date("now"), date("now", "+3 days"), 3, 75.00)',
      [guest1.rows[0].id, bed1.rows[0].id]);

    await dbRun('UPDATE beds SET guest_id = ? WHERE name = ?', [guest1.rows[0].id, '1-B']);

    const booking = await dbQuery('SELECT id FROM bookings WHERE guest_id = ? AND status = "active"', [guest1.rows[0].id]);
    if (booking.rows[0]) {
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking.rows[0].id, 'charge', 'Room charge - 3 nights', 75.00]);
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking.rows[0].id, 'payment', 'Deposit payment', 25.00]);
    }
  }

  // Demo active booking for Private-1
  const guest2 = await dbQuery('SELECT id FROM guests WHERE document = ?', ['ID789012']);
  const bed2 = await dbQuery('SELECT id FROM beds WHERE name = ?', ['Private-1']);

  if (guest2.rows[0] && bed2.rows[0]) {
    await dbRun('INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total) VALUES (?, ?, date("now"), date("now", "+2 days"), 2, 100.00)',
      [guest2.rows[0].id, bed2.rows[0].id]);

    await dbRun('UPDATE beds SET guest_id = ? WHERE name = ?', [guest2.rows[0].id, 'Private-1']);

    const booking2 = await dbQuery('SELECT id FROM bookings WHERE guest_id = ? AND status = "active"', [guest2.rows[0].id]);
    if (booking2.rows[0]) {
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking2.rows[0].id, 'charge', 'Room charge - 2 nights', 100.00]);
      await dbRun('INSERT INTO transactions (booking_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [booking2.rows[0].id, 'charge', 'Beer x2', 7.00]);
    }
  }

  // Demo sales
  await dbRun('INSERT INTO transactions (type, description, amount, method) VALUES (?, ?, ?, ?)',
    ['sale', 'Coffee x2', 4.00, 'cash']);
  await dbRun('INSERT INTO transactions (type, description, amount, method) VALUES (?, ?, ?, ?)',
    ['sale', 'Water', 1.00, 'cash']);

  console.log('✅ Demo data created');
}

initializeDatabase();

// AUTH SIMPLE (sin JWT, solo admin básico)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// Simple session storage
let activeSessions = new Set();

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const sessionId = Date.now().toString();
    activeSessions.add(sessionId);
    res.json({
      success: true,
      sessionId,
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/logout', (req, res) => {
  const { sessionId } = req.body;
  activeSessions.delete(sessionId);
  res.json({ success: true, message: 'Logged out' });
});

// Simple auth middleware
const requireAuth = (req, res, next) => {
  const sessionId = req.headers['session-id'];
  if (activeSessions.has(sessionId)) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};

// GUESTS SIMPLE
app.get('/api/guests', requireAuth, async (req, res) => {
  try {
    const result = await dbQuery('SELECT * FROM guests ORDER BY name');
    res.json(result.rows);
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

    const result = await db.query(
      'INSERT INTO guests (name, email, phone, document) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, document]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Document number already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/guests/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const result = await db.query(
      'SELECT * FROM guests WHERE name ILIKE $1 OR document ILIKE $1 ORDER BY name',
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BEDS SIMPLE
app.get('/api/beds', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        b.*,
        g.name as guest_name,
        g.document as guest_document
      FROM beds b
      LEFT JOIN guests g ON b.guest_id = g.id
      ORDER BY b.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/beds/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Si se marca como clean, liberar guest
    if (status === 'clean') {
      await db.query(
        'UPDATE beds SET status = $1, guest_id = NULL WHERE id = $2',
        [status, id]
      );
    } else {
      await db.query(
        'UPDATE beds SET status = $1 WHERE id = $2',
        [status, id]
      );
    }

    res.json({ success: true, message: 'Bed status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHECK-IN SIMPLE
app.post('/api/checkin', requireAuth, async (req, res) => {
  try {
    const { guest_id, bed_id, check_in, check_out, total } = req.body;

    // Verificar que la cama esté disponible
    const bedCheck = await db.query(
      'SELECT * FROM beds WHERE id = $1 AND status = $2',
      [bed_id, 'clean']
    );

    if (bedCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Bed is not available' });
    }

    // Calcular noches
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    // Crear booking
    const booking = await db.query(
      'INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [guest_id, bed_id, check_in, check_out, nights, total]
    );

    // Marcar cama como ocupada
    await db.query(
      'UPDATE beds SET status = $1, guest_id = $2 WHERE id = $3',
      ['occupied', guest_id, bed_id]
    );

    // Crear cargo por habitación
    await db.query(
      'INSERT INTO transactions (booking_id, type, description, amount) VALUES ($1, $2, $3, $4)',
      [booking.rows[0].id, 'charge', `Room charge - ${nights} nights`, total]
    );

    res.json({
      success: true,
      booking: booking.rows[0],
      message: 'Check-in completed successfully'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHECK-OUT SIMPLE
app.post('/api/checkout/:bed_id', requireAuth, async (req, res) => {
  try {
    const { bed_id } = req.params;
    const { payment_amount, payment_method } = req.body;

    // Obtener booking activo
    const booking = await db.query(
      'SELECT * FROM bookings WHERE bed_id = $1 AND status = $2',
      [bed_id, 'active']
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'No active booking found' });
    }

    const booking_id = booking.rows[0].id;

    // Calcular balance
    const charges = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE booking_id = $1 AND type = $2',
      [booking_id, 'charge']
    );

    const payments = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE booking_id = $1 AND type = $2',
      [booking_id, 'payment']
    );

    const balance = charges.rows[0].total - payments.rows[0].total;

    // Agregar pago si hay monto
    if (payment_amount && payment_amount > 0) {
      await db.query(
        'INSERT INTO transactions (booking_id, type, description, amount, method) VALUES ($1, $2, $3, $4, $5)',
        [booking_id, 'payment', 'Check-out payment', payment_amount, payment_method || 'cash']
      );
    }

    // Completar booking
    await db.query(
      'UPDATE bookings SET status = $1 WHERE id = $2',
      ['completed', booking_id]
    );

    // Marcar cama como sucia
    await db.query(
      'UPDATE beds SET status = $1, guest_id = NULL WHERE id = $2',
      ['dirty', bed_id]
    );

    res.json({
      success: true,
      message: 'Check-out completed',
      balance: balance - (payment_amount || 0)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BALANCE DE GUEST/BOOKING
app.get('/api/balance/:bed_id', requireAuth, async (req, res) => {
  try {
    const { bed_id } = req.params;

    const booking = await db.query(
      'SELECT * FROM bookings WHERE bed_id = $1 AND status = $2',
      [bed_id, 'active']
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'No active booking' });
    }

    const booking_id = booking.rows[0].id;

    // Obtener todas las transacciones
    const transactions = await db.query(
      'SELECT * FROM transactions WHERE booking_id = $1 ORDER BY created_at',
      [booking_id]
    );

    let totalCharges = 0;
    let totalPayments = 0;

    transactions.rows.forEach(t => {
      if (t.type === 'charge') totalCharges += parseFloat(t.amount);
      if (t.type === 'payment') totalPayments += parseFloat(t.amount);
    });

    res.json({
      booking: booking.rows[0],
      transactions: transactions.rows,
      totalCharges,
      totalPayments,
      balance: totalCharges - totalPayments
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PRODUCTS SIMPLE (POS)
const PRODUCTS = [
  { id: 1, name: 'Beer', price: 3.50, category: 'drinks' },
  { id: 2, name: 'Water', price: 1.00, category: 'drinks' },
  { id: 3, name: 'Soda', price: 2.00, category: 'drinks' },
  { id: 4, name: 'Sandwich', price: 5.00, category: 'food' },
  { id: 5, name: 'Snack', price: 2.50, category: 'food' },
  { id: 6, name: 'Coffee', price: 2.00, category: 'drinks' }
];

app.get('/api/products', requireAuth, (req, res) => {
  res.json(PRODUCTS);
});

// VENTA POS SIMPLE
app.post('/api/sell', requireAuth, async (req, res) => {
  try {
    const { product_id, quantity, booking_id } = req.body;

    const product = PRODUCTS.find(p => p.id === parseInt(product_id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const total = product.price * quantity;

    if (booking_id) {
      // Cargo a habitación
      await db.query(
        'INSERT INTO transactions (booking_id, type, description, amount) VALUES ($1, $2, $3, $4)',
        [booking_id, 'charge', `${product.name} x${quantity}`, total]
      );
    } else {
      // Venta directa
      await db.query(
        'INSERT INTO transactions (type, description, amount, method) VALUES ($1, $2, $3, $4)',
        ['sale', `${product.name} x${quantity}`, total, 'cash']
      );
    }

    res.json({
      success: true,
      message: 'Sale completed',
      product: product.name,
      quantity,
      total
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DASHBOARD DATA SIMPLE
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    // Beds status
    const bedsStatus = await db.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM beds
      GROUP BY status
    `);

    // Today's revenue
    const todayRevenue = await db.query(`
      SELECT
        COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type IN ('payment', 'sale')
      AND DATE(created_at) = CURRENT_DATE
    `);

    // Active bookings
    const activeBookings = await db.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE status = 'active'
    `);

    res.json({
      bedsStatus: bedsStatus.rows,
      todayRevenue: todayRevenue.rows[0].total,
      activeBookings: activeBookings.rows[0].count,
      timestamp: new Date()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Almanik PMS Simple running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
});