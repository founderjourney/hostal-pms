/**
 * Migration: iCal Sync Tables
 * Creates tables for OTA calendar synchronization
 *
 * Tables:
 * - ical_sources: OTA feed configurations (Booking.com, Hostelworld, etc.)
 * - external_reservations: Reservations imported from OTAs
 * - sync_logs: Synchronization history and errors
 *
 * Run: node server/migrate-ical-sync.js
 */

const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';

async function migrateSQLite() {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'almanik.db');

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
      console.log('📦 Creating iCal Sync tables for SQLite...\n');

      // 1. ical_sources - OTA feed configurations
      db.run(`
        CREATE TABLE IF NOT EXISTS ical_sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL,
          source_type VARCHAR(50) NOT NULL,
          ical_url TEXT NOT NULL,
          room_id INTEGER,
          bed_id INTEGER REFERENCES beds(id),
          sync_interval_minutes INTEGER DEFAULT 120,
          active INTEGER DEFAULT 1,
          last_sync_at DATETIME,
          last_sync_status VARCHAR(20),
          last_sync_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating ical_sources:', err);
        else console.log('✅ Table: ical_sources');
      });

      // 2. external_reservations - Reservations from OTAs
      db.run(`
        CREATE TABLE IF NOT EXISTS external_reservations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER NOT NULL REFERENCES ical_sources(id) ON DELETE CASCADE,
          external_id VARCHAR(255) NOT NULL,
          source_type VARCHAR(50) NOT NULL,
          guest_name VARCHAR(255),
          guest_email VARCHAR(255),
          guest_phone VARCHAR(50),
          check_in DATE NOT NULL,
          check_out DATE NOT NULL,
          nights INTEGER,
          bed_id INTEGER REFERENCES beds(id),
          room_id INTEGER,
          status VARCHAR(20) DEFAULT 'confirmed',
          total DECIMAL(10,2),
          notes TEXT,
          raw_ical_data TEXT,
          linked_booking_id INTEGER REFERENCES bookings(id),
          has_conflict INTEGER DEFAULT 0,
          conflict_details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(source_id, external_id)
        )
      `, (err) => {
        if (err) console.error('Error creating external_reservations:', err);
        else console.log('✅ Table: external_reservations');
      });

      // 3. sync_logs - Synchronization history
      db.run(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER NOT NULL REFERENCES ical_sources(id) ON DELETE CASCADE,
          sync_started_at DATETIME NOT NULL,
          sync_completed_at DATETIME,
          status VARCHAR(20) DEFAULT 'running',
          events_processed INTEGER DEFAULT 0,
          events_created INTEGER DEFAULT 0,
          events_updated INTEGER DEFAULT 0,
          events_cancelled INTEGER DEFAULT 0,
          conflicts_detected INTEGER DEFAULT 0,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating sync_logs:', err);
        else console.log('✅ Table: sync_logs');
      });

      // Create indexes
      console.log('\n📇 Creating indexes...');

      db.run(`CREATE INDEX IF NOT EXISTS idx_ical_sources_active ON ical_sources(active)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_ical_sources_type ON ical_sources(source_type)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_external_res_source ON external_reservations(source_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_external_res_dates ON external_reservations(check_in, check_out)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_external_res_status ON external_reservations(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_external_res_bed ON external_reservations(bed_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_external_res_conflict ON external_reservations(has_conflict)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status)`, (err) => {
        if (err) console.error('Error creating index:', err);
        else console.log('✅ All indexes created');
      });
    });

    db.close((err) => {
      if (err) reject(err);
      else {
        console.log('\n✅ SQLite migration completed!');
        resolve();
      }
    });
  });
}

async function migratePostgreSQL() {
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    console.log('📦 Creating iCal Sync tables for PostgreSQL...\n');

    await client.query('BEGIN');

    // 1. ical_sources
    await client.query(`
      CREATE TABLE IF NOT EXISTS ical_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        ical_url TEXT NOT NULL,
        room_id INTEGER,
        bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
        sync_interval_minutes INTEGER DEFAULT 120,
        active BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP,
        last_sync_status VARCHAR(20),
        last_sync_error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: ical_sources');

    // 2. external_reservations
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_reservations (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES ical_sources(id) ON DELETE CASCADE,
        external_id VARCHAR(255) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        guest_name VARCHAR(255),
        guest_email VARCHAR(255),
        guest_phone VARCHAR(50),
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        nights INTEGER,
        bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
        room_id INTEGER,
        status VARCHAR(20) DEFAULT 'confirmed',
        total DECIMAL(10,2),
        notes TEXT,
        raw_ical_data JSONB,
        linked_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        has_conflict BOOLEAN DEFAULT false,
        conflict_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, external_id)
      )
    `);
    console.log('✅ Table: external_reservations');

    // 3. sync_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES ical_sources(id) ON DELETE CASCADE,
        sync_started_at TIMESTAMP NOT NULL,
        sync_completed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'running',
        events_processed INTEGER DEFAULT 0,
        events_created INTEGER DEFAULT 0,
        events_updated INTEGER DEFAULT 0,
        events_cancelled INTEGER DEFAULT 0,
        conflicts_detected INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table: sync_logs');

    // Create indexes
    console.log('\n📇 Creating indexes...');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_ical_sources_active ON ical_sources(active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ical_sources_type ON ical_sources(source_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_external_res_source ON external_reservations(source_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_external_res_dates ON external_reservations(check_in, check_out)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_external_res_status ON external_reservations(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_external_res_bed ON external_reservations(bed_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_external_res_conflict ON external_reservations(has_conflict)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status)`);
    console.log('✅ All indexes created');

    // Create trigger for updated_at
    await client.query(`
      CREATE TRIGGER update_ical_sources_updated_at BEFORE UPDATE ON ical_sources
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `).catch(() => {}); // Ignore if exists

    await client.query(`
      CREATE TRIGGER update_external_reservations_updated_at BEFORE UPDATE ON external_reservations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `).catch(() => {}); // Ignore if exists

    await client.query('COMMIT');
    console.log('\n✅ PostgreSQL migration completed!');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('  ALMANIK PMS - iCal Sync Migration');
  console.log('  OTA Integration (Booking.com, Hostelworld)');
  console.log('='.repeat(50));
  console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}\n`);

  try {
    if (isProduction) {
      await migratePostgreSQL();
    } else {
      await migrateSQLite();
    }

    console.log('\n' + '='.repeat(50));
    console.log('  ✅ Migration completed successfully!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Get iCal URLs from your OTA extranet');
    console.log('2. Register sources via POST /api/ical/sources');
    console.log('3. Test sync via POST /api/ical/sync/:source_id');
    console.log('\nDocumentation: docs/05-api/ICAL-SYNC-API.md\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
