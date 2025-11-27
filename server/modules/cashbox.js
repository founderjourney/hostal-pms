/**
 * ============================================================
 * ALMANIK PMS - Cashbox/Finance Module
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-27
 *
 * Gestion de caja: apertura/cierre, ingresos, egresos, reportes.
 *
 * Endpoints:
 * - GET    /sessions              - List cash sessions
 * - GET    /sessions/current      - Get current open session
 * - POST   /sessions/open         - Open new cash session
 * - POST   /sessions/close        - Close current session
 * - GET    /sessions/:id          - Get session details
 *
 * - GET    /transactions          - List transactions
 * - POST   /transactions          - Register transaction
 * - GET    /transactions/:id      - Get transaction details
 * - DELETE /transactions/:id      - Void/cancel transaction
 *
 * - GET    /stats                 - Cash statistics
 * - GET    /daily-report          - Daily cash report
 */

const express = require('express');
const router = express.Router();

// ============================================================
// CONSTANTS
// ============================================================

const TRANSACTION_TYPES = ['income', 'expense', 'adjustment'];

const INCOME_CATEGORIES = [
  'reservation_payment',
  'walk_in',
  'extra_service',
  'bar_restaurant',
  'laundry',
  'other_income'
];

const EXPENSE_CATEGORIES = [
  'supplies',
  'maintenance',
  'utilities',
  'payroll',
  'food_beverage',
  'cleaning',
  'petty_cash',
  'other_expense'
];

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'];

const CATEGORY_LABELS = {
  // Income
  reservation_payment: 'Pago de Reserva',
  walk_in: 'Huesped Directo',
  extra_service: 'Servicio Extra',
  bar_restaurant: 'Bar/Restaurante',
  laundry: 'Lavanderia',
  other_income: 'Otros Ingresos',
  // Expense
  supplies: 'Suministros',
  maintenance: 'Mantenimiento',
  utilities: 'Servicios Publicos',
  payroll: 'Nomina',
  food_beverage: 'Alimentos/Bebidas',
  cleaning: 'Limpieza',
  petty_cash: 'Caja Menor',
  other_expense: 'Otros Gastos',
  // Adjustment
  adjustment: 'Ajuste'
};

const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDb(req) {
  return req.app.locals.db;
}

function getUserId(req) {
  return req.session?.id || req.user?.id || null;
}

async function logActivity(db, action, entityType, entityId, details, userId) {
  const isSqlite = !db.isProduction;
  try {
    await db.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details, user_id, created_at)
       VALUES (${isSqlite ? '?' : '$1'}, ${isSqlite ? '?' : '$2'}, ${isSqlite ? '?' : '$3'}, ${isSqlite ? '?' : '$4'}, ${isSqlite ? '?' : '$5'}, ${isSqlite ? 'CURRENT_TIMESTAMP' : 'NOW()'})`,
      [action, entityType, entityId, JSON.stringify(details), userId]
    );
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

// ============================================================
// SESSION ENDPOINTS
// ============================================================

/**
 * GET /sessions - List cash sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;

    const { status, limit = 30 } = req.query;

    let query = `
      SELECT
        s.*,
        u1.name as opened_by_name,
        u2.name as closed_by_name,
        (SELECT COUNT(*) FROM cashbox_transactions t WHERE t.session_id = s.id) as transaction_count,
        (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0)
         FROM cashbox_transactions t WHERE t.session_id = s.id) as total_income,
        (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0)
         FROM cashbox_transactions t WHERE t.session_id = s.id) as total_expense
      FROM cashbox_sessions s
      LEFT JOIN users u1 ON s.opened_by = u1.id
      LEFT JOIN users u2 ON s.closed_by = u2.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += isSqlite ? ` AND s.status = ?` : ` AND s.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY s.opened_at DESC LIMIT ${isSqlite ? '?' : '$' + paramIndex}`;
    params.push(parseInt(limit));

    const sessions = await db.query(query, params);

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sessions/current - Get current open session
 */
router.get('/sessions/current', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;

    const query = `
      SELECT
        s.*,
        u.name as opened_by_name,
        (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0)
         FROM cashbox_transactions t WHERE t.session_id = s.id) as total_income,
        (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0)
         FROM cashbox_transactions t WHERE t.session_id = s.id) as total_expense,
        (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'adjustment' THEN t.amount ELSE 0 END), 0)
         FROM cashbox_transactions t WHERE t.session_id = s.id) as total_adjustments
      FROM cashbox_sessions s
      LEFT JOIN users u ON s.opened_by = u.id
      WHERE s.status = 'open'
      ORDER BY s.opened_at DESC
      LIMIT 1
    `;

    const sessions = await db.query(query, []);
    const session = sessions[0];

    if (!session) {
      return res.json({
        success: true,
        has_open_session: false,
        session: null
      });
    }

    // Calculate current balance
    const currentBalance = session.opening_amount +
      session.total_income -
      session.total_expense +
      session.total_adjustments;

    res.json({
      success: true,
      has_open_session: true,
      session: {
        ...session,
        current_balance: currentBalance
      }
    });
  } catch (error) {
    console.error('Error fetching current session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /sessions/open - Open new cash session
 */
router.post('/sessions/open', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;
    const userId = getUserId(req);

    const { opening_amount, notes } = req.body;

    if (opening_amount === undefined || opening_amount === null) {
      return res.status(400).json({ success: false, error: 'Opening amount is required' });
    }

    // Check for existing open session
    const existing = await db.query(
      `SELECT id FROM cashbox_sessions WHERE status = 'open' LIMIT 1`,
      []
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'There is already an open cash session. Please close it first.',
        existing_session_id: existing[0].id
      });
    }

    // Create new session
    const insertQuery = isSqlite
      ? `INSERT INTO cashbox_sessions (opened_by, opening_amount, opening_notes, status, opened_at, created_at)
         VALUES (?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      : `INSERT INTO cashbox_sessions (opened_by, opening_amount, opening_notes, status, opened_at, created_at)
         VALUES ($1, $2, $3, 'open', NOW(), NOW()) RETURNING *`;

    const result = await db.query(insertQuery, [userId, opening_amount, notes || null]);

    const sessionId = isSqlite ? result.lastID : result[0].id;

    // Get created session
    const sessions = await db.query(
      `SELECT s.*, u.name as opened_by_name FROM cashbox_sessions s
       LEFT JOIN users u ON s.opened_by = u.id
       WHERE s.id = ${isSqlite ? '?' : '$1'}`,
      [sessionId]
    );

    await logActivity(db, 'cashbox_opened', 'cashbox_session', sessionId,
      { opening_amount, notes }, userId);

    res.status(201).json({
      success: true,
      message: 'Cash session opened successfully',
      session: sessions[0]
    });
  } catch (error) {
    console.error('Error opening session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /sessions/close - Close current session
 */
router.post('/sessions/close', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;
    const userId = getUserId(req);

    const { closing_amount, notes } = req.body;

    if (closing_amount === undefined || closing_amount === null) {
      return res.status(400).json({ success: false, error: 'Closing amount is required' });
    }

    // Get current open session
    const sessions = await db.query(
      `SELECT * FROM cashbox_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`,
      []
    );

    if (sessions.length === 0) {
      return res.status(400).json({ success: false, error: 'No open cash session found' });
    }

    const session = sessions[0];

    // Calculate expected amount
    const totals = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN transaction_type = 'adjustment' THEN amount ELSE 0 END), 0) as adjustments
      FROM cashbox_transactions
      WHERE session_id = ${isSqlite ? '?' : '$1'}
    `, [session.id]);

    const { income, expense, adjustments } = totals[0];
    const expectedAmount = session.opening_amount + income - expense + adjustments;
    const difference = closing_amount - expectedAmount;

    // Update session
    const updateQuery = isSqlite
      ? `UPDATE cashbox_sessions SET
           closed_by = ?,
           closing_amount = ?,
           expected_amount = ?,
           difference = ?,
           closing_notes = ?,
           status = 'closed',
           closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      : `UPDATE cashbox_sessions SET
           closed_by = $1,
           closing_amount = $2,
           expected_amount = $3,
           difference = $4,
           closing_notes = $5,
           status = 'closed',
           closed_at = NOW(),
           updated_at = NOW()
         WHERE id = $6`;

    await db.query(updateQuery, [
      userId,
      closing_amount,
      expectedAmount,
      difference,
      notes || null,
      session.id
    ]);

    // Get updated session
    const updated = await db.query(
      `SELECT s.*, u1.name as opened_by_name, u2.name as closed_by_name
       FROM cashbox_sessions s
       LEFT JOIN users u1 ON s.opened_by = u1.id
       LEFT JOIN users u2 ON s.closed_by = u2.id
       WHERE s.id = ${isSqlite ? '?' : '$1'}`,
      [session.id]
    );

    await logActivity(db, 'cashbox_closed', 'cashbox_session', session.id,
      { closing_amount, expected_amount: expectedAmount, difference }, userId);

    res.json({
      success: true,
      message: 'Cash session closed successfully',
      session: updated[0],
      summary: {
        opening_amount: session.opening_amount,
        total_income: income,
        total_expense: expense,
        total_adjustments: adjustments,
        expected_amount: expectedAmount,
        closing_amount: closing_amount,
        difference: difference
      }
    });
  } catch (error) {
    console.error('Error closing session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sessions/:id - Get session details
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;
    const { id } = req.params;

    const sessions = await db.query(`
      SELECT s.*, u1.name as opened_by_name, u2.name as closed_by_name
      FROM cashbox_sessions s
      LEFT JOIN users u1 ON s.opened_by = u1.id
      LEFT JOIN users u2 ON s.closed_by = u2.id
      WHERE s.id = ${isSqlite ? '?' : '$1'}
    `, [id]);

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Get transactions for this session
    const transactions = await db.query(`
      SELECT t.*, u.name as created_by_name
      FROM cashbox_transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.session_id = ${isSqlite ? '?' : '$1'}
      ORDER BY t.created_at DESC
    `, [id]);

    // Calculate totals
    const totals = {
      income: 0,
      expense: 0,
      adjustments: 0
    };

    transactions.forEach(t => {
      if (t.transaction_type === 'income') totals.income += t.amount;
      else if (t.transaction_type === 'expense') totals.expense += t.amount;
      else if (t.transaction_type === 'adjustment') totals.adjustments += t.amount;
    });

    res.json({
      success: true,
      session: sessions[0],
      transactions,
      totals,
      transaction_count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TRANSACTION ENDPOINTS
// ============================================================

/**
 * GET /transactions - List transactions
 */
router.get('/transactions', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;

    const { session_id, transaction_type, category, payment_method, date, limit = 50 } = req.query;

    let query = `
      SELECT t.*, u.name as created_by_name
      FROM cashbox_transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (session_id) {
      query += isSqlite ? ` AND t.session_id = ?` : ` AND t.session_id = $${paramIndex++}`;
      params.push(session_id);
    }

    if (transaction_type) {
      query += isSqlite ? ` AND t.transaction_type = ?` : ` AND t.transaction_type = $${paramIndex++}`;
      params.push(transaction_type);
    }

    if (category) {
      query += isSqlite ? ` AND t.category = ?` : ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }

    if (payment_method) {
      query += isSqlite ? ` AND t.payment_method = ?` : ` AND t.payment_method = $${paramIndex++}`;
      params.push(payment_method);
    }

    if (date) {
      if (isSqlite) {
        query += ` AND DATE(t.created_at) = ?`;
      } else {
        query += ` AND DATE(t.created_at) = $${paramIndex++}`;
      }
      params.push(date);
    }

    query += ` ORDER BY t.created_at DESC LIMIT ${isSqlite ? '?' : '$' + paramIndex}`;
    params.push(parseInt(limit));

    const transactions = await db.query(query, params);

    res.json({
      success: true,
      count: transactions.length,
      transaction_types: TRANSACTION_TYPES,
      income_categories: INCOME_CATEGORIES,
      expense_categories: EXPENSE_CATEGORIES,
      category_labels: CATEGORY_LABELS,
      payment_methods: PAYMENT_METHODS,
      payment_method_labels: PAYMENT_METHOD_LABELS,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /transactions - Register transaction
 */
router.post('/transactions', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;
    const userId = getUserId(req);

    const {
      transaction_type,
      category,
      amount,
      description,
      payment_method = 'cash',
      reference_type,
      reference_id
    } = req.body;

    // Validations
    if (!transaction_type || !TRANSACTION_TYPES.includes(transaction_type)) {
      return res.status(400).json({
        success: false,
        error: 'Valid transaction type is required',
        valid_types: TRANSACTION_TYPES
      });
    }

    if (!category) {
      return res.status(400).json({ success: false, error: 'Category is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }

    // Validate category based on type
    if (transaction_type === 'income' && !INCOME_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid income category',
        valid_categories: INCOME_CATEGORIES
      });
    }

    if (transaction_type === 'expense' && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expense category',
        valid_categories: EXPENSE_CATEGORIES
      });
    }

    // Get current open session
    const sessions = await db.query(
      `SELECT id FROM cashbox_sessions WHERE status = 'open' LIMIT 1`,
      []
    );

    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No open cash session. Please open a session first.'
      });
    }

    const sessionId = sessions[0].id;

    // Insert transaction
    const insertQuery = isSqlite
      ? `INSERT INTO cashbox_transactions
         (session_id, transaction_type, category, amount, description, payment_method, reference_type, reference_id, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      : `INSERT INTO cashbox_transactions
         (session_id, transaction_type, category, amount, description, payment_method, reference_type, reference_id, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`;

    const result = await db.query(insertQuery, [
      sessionId,
      transaction_type,
      category,
      amount,
      description || null,
      payment_method,
      reference_type || null,
      reference_id || null,
      userId
    ]);

    const transactionId = isSqlite ? result.lastID : result[0].id;

    // Get created transaction
    const transactions = await db.query(
      `SELECT t.*, u.name as created_by_name FROM cashbox_transactions t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = ${isSqlite ? '?' : '$1'}`,
      [transactionId]
    );

    await logActivity(db, 'transaction_created', 'cashbox_transaction', transactionId,
      { transaction_type, category, amount, payment_method }, userId);

    res.status(201).json({
      success: true,
      message: `${transaction_type === 'income' ? 'Income' : transaction_type === 'expense' ? 'Expense' : 'Adjustment'} registered successfully`,
      transaction: transactions[0]
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /transactions/:id - Get transaction details
 */
router.get('/transactions/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;
    const { id } = req.params;

    const transactions = await db.query(`
      SELECT t.*, u.name as created_by_name
      FROM cashbox_transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ${isSqlite ? '?' : '$1'}
    `, [id]);

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction: transactions[0]
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /transactions/:id - Void transaction (only if session is open)
 */
router.delete('/transactions/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;
    const userId = getUserId(req);
    const { id } = req.params;

    // Get transaction with session info
    const transactions = await db.query(`
      SELECT t.*, s.status as session_status
      FROM cashbox_transactions t
      JOIN cashbox_sessions s ON t.session_id = s.id
      WHERE t.id = ${isSqlite ? '?' : '$1'}
    `, [id]);

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const transaction = transactions[0];

    if (transaction.session_status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete transaction from a closed session'
      });
    }

    // Delete transaction
    await db.query(
      `DELETE FROM cashbox_transactions WHERE id = ${isSqlite ? '?' : '$1'}`,
      [id]
    );

    await logActivity(db, 'transaction_voided', 'cashbox_transaction', id,
      { original_transaction: transaction }, userId);

    res.json({
      success: true,
      message: 'Transaction voided successfully'
    });
  } catch (error) {
    console.error('Error voiding transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// STATS & REPORTS
// ============================================================

/**
 * GET /stats - Cash statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;

    // Current session stats
    const currentSession = await db.query(`
      SELECT
        s.*,
        (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0)
         FROM cashbox_transactions t WHERE t.session_id = s.id) as total_income,
        (SELECT COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0)
         FROM cashbox_transactions t WHERE t.session_id = s.id) as total_expense,
        (SELECT COUNT(*) FROM cashbox_transactions t WHERE t.session_id = s.id) as transaction_count
      FROM cashbox_sessions s
      WHERE s.status = 'open'
      LIMIT 1
    `, []);

    // Today's totals
    const todayQuery = isSqlite
      ? `SELECT
           COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as today_income,
           COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as today_expense,
           COUNT(*) as today_transactions
         FROM cashbox_transactions
         WHERE DATE(created_at) = DATE('now')`
      : `SELECT
           COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as today_income,
           COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as today_expense,
           COUNT(*) as today_transactions
         FROM cashbox_transactions
         WHERE DATE(created_at) = CURRENT_DATE`;

    const todayStats = await db.query(todayQuery, []);

    // This month totals
    const monthQuery = isSqlite
      ? `SELECT
           COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as month_income,
           COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as month_expense
         FROM cashbox_transactions
         WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
      : `SELECT
           COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as month_income,
           COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as month_expense
         FROM cashbox_transactions
         WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`;

    const monthStats = await db.query(monthQuery, []);

    // By category (today)
    const byCategoryQuery = isSqlite
      ? `SELECT transaction_type, category, SUM(amount) as total
         FROM cashbox_transactions
         WHERE DATE(created_at) = DATE('now')
         GROUP BY transaction_type, category`
      : `SELECT transaction_type, category, SUM(amount) as total
         FROM cashbox_transactions
         WHERE DATE(created_at) = CURRENT_DATE
         GROUP BY transaction_type, category`;

    const byCategory = await db.query(byCategoryQuery, []);

    const session = currentSession[0];
    let currentBalance = null;
    if (session) {
      currentBalance = session.opening_amount + session.total_income - session.total_expense;
    }

    res.json({
      success: true,
      stats: {
        has_open_session: !!session,
        current_session: session ? {
          id: session.id,
          opening_amount: session.opening_amount,
          current_balance: currentBalance,
          total_income: session.total_income,
          total_expense: session.total_expense,
          transaction_count: session.transaction_count
        } : null,
        today: {
          income: todayStats[0].today_income,
          expense: todayStats[0].today_expense,
          net: todayStats[0].today_income - todayStats[0].today_expense,
          transactions: todayStats[0].today_transactions
        },
        month: {
          income: monthStats[0].month_income,
          expense: monthStats[0].month_expense,
          net: monthStats[0].month_income - monthStats[0].month_expense
        },
        by_category: byCategory
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /daily-report - Daily cash report
 */
router.get('/daily-report', async (req, res) => {
  try {
    const db = getDb(req);
    const isSqlite = !db.isProduction;

    const { date } = req.query;
    const reportDate = date || (isSqlite ? "date('now')" : 'CURRENT_DATE');

    let dateCondition;
    const params = [];

    if (date) {
      dateCondition = isSqlite ? `DATE(created_at) = ?` : `DATE(created_at) = $1`;
      params.push(date);
    } else {
      dateCondition = isSqlite ? `DATE(created_at) = DATE('now')` : `DATE(created_at) = CURRENT_DATE`;
    }

    // Get sessions for the day
    const sessionsQuery = `
      SELECT s.*, u1.name as opened_by_name, u2.name as closed_by_name
      FROM cashbox_sessions s
      LEFT JOIN users u1 ON s.opened_by = u1.id
      LEFT JOIN users u2 ON s.closed_by = u2.id
      WHERE DATE(s.opened_at) = ${date ? (isSqlite ? '?' : '$1') : (isSqlite ? "DATE('now')" : 'CURRENT_DATE')}
      ORDER BY s.opened_at
    `;
    const sessions = await db.query(sessionsQuery, date ? [date] : []);

    // Get all transactions for the day
    const transactionsQuery = `
      SELECT t.*, u.name as created_by_name
      FROM cashbox_transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE ${dateCondition}
      ORDER BY t.created_at
    `;
    const transactions = await db.query(transactionsQuery, params);

    // Calculate totals by type
    const totals = {
      income: { total: 0, by_category: {}, by_payment_method: {} },
      expense: { total: 0, by_category: {} },
      adjustments: 0
    };

    transactions.forEach(t => {
      if (t.transaction_type === 'income') {
        totals.income.total += t.amount;
        totals.income.by_category[t.category] = (totals.income.by_category[t.category] || 0) + t.amount;
        totals.income.by_payment_method[t.payment_method] = (totals.income.by_payment_method[t.payment_method] || 0) + t.amount;
      } else if (t.transaction_type === 'expense') {
        totals.expense.total += t.amount;
        totals.expense.by_category[t.category] = (totals.expense.by_category[t.category] || 0) + t.amount;
      } else if (t.transaction_type === 'adjustment') {
        totals.adjustments += t.amount;
      }
    });

    res.json({
      success: true,
      report_date: date || new Date().toISOString().split('T')[0],
      sessions_count: sessions.length,
      sessions,
      transactions_count: transactions.length,
      transactions,
      totals,
      net_result: totals.income.total - totals.expense.total + totals.adjustments,
      category_labels: CATEGORY_LABELS,
      payment_method_labels: PAYMENT_METHOD_LABELS
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
