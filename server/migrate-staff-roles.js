/**
 * ============================================================
 * ALMANIK PMS - Staff Roles Migration (SQLite)
 * ============================================================
 *
 * Agrega campos de roles específicos para operación de hostal:
 *
 * ROLES DISPONIBLES:
 * - manager: Gerente general, acceso total
 * - administrativo: Personal administrativo, reportes y finanzas
 * - recepcionista_pago: Recepcionista con salario
 * - recepcionista_voluntario: Recepcionista voluntario (work exchange)
 * - aseo: Personal de limpieza
 * - mantenimiento: Personal de mantenimiento
 * - voluntario: Voluntarios generales (work exchange)
 *
 * Run: node server/migrate-staff-roles.js
 *
 * @author Senior Developer
 * @version 1.0.0
 * @date 2025-11-27
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'almanik.db');
const db = new sqlite3.Database(dbPath);

// Roles válidos para hostal
const VALID_ROLES = [
  'manager',
  'administrativo',
  'recepcionista_pago',
  'recepcionista_voluntario',
  'aseo',
  'mantenimiento',
  'voluntario'
];

const migrations = [
  { column: 'role', sql: `ALTER TABLE staff ADD COLUMN role TEXT DEFAULT 'voluntario'` },
  { column: 'is_volunteer', sql: `ALTER TABLE staff ADD COLUMN is_volunteer INTEGER DEFAULT 0` },
  { column: 'document', sql: `ALTER TABLE staff ADD COLUMN document TEXT` },
  { column: 'emergency_contact_name', sql: `ALTER TABLE staff ADD COLUMN emergency_contact_name TEXT` },
  { column: 'emergency_contact_phone', sql: `ALTER TABLE staff ADD COLUMN emergency_contact_phone TEXT` },
  { column: 'hire_date', sql: `ALTER TABLE staff ADD COLUMN hire_date TEXT` },
  { column: 'end_date', sql: `ALTER TABLE staff ADD COLUMN end_date TEXT` },
  { column: 'notes', sql: `ALTER TABLE staff ADD COLUMN notes TEXT` },
  { column: 'created_at', sql: `ALTER TABLE staff ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP` },
  { column: 'updated_at', sql: `ALTER TABLE staff ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP` }
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     ALMANIK PMS - Staff Roles Migration (SQLite)          ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Roles: manager, administrativo, recepcionista_pago,      ║');
console.log('║         recepcionista_voluntario, aseo, mantenimiento,    ║');
console.log('║         voluntario                                         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📍 Database:', dbPath);
console.log('🔄 Starting migration...\n');

// Verificar columnas existentes
db.all("PRAGMA table_info(staff)", [], (err, columns) => {
  if (err) {
    console.error('❌ Error reading table info:', err.message);
    db.close();
    return;
  }

  const existingColumns = columns.map(c => c.name);
  console.log('📋 Existing columns:', existingColumns.join(', '));
  console.log('');

  let completed = 0;
  let added = 0;
  let skipped = 0;

  migrations.forEach((migration, index) => {
    if (existingColumns.includes(migration.column)) {
      console.log(`⏭️  Column already exists: ${migration.column}`);
      skipped++;
      completed++;
      checkComplete();
    } else {
      db.run(migration.sql, (runErr) => {
        if (runErr) {
          console.log(`⚠️  Error adding ${migration.column}: ${runErr.message}`);
        } else {
          console.log(`✅ Added column: ${migration.column}`);
          added++;
        }
        completed++;
        checkComplete();
      });
    }
  });

  function checkComplete() {
    if (completed === migrations.length) {
      updateExistingStaff();
    }
  }

  function updateExistingStaff() {
    console.log('\n🔄 Updating existing staff with roles...\n');

    db.all('SELECT id, name, position FROM staff', [], (selectErr, rows) => {
      if (selectErr) {
        console.error('❌ Error reading staff:', selectErr.message);
        finalize(added, skipped);
        return;
      }

      if (!rows || rows.length === 0) {
        console.log('📭 No existing staff to update');
        finalize(added, skipped);
        return;
      }

      let updated = 0;
      rows.forEach((staff, idx) => {
        const posLower = (staff.position || '').toLowerCase();
        let role = 'voluntario';
        let isVolunteer = 0;

        // Determinar rol basado en posición
        if (posLower.includes('gerente') || posLower.includes('manager') || posLower.includes('admin')) {
          role = 'manager';
        } else if (posLower.includes('recepcion') && posLower.includes('voluntar')) {
          role = 'recepcionista_voluntario';
          isVolunteer = 1;
        } else if (posLower.includes('recepcion')) {
          role = 'recepcionista_pago';
        } else if (posLower.includes('limpieza') || posLower.includes('aseo')) {
          role = 'aseo';
        } else if (posLower.includes('manten')) {
          role = 'mantenimiento';
        } else if (posLower.includes('voluntar')) {
          role = 'voluntario';
          isVolunteer = 1;
        }

        db.run(
          'UPDATE staff SET role = ?, is_volunteer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [role, isVolunteer, staff.id],
          (updateErr) => {
            if (!updateErr) {
              console.log(`   👤 ${staff.name} → ${role}${isVolunteer ? ' (voluntario)' : ''}`);
            }
            updated++;

            if (updated === rows.length) {
              finalize(added, skipped);
            }
          }
        );
      });
    });
  }

  function finalize(addedCount, skippedCount) {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   Columns added: ${addedCount}`);
    console.log(`   Columns skipped: ${skippedCount}`);

    console.log('\n🎭 Valid staff roles:');
    const roleDesc = {
      'manager': 'Gerente - Acceso total al sistema',
      'administrativo': 'Administrativo - Reportes y finanzas',
      'recepcionista_pago': 'Recepcionista con salario',
      'recepcionista_voluntario': 'Recepcionista voluntario (work exchange)',
      'aseo': 'Personal de limpieza',
      'mantenimiento': 'Personal de mantenimiento',
      'voluntario': 'Voluntario general (work exchange)'
    };

    VALID_ROLES.forEach(role => {
      console.log(`   • ${role}: ${roleDesc[role]}`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(60) + '\n');

    db.close();
  }
});
