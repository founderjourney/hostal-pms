/**
 * ============================================================
 * ALMANIK PMS - Cashbox Migration (SQLite)
 * ============================================================
 *
 * Crea las tablas para gestion de caja y finanzas del hostal.
 *
 * TABLAS:
 * - cashbox_sessions: Sesiones de caja (apertura/cierre)
 * - cashbox_transactions: Movimientos de caja
 *
 * TIPOS DE TRANSACCION:
 * - income: Ingreso (pago de reserva, venta, etc)
 * - expense: Egreso (compra, pago, etc)
 * - adjustment: Ajuste de caja
 *
 * CATEGORIAS INGRESO:
 * - reservation_payment: Pago de reserva
 * - walk_in: Huesped sin reserva
 * - extra_service: Servicio adicional
 * - bar_restaurant: Bar/Restaurante
 * - laundry: Lavanderia
 * - other_income: Otros ingresos
 *
 * CATEGORIAS EGRESO:
 * - supplies: Suministros
 * - maintenance: Mantenimiento
 * - utilities: Servicios publicos
 * - payroll: Nomina
 * - food_beverage: Alimentos/Bebidas
 * - cleaning: Limpieza
 * - petty_cash: Caja menor
 * - other_expense: Otros gastos
 *
 * Run: node server/migrate-cashbox.js
 *
 * @author Senior Developer
 * @version 1.0.0
 * @date 2025-11-27
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'almanik.db');
const db = new sqlite3.Database(dbPath);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     ALMANIK PMS - Cashbox Migration (SQLite)              ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Tables: cashbox_sessions, cashbox_transactions           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📍 Database:', dbPath);
console.log('🔄 Starting migration...\n');

// Create cashbox_sessions table
const createSessionsSQL = `
CREATE TABLE IF NOT EXISTS cashbox_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Responsable
  opened_by INTEGER REFERENCES users(id),
  closed_by INTEGER REFERENCES users(id),

  -- Montos
  opening_amount REAL NOT NULL DEFAULT 0,
  closing_amount REAL,
  expected_amount REAL,
  difference REAL,

  -- Estado
  status TEXT DEFAULT 'open',

  -- Fechas
  opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,

  -- Notas
  opening_notes TEXT,
  closing_notes TEXT,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

// Create cashbox_transactions table
const createTransactionsSQL = `
CREATE TABLE IF NOT EXISTS cashbox_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Sesion de caja
  session_id INTEGER REFERENCES cashbox_sessions(id),

  -- Tipo y categoria
  transaction_type TEXT NOT NULL,
  category TEXT NOT NULL,

  -- Monto
  amount REAL NOT NULL,

  -- Referencia (reserva, factura, etc)
  reference_type TEXT,
  reference_id INTEGER,

  -- Descripcion
  description TEXT,

  -- Metodo de pago
  payment_method TEXT DEFAULT 'cash',

  -- Responsable
  created_by INTEGER REFERENCES users(id),

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

// Create indexes
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_cashbox_sessions_status ON cashbox_sessions(status)',
  'CREATE INDEX IF NOT EXISTS idx_cashbox_sessions_opened_at ON cashbox_sessions(opened_at)',
  'CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_session ON cashbox_transactions(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_type ON cashbox_transactions(transaction_type)',
  'CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_category ON cashbox_transactions(category)',
  'CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_created_at ON cashbox_transactions(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_reference ON cashbox_transactions(reference_type, reference_id)'
];

db.serialize(() => {
  // Create sessions table
  db.run(createSessionsSQL, (err) => {
    if (err) {
      console.error('❌ Error creating cashbox_sessions table:', err.message);
    } else {
      console.log('✅ cashbox_sessions table created/verified');
    }
  });

  // Create transactions table
  db.run(createTransactionsSQL, (err) => {
    if (err) {
      console.error('❌ Error creating cashbox_transactions table:', err.message);
    } else {
      console.log('✅ cashbox_transactions table created/verified');
    }
  });

  // Create indexes
  indexes.forEach((indexSQL, i) => {
    db.run(indexSQL, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.log(`⚠️  Index ${i + 1} error:`, err.message);
      } else {
        console.log(`✅ Index ${i + 1} created/verified`);
      }
    });
  });

  // Verify tables
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cashbox%'", [], (err, tables) => {
    if (err) {
      console.error('❌ Error verifying tables:', err.message);
    } else {
      console.log('\n📋 Cashbox tables created:');
      tables.forEach(t => console.log(`   - ${t.name}`));
    }

    // Show columns for sessions
    db.all("PRAGMA table_info(cashbox_sessions)", [], (err, columns) => {
      if (!err) {
        console.log('\n📋 cashbox_sessions columns:');
        columns.forEach(col => {
          console.log(`   - ${col.name} (${col.type || 'TEXT'})`);
        });
      }

      // Show columns for transactions
      db.all("PRAGMA table_info(cashbox_transactions)", [], (err, columns) => {
        if (!err) {
          console.log('\n📋 cashbox_transactions columns:');
          columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type || 'TEXT'})`);
          });
        }

        console.log('\n' + '═'.repeat(60));
        console.log('✅ CASHBOX MIGRATION COMPLETED SUCCESSFULLY');
        console.log('═'.repeat(60));
        console.log('\n🎯 Transaction types: income, expense, adjustment');
        console.log('🎯 Session statuses: open, closed');
        console.log('🎯 Payment methods: cash, card, transfer, other\n');

        db.close();
      });
    });
  });
});
