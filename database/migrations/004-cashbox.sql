-- ============================================================
-- ALMANIK PMS - Cashbox Migration (Neon PostgreSQL)
-- ============================================================
-- Migration: 004-cashbox.sql
-- Date: 2025-11-27
-- Description: Creates cashbox tables for cash management
--
-- TABLES:
-- - cashbox_sessions: Cash register opening/closing sessions
-- - cashbox_transactions: Income and expense movements
--
-- TRANSACTION TYPES:
-- - income: Money coming in
-- - expense: Money going out
-- - adjustment: Balance adjustments
--
-- SESSION STATUSES:
-- - open: Currently active session
-- - closed: Session has been closed
-- ============================================================

-- Create cashbox_sessions table
CREATE TABLE IF NOT EXISTS cashbox_sessions (
  id SERIAL PRIMARY KEY,

  -- Responsible users
  opened_by INTEGER REFERENCES users(id),
  closed_by INTEGER REFERENCES users(id),

  -- Amounts
  opening_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  closing_amount DECIMAL(12, 2),
  expected_amount DECIMAL(12, 2),
  difference DECIMAL(12, 2),

  -- Status
  status VARCHAR(20) DEFAULT 'open',

  -- Dates
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  opening_notes TEXT,
  closing_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cashbox_transactions table
CREATE TABLE IF NOT EXISTS cashbox_transactions (
  id SERIAL PRIMARY KEY,

  -- Session reference
  session_id INTEGER REFERENCES cashbox_sessions(id),

  -- Type and category
  transaction_type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,

  -- Amount
  amount DECIMAL(12, 2) NOT NULL,

  -- Reference to other entities (reservation, invoice, etc)
  reference_type VARCHAR(50),
  reference_id INTEGER,

  -- Description
  description TEXT,

  -- Payment method
  payment_method VARCHAR(20) DEFAULT 'cash',

  -- Responsible user
  created_by INTEGER REFERENCES users(id),

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cashbox_sessions_status ON cashbox_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cashbox_sessions_opened_at ON cashbox_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_cashbox_sessions_opened_by ON cashbox_sessions(opened_by);

CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_session ON cashbox_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_type ON cashbox_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_category ON cashbox_transactions(category);
CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_created_at ON cashbox_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_reference ON cashbox_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_cashbox_transactions_payment ON cashbox_transactions(payment_method);

-- Add check constraints
ALTER TABLE cashbox_sessions
ADD CONSTRAINT chk_session_status
CHECK (status IN ('open', 'closed'));

ALTER TABLE cashbox_transactions
ADD CONSTRAINT chk_transaction_type
CHECK (transaction_type IN ('income', 'expense', 'adjustment'));

ALTER TABLE cashbox_transactions
ADD CONSTRAINT chk_payment_method
CHECK (payment_method IN ('cash', 'card', 'transfer', 'other'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_cashbox_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_cashbox_sessions_updated_at ON cashbox_sessions;
CREATE TRIGGER trigger_cashbox_sessions_updated_at
  BEFORE UPDATE ON cashbox_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_cashbox_sessions_updated_at();

-- ============================================================
-- INCOME CATEGORIES:
-- - reservation_payment: Payment for reservation
-- - walk_in: Direct guest (no reservation)
-- - extra_service: Additional services
-- - bar_restaurant: Bar/Restaurant sales
-- - laundry: Laundry services
-- - other_income: Other income
--
-- EXPENSE CATEGORIES:
-- - supplies: Office/general supplies
-- - maintenance: Repairs and maintenance
-- - utilities: Electricity, water, internet
-- - payroll: Staff payments
-- - food_beverage: Food and drinks for guests
-- - cleaning: Cleaning supplies
-- - petty_cash: Small cash expenses
-- - other_expense: Other expenses
-- ============================================================

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('cashbox_sessions', 'cashbox_transactions')
ORDER BY table_name, ordinal_position;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
