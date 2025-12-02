/**
 * Migration: Advanced Bed Management Features
 *
 * This migration adds:
 * 1. New columns to beds table (notes, maintenance_reason, reserved_until, reserved_for_guest_id)
 * 2. New table bed_history for tracking all bed state changes
 *
 * Run: node server/migrate-beds-advanced.js
 */

require('dotenv').config();
const DatabaseAdapter = require('./db-adapter');
const db = new DatabaseAdapter();

const migrations = [
  // Add notes column to beds
  `ALTER TABLE beds ADD COLUMN notes TEXT`,

  // Add maintenance_reason column to beds
  `ALTER TABLE beds ADD COLUMN maintenance_reason TEXT`,

  // Add reserved_until column to beds
  `ALTER TABLE beds ADD COLUMN reserved_until DATETIME`,

  // Add reserved_for_guest_id column to beds
  `ALTER TABLE beds ADD COLUMN reserved_for_guest_id INTEGER`,

  // Add last_status_change column to beds
  `ALTER TABLE beds ADD COLUMN last_status_change DATETIME DEFAULT CURRENT_TIMESTAMP`,

  // Add last_cleaned_at column to beds
  `ALTER TABLE beds ADD COLUMN last_cleaned_at DATETIME`,

  // Add last_cleaned_by column to beds (staff_id)
  `ALTER TABLE beds ADD COLUMN last_cleaned_by INTEGER`
];

const createBedHistoryTable = `
  CREATE TABLE IF NOT EXISTS bed_history (
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
    FOREIGN KEY(guest_id) REFERENCES guests(id),
    FOREIGN KEY(performed_by) REFERENCES staff(id)
  )
`;

const createBedHistoryIndex = `
  CREATE INDEX IF NOT EXISTS idx_bed_history_bed_id ON bed_history(bed_id)
`;

const createBedHistoryDateIndex = `
  CREATE INDEX IF NOT EXISTS idx_bed_history_created_at ON bed_history(created_at)
`;

async function runMigration() {
  console.log('🚀 Starting Advanced Bed Management Migration...\n');

  try {
    // Initialize database connection
    await db.connect();
    console.log('✅ Database connected\n');

    // Run column additions (ignore errors for existing columns)
    console.log('📦 Adding new columns to beds table...');
    for (const migration of migrations) {
      try {
        await db.run(migration);
        const columnMatch = migration.match(/ADD COLUMN (\w+)/);
        if (columnMatch) {
          console.log(`   ✅ Added column: ${columnMatch[1]}`);
        }
      } catch (err) {
        if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
          const columnMatch = migration.match(/ADD COLUMN (\w+)/);
          if (columnMatch) {
            console.log(`   ⏭️  Column already exists: ${columnMatch[1]}`);
          }
        } else {
          console.error(`   ❌ Error: ${err.message}`);
        }
      }
    }

    // Create bed_history table
    console.log('\n📦 Creating bed_history table...');
    await db.run(createBedHistoryTable);
    console.log('   ✅ bed_history table created');

    // Create indexes
    console.log('\n📦 Creating indexes...');
    await db.run(createBedHistoryIndex);
    console.log('   ✅ Index on bed_id created');
    await db.run(createBedHistoryDateIndex);
    console.log('   ✅ Index on created_at created');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const beds = await db.query('SELECT * FROM beds LIMIT 1');
    const history = await db.query('SELECT * FROM bed_history LIMIT 1');

    console.log('   ✅ beds table columns:', beds.length > 0 ? Object.keys(beds[0]).join(', ') : 'Table ready (empty)');
    console.log('   ✅ bed_history table ready');

    console.log('\n✅ Migration completed successfully!\n');
    console.log('New features available:');
    console.log('  - Bed notes/observations');
    console.log('  - Maintenance mode with reason');
    console.log('  - Bed reservation (without check-in)');
    console.log('  - Complete bed history tracking');
    console.log('  - Cleaning tracking (who/when)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();
