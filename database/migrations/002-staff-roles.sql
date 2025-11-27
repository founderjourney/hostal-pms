-- ============================================================
-- ALMANIK PMS - Staff Roles Migration for Neon PostgreSQL
-- ============================================================
--
-- This migration adds role-based staff management for hostel operations.
--
-- ROLES DISPONIBLES:
-- - manager: Gerente general, acceso total
-- - administrativo: Personal administrativo
-- - recepcionista_pago: Recepcionista con salario
-- - recepcionista_voluntario: Recepcionista voluntario
-- - aseo: Personal de limpieza
-- - mantenimiento: Personal de mantenimiento
-- - voluntario: Voluntarios generales (work exchange)
--
-- Run this in Neon SQL Editor:
-- https://console.neon.tech/app/projects/[YOUR_PROJECT]/sql
--
-- @author Senior Developer
-- @version 1.0.0
-- @date 2025-11-27
-- ============================================================

-- ============================================
-- ADD NEW COLUMNS TO STAFF TABLE
-- ============================================

-- Add role column with default 'voluntario'
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'voluntario';

-- Add is_volunteer flag for filtering
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT false;

-- Add notes field for observations
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add end_date if contract_end_date doesn't exist
-- (Neon schema uses contract_end_date, but module expects end_date)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'end_date') THEN
        ALTER TABLE staff ADD COLUMN end_date DATE;
    END IF;
END $$;

-- ============================================
-- CREATE INDEX FOR ROLE QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_is_volunteer ON staff(is_volunteer);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(active);

-- ============================================
-- UPDATE EXISTING STAFF WITH ROLES
-- ============================================

-- Update based on position (case-insensitive matching)
UPDATE staff SET
  role = CASE
    WHEN LOWER(position) LIKE '%gerente%' OR LOWER(position) LIKE '%manager%' OR LOWER(position) LIKE '%admin%' THEN 'manager'
    WHEN LOWER(position) LIKE '%recepcion%' AND LOWER(position) LIKE '%voluntar%' THEN 'recepcionista_voluntario'
    WHEN LOWER(position) LIKE '%recepcion%' THEN 'recepcionista_pago'
    WHEN LOWER(position) LIKE '%limpieza%' OR LOWER(position) LIKE '%aseo%' THEN 'aseo'
    WHEN LOWER(position) LIKE '%manten%' THEN 'mantenimiento'
    WHEN LOWER(position) LIKE '%voluntar%' THEN 'voluntario'
    WHEN LOWER(position) LIKE '%segur%' THEN 'administrativo'
    ELSE 'voluntario'
  END,
  is_volunteer = CASE
    WHEN LOWER(position) LIKE '%voluntar%' THEN true
    ELSE false
  END
WHERE role IS NULL OR role = 'voluntario';

-- ============================================
-- CREATE VALID ROLES CHECK (Optional - adds constraint)
-- ============================================

-- Uncomment if you want to enforce valid roles
/*
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN (
    'manager',
    'administrativo',
    'recepcionista_pago',
    'recepcionista_voluntario',
    'aseo',
    'mantenimiento',
    'voluntario'
  ));
*/

-- ============================================
-- VERIFY MIGRATION
-- ============================================

-- Check columns added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'staff'
ORDER BY ordinal_position;

-- Check staff by role
SELECT role, COUNT(*) as count, is_volunteer
FROM staff
GROUP BY role, is_volunteer
ORDER BY count DESC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- After running this migration:
-- 1. Verify columns exist with first SELECT
-- 2. Verify roles assigned with second SELECT
-- 3. Test /api/staff endpoints
-- 4. Test staff.html page
--
-- ROLLBACK (if needed):
-- ALTER TABLE staff DROP COLUMN role;
-- ALTER TABLE staff DROP COLUMN is_volunteer;
-- ALTER TABLE staff DROP COLUMN notes;
-- DROP INDEX IF EXISTS idx_staff_role;
-- DROP INDEX IF EXISTS idx_staff_is_volunteer;
-- ============================================
