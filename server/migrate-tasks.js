/**
 * ============================================================
 * ALMANIK PMS - Tasks Table Migration (SQLite)
 * ============================================================
 *
 * Crea la tabla de tareas para gestión de limpieza y mantenimiento.
 *
 * TIPOS DE TAREA:
 * - cleaning: Limpieza de habitación/cama
 * - maintenance: Mantenimiento/reparación
 * - check_preparation: Preparación para check-in
 * - inspection: Inspección
 * - restock: Reabastecimiento
 * - other: Otros
 *
 * PRIORIDADES:
 * - urgent: Urgente (rojo)
 * - high: Alta (naranja)
 * - normal: Normal (azul)
 * - low: Baja (gris)
 *
 * Run: node server/migrate-tasks.js
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
console.log('║     ALMANIK PMS - Tasks Migration (SQLite)                 ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Types: cleaning, maintenance, check_preparation,         ║');
console.log('║         inspection, restock, other                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📍 Database:', dbPath);
console.log('🔄 Starting migration...\n');

// Create tasks table
const createTasksSQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Asignación
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  assigned_by INTEGER REFERENCES users(id),

  -- Tipo y prioridad
  task_type TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'normal',

  -- Entidad relacionada (opcional)
  entity_type TEXT,
  entity_id INTEGER,

  -- Contenido
  title TEXT NOT NULL,
  description TEXT,

  -- Estado
  status TEXT DEFAULT 'pending',

  -- Fechas
  due_date TEXT,
  started_at TEXT,
  completed_at TEXT,

  -- Notas de completación
  completion_notes TEXT,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

// Create indexes
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_tasks_staff_id ON tasks(staff_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_type, entity_id)'
];

db.serialize(() => {
  // Create table
  db.run(createTasksSQL, (err) => {
    if (err) {
      console.error('❌ Error creating tasks table:', err.message);
    } else {
      console.log('✅ Tasks table created/verified');
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

  // Verify table
  db.all("PRAGMA table_info(tasks)", [], (err, columns) => {
    if (err) {
      console.error('❌ Error verifying table:', err.message);
    } else {
      console.log('\n📋 Tasks table columns:');
      columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type || 'TEXT'})`);
      });
    }

    // Insert sample tasks for testing
    db.get("SELECT COUNT(*) as count FROM tasks", [], (err, row) => {
      if (!err && row.count === 0) {
        console.log('\n🔄 Inserting sample tasks...');

        const sampleTasks = [
          ['cleaning', 'normal', 'bed', 1, 'Limpieza cama 1-A', 'Cambiar sábanas y limpiar área', 'pending'],
          ['maintenance', 'high', 'room', 1, 'Reparar ducha', 'La ducha del baño compartido gotea', 'pending'],
          ['restock', 'low', null, null, 'Reabastecer toallas', 'Agregar toallas limpias al almacén', 'pending'],
          ['inspection', 'normal', 'room', 2, 'Inspección habitación privada', 'Verificar estado general', 'completed']
        ];

        sampleTasks.forEach(task => {
          db.run(`
            INSERT INTO tasks (task_type, priority, entity_type, entity_id, title, description, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, task, (insertErr) => {
            if (insertErr) {
              console.log('⚠️  Error inserting sample:', insertErr.message);
            }
          });
        });

        console.log('✅ Sample tasks inserted');
      }

      console.log('\n' + '═'.repeat(60));
      console.log('✅ TASKS MIGRATION COMPLETED SUCCESSFULLY');
      console.log('═'.repeat(60));
      console.log('\n🎯 Task types: cleaning, maintenance, check_preparation,');
      console.log('              inspection, restock, other');
      console.log('🎯 Priorities: urgent, high, normal, low');
      console.log('🎯 Statuses: pending, in_progress, completed, cancelled\n');

      db.close();
    });
  });
});
