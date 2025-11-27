/**
 * Migration: Create attendance table if not exists
 * Run: node server/migrate-attendance.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'almanik.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Creating attendance table if not exists...\n');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, date)
)
`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('❌ Error creating table:', err.message);
  } else {
    console.log('✅ Attendance table ready');
  }

  // Create index
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON attendance(staff_id)', (err2) => {
    if (!err2) {
      console.log('✅ Index created');
    }

    db.run('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)', (err3) => {
      if (!err3) {
        console.log('✅ Date index created');
      }

      // Verify
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'", [], (err4, rows) => {
        if (rows && rows.length > 0) {
          console.log('\n✅ Migration completed successfully!');
        } else {
          console.log('\n⚠️ Table not found after creation');
        }
        db.close();
      });
    });
  });
});
