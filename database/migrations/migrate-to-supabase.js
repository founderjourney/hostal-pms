// SCRIPT DE MIGRACIÓN: SQLite → Supabase PostgreSQL
// Ejecutar: node migrate-to-supabase.js

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

console.log('🔄 Iniciando migración SQLite → Supabase PostgreSQL...');

// Conexiones
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'almanik.db'));
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  try {
    console.log('📊 Conectando a bases de datos...');

    // Función helper para SQLite
    const sqliteAll = (sql) => new Promise((resolve, reject) => {
      sqliteDb.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 1. Migrar Guests
    console.log('👥 Migrando guests...');
    const guests = await sqliteAll('SELECT * FROM guests');
    for (const guest of guests) {
      await pgPool.query(
        'INSERT INTO guests (id, name, email, phone, document, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (document) DO NOTHING',
        [guest.id, guest.name, guest.email, guest.phone, guest.document, guest.created_at]
      );
    }
    console.log(`✅ ${guests.length} guests migrados`);

    // 2. Migrar Beds
    console.log('🛏️ Migrando beds...');
    const beds = await sqliteAll('SELECT * FROM beds');
    for (const bed of beds) {
      await pgPool.query(
        'INSERT INTO beds (id, name, price, status, room, guest_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (name) DO NOTHING',
        [bed.id, bed.name, bed.price, bed.status, bed.room, bed.guest_id, bed.created_at]
      );
    }
    console.log(`✅ ${beds.length} beds migradas`);

    // 3. Migrar Bookings
    console.log('📅 Migrando bookings...');
    const bookings = await sqliteAll('SELECT * FROM bookings');
    for (const booking of bookings) {
      await pgPool.query(
        'INSERT INTO bookings (id, guest_id, bed_id, check_in, check_out, nights, total, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [booking.id, booking.guest_id, booking.bed_id, booking.check_in, booking.check_out, booking.nights, booking.total, booking.status, booking.created_at]
      );
    }
    console.log(`✅ ${bookings.length} bookings migradas`);

    // 4. Migrar Transactions
    console.log('💰 Migrando transactions...');
    const transactions = await sqliteAll('SELECT * FROM transactions');
    for (const transaction of transactions) {
      await pgPool.query(
        'INSERT INTO transactions (id, booking_id, type, description, amount, method, bed_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [transaction.id, transaction.booking_id, transaction.type, transaction.description, transaction.amount, transaction.method, transaction.bed_id, transaction.created_at]
      );
    }
    console.log(`✅ ${transactions.length} transactions migradas`);

    // 5. Migrar Products
    console.log('📦 Migrando products...');
    try {
      const products = await sqliteAll('SELECT * FROM products');
      for (const product of products) {
        await pgPool.query(
          'INSERT INTO products (id, name, price, category, stock, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [product.id, product.name, product.price, product.category, product.stock, product.created_at]
        );
      }
      console.log(`✅ ${products.length} products migrados`);
    } catch (err) {
      console.log('⚠️ Products table no existe en SQLite, saltando...');
    }

    // 6. Migrar Staff
    console.log('👨‍💼 Migrando staff...');
    try {
      const staff = await sqliteAll('SELECT * FROM staff');
      for (const member of staff) {
        await pgPool.query(
          'INSERT INTO staff (id, name, position, phone, email, salary, schedule, active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [member.id, member.name, member.position, member.phone, member.email, member.salary, member.schedule, member.active, member.created_at]
        );
      }
      console.log(`✅ ${staff.length} staff migrados`);
    } catch (err) {
      console.log('⚠️ Staff table no existe en SQLite, saltando...');
    }

    // 7. Migrar Tours
    console.log('🗺️ Migrando tours...');
    try {
      const tours = await sqliteAll('SELECT * FROM tours');
      for (const tour of tours) {
        await pgPool.query(
          'INSERT INTO tours (id, name, description, price, duration, provider, commission_rate, booking_url, images, clicks, active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [tour.id, tour.name, tour.description, tour.price, tour.duration, tour.provider, tour.commission_rate, tour.booking_url, tour.images, tour.clicks, tour.active, tour.created_at]
        );
      }
      console.log(`✅ ${tours.length} tours migrados`);
    } catch (err) {
      console.log('⚠️ Tours table no existe en SQLite, saltando...');
    }

    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('📋 Resumen:');
    console.log('   - Guests: migrados');
    console.log('   - Beds: migradas');
    console.log('   - Bookings: migradas');
    console.log('   - Transactions: migradas');
    console.log('   - Products: migrados (si existen)');
    console.log('   - Staff: migrados (si existen)');
    console.log('   - Tours: migrados (si existen)');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

// Ejecutar migración
migrateData();