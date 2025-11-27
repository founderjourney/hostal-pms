-- ============================================================
-- ALMANIK PMS - Tasks Migration (Neon PostgreSQL)
-- ============================================================
-- Migration: 003-tasks.sql
-- Date: 2025-11-27
-- Description: Creates tasks table for cleaning/maintenance management
--
-- TASK TYPES:
-- - cleaning: Room/bed cleaning
-- - maintenance: Repairs and maintenance
-- - check_preparation: Check-in preparation
-- - inspection: Inspection
-- - restock: Restocking supplies
-- - other: Other tasks
--
-- PRIORITIES:
-- - urgent: Urgent (red)
-- - high: High (orange)
-- - normal: Normal (blue)
-- - low: Low (gray)
--
-- STATUSES:
-- - pending: Not started
-- - in_progress: Currently being worked on
-- - completed: Finished
-- - cancelled: Cancelled
-- ============================================================

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,

  -- Assignment
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  assigned_by INTEGER REFERENCES users(id),

  -- Type and priority
  task_type VARCHAR(50) NOT NULL DEFAULT 'other',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',

  -- Related entity (optional - can link to bed, room, etc.)
  entity_type VARCHAR(50),
  entity_id INTEGER,

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending',

  -- Dates
  due_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Completion notes
  completion_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_staff_id ON tasks(staff_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Add check constraints for valid values
ALTER TABLE tasks
ADD CONSTRAINT chk_task_type
CHECK (task_type IN ('cleaning', 'maintenance', 'check_preparation', 'inspection', 'restock', 'other'));

ALTER TABLE tasks
ADD CONSTRAINT chk_priority
CHECK (priority IN ('urgent', 'high', 'normal', 'low'));

ALTER TABLE tasks
ADD CONSTRAINT chk_status
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- ============================================================
-- SAMPLE DATA (Optional - remove in production)
-- ============================================================

-- INSERT INTO tasks (task_type, priority, entity_type, entity_id, title, description, status)
-- VALUES
--   ('cleaning', 'normal', 'bed', 1, 'Limpieza cama 1-A', 'Cambiar sabanas y limpiar area', 'pending'),
--   ('maintenance', 'high', 'room', 1, 'Reparar ducha', 'La ducha del bano compartido gotea', 'pending'),
--   ('restock', 'low', NULL, NULL, 'Reabastecer toallas', 'Agregar toallas limpias al almacen', 'pending');

-- ============================================================
-- END OF MIGRATION
-- ============================================================
