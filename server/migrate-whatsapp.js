/**
 * WhatsApp Migration Script
 * Creates tables for WhatsApp message logging and automation
 *
 * Run: node server/migrate-whatsapp.js
 */

require('dotenv').config();
const DatabaseAdapter = require('./db-adapter');

async function migrate() {
  console.log('🔄 Starting WhatsApp migration...\n');

  const db = new DatabaseAdapter();
  await db.connect();

  try {
    // Table: whatsapp_messages - Log of all messages
    console.log('📋 Creating whatsapp_messages table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        content TEXT,
        direction TEXT DEFAULT 'outgoing',
        message_id TEXT,
        status TEXT DEFAULT 'pending',
        template_name TEXT,
        booking_id INTEGER,
        guest_id INTEGER,
        error_message TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (guest_id) REFERENCES guests(id)
      )
    `);
    console.log('   ✅ whatsapp_messages table created');

    // Table: whatsapp_automation_log - Track automated messages
    console.log('📋 Creating whatsapp_automation_log table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS whatsapp_automation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_type TEXT NOT NULL,
        booking_id INTEGER,
        guest_id INTEGER,
        message_id INTEGER,
        status TEXT DEFAULT 'sent',
        scheduled_for TEXT,
        sent_at TEXT,
        error_message TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (guest_id) REFERENCES guests(id),
        FOREIGN KEY (message_id) REFERENCES whatsapp_messages(id)
      )
    `);
    console.log('   ✅ whatsapp_automation_log table created');

    // Add whatsapp_opt_out column to guests table
    console.log('📋 Adding whatsapp_opt_out to guests...');
    try {
      await db.run(`ALTER TABLE guests ADD COLUMN whatsapp_opt_out INTEGER DEFAULT 0`);
      console.log('   ✅ whatsapp_opt_out column added');
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('   ⏭️  whatsapp_opt_out already exists');
      } else {
        throw e;
      }
    }

    // Create indexes
    console.log('📋 Creating indexes...');
    await db.run(`CREATE INDEX IF NOT EXISTS idx_wa_messages_number ON whatsapp_messages(number)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_wa_messages_booking ON whatsapp_messages(booking_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_wa_messages_status ON whatsapp_messages(status)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_wa_automation_booking ON whatsapp_automation_log(booking_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_wa_automation_trigger ON whatsapp_automation_log(trigger_type)`);
    console.log('   ✅ Indexes created');

    console.log('\n✅ WhatsApp migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
