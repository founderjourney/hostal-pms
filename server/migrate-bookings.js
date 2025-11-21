// Script para agregar columnas faltantes a la tabla bookings en SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'almanik.db');
const db = new sqlite3.Database(dbPath);

const migrations = [
  'ALTER TABLE bookings ADD COLUMN confirmation_code TEXT',
  'ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT "walkin"',
  'ALTER TABLE bookings ADD COLUMN checked_in_at DATETIME',
  'ALTER TABLE bookings ADD COLUMN checked_out_at DATETIME',
  'ALTER TABLE bookings ADD COLUMN cancelled_at DATETIME',
  'ALTER TABLE bookings ADD COLUMN created_by INTEGER',
  'ALTER TABLE bookings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
];

console.log('🔄 Migrando tabla bookings...');

let completed = 0;
let errors = 0;

migrations.forEach((sql, index) => {
  db.run(sql, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`⚠️  Columna ${index + 1} ya existe, omitiendo...`);
      } else {
        console.error(`❌ Error en migración ${index + 1}:`, err.message);
        errors++;
      }
    } else {
      console.log(`✅ Migración ${index + 1} completada`);
    }

    completed++;

    if (completed === migrations.length) {
      if (errors === 0) {
        console.log('\n✅ Todas las migraciones completadas exitosamente');
      } else {
        console.log(`\n⚠️  Migraciones completadas con ${errors} errores`);
      }
      db.close();
    }
  });
});
