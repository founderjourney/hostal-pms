/**
 * ============================================================
 * ALMANIK PMS - Cashbox Frontend
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-27
 */

// Global state
let currentSession = null;
let stats = null;

// Category labels
const INCOME_CATEGORIES = {
  'reservation_payment': 'Pago de Reserva',
  'walk_in': 'Huesped Directo',
  'extra_service': 'Servicio Extra',
  'bar_restaurant': 'Bar/Restaurante',
  'laundry': 'Lavanderia',
  'other_income': 'Otros Ingresos'
};

const EXPENSE_CATEGORIES = {
  'supplies': 'Suministros',
  'maintenance': 'Mantenimiento',
  'utilities': 'Servicios Publicos',
  'payroll': 'Nomina',
  'food_beverage': 'Alimentos/Bebidas',
  'cleaning': 'Limpieza',
  'petty_cash': 'Caja Menor',
  'other_expense': 'Otros Gastos'
};

const PAYMENT_METHODS = {
  'cash': 'Efectivo',
  'card': 'Tarjeta',
  'transfer': 'Transferencia',
  'other': 'Otro'
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadCurrentSession();
  loadStats();
  loadTransactions();
});

// ============================================================
// API CALLS
// ============================================================

async function loadCurrentSession() {
  try {
    const response = await fetch('/api/cashbox/sessions/current');
    const data = await response.json();

    if (data.success) {
      currentSession = data.session;
      updateSessionBanner(data.has_open_session, data.session);
    }
  } catch (error) {
    console.error('Error loading session:', error);
  }
}

async function loadStats() {
  try {
    const response = await fetch('/api/cashbox/stats');
    const data = await response.json();

    if (data.success) {
      stats = data.stats;
      updateStats(data.stats);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadTransactions() {
  try {
    const filterType = document.getElementById('filter-type').value;
    let url = '/api/cashbox/transactions?limit=50';

    if (filterType) {
      url += `&transaction_type=${filterType}`;
    }

    // Add today's date filter
    const today = new Date().toISOString().split('T')[0];
    url += `&date=${today}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      renderTransactions(data.transactions);
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

// ============================================================
// UI UPDATE FUNCTIONS
// ============================================================

function updateSessionBanner(hasOpenSession, session) {
  const banner = document.getElementById('session-banner');
  const statusText = document.getElementById('session-status-text');
  const infoText = document.getElementById('session-info-text');
  const balanceEl = document.getElementById('current-balance');
  const btnOpen = document.getElementById('btn-open-session');
  const btnClose = document.getElementById('btn-close-session');
  const btnIncome = document.getElementById('btn-income');
  const btnExpense = document.getElementById('btn-expense');

  if (hasOpenSession && session) {
    banner.classList.remove('closed');
    banner.classList.add('open');
    statusText.textContent = 'Caja Abierta';
    infoText.textContent = `Abierta por ${session.opened_by_name || 'Usuario'} a las ${formatTime(session.opened_at)}`;
    balanceEl.textContent = formatCurrency(session.current_balance);
    btnOpen.style.display = 'none';
    btnClose.style.display = 'inline-flex';
    btnIncome.disabled = false;
    btnExpense.disabled = false;
  } else {
    banner.classList.remove('open');
    banner.classList.add('closed');
    statusText.textContent = 'Caja Cerrada';
    infoText.textContent = 'No hay sesion de caja abierta';
    balanceEl.textContent = '$0';
    btnOpen.style.display = 'inline-flex';
    btnClose.style.display = 'none';
    btnIncome.disabled = true;
    btnExpense.disabled = true;
  }
}

function updateStats(stats) {
  document.getElementById('stat-income').textContent = formatCurrency(stats.today.income);
  document.getElementById('stat-expense').textContent = formatCurrency(stats.today.expense);
  document.getElementById('stat-net').textContent = formatCurrency(stats.today.net);
  document.getElementById('stat-transactions').textContent = stats.today.transactions;

  document.getElementById('month-income').textContent = formatCurrency(stats.month.income);
  document.getElementById('month-expense').textContent = formatCurrency(stats.month.expense);
  document.getElementById('month-net').textContent = formatCurrency(stats.month.net);

  const monthNetEl = document.getElementById('month-net');
  monthNetEl.style.color = stats.month.net >= 0 ? '#27ae60' : '#e74c3c';
}

function renderTransactions(transactions) {
  const container = document.getElementById('transaction-list');

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No hay transacciones hoy</p>
      </div>
    `;
    return;
  }

  container.innerHTML = transactions.map(t => {
    const categoryLabels = t.transaction_type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const categoryLabel = categoryLabels[t.category] || t.category;
    const icon = t.transaction_type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up';
    const sign = t.transaction_type === 'income' ? '+' : '-';

    return `
      <div class="transaction-item">
        <div class="transaction-info">
          <div class="transaction-icon ${t.transaction_type}">
            <i class="fas ${icon}"></i>
          </div>
          <div class="transaction-details">
            <h4>${categoryLabel}</h4>
            <p>${t.description || '-'} | ${PAYMENT_METHODS[t.payment_method]} | ${formatTime(t.created_at)}</p>
          </div>
        </div>
        <div class="transaction-amount ${t.transaction_type}">
          ${sign}${formatCurrency(t.amount)}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// SESSION FUNCTIONS
// ============================================================

function openSessionModal() {
  document.getElementById('opening-amount').value = '';
  document.getElementById('opening-notes').value = '';
  document.getElementById('open-session-modal').classList.add('active');
}

async function openSession() {
  const amount = parseFloat(document.getElementById('opening-amount').value);
  const notes = document.getElementById('opening-notes').value.trim();

  if (isNaN(amount) || amount < 0) {
    showToast('Ingrese un monto valido', 'error');
    return;
  }

  try {
    const response = await fetch('/api/cashbox/sessions/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_amount: amount, notes: notes || null })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Caja abierta exitosamente', 'success');
      closeModal('open-session-modal');
      loadCurrentSession();
      loadStats();
    } else {
      showToast(data.error || 'Error abriendo caja', 'error');
    }
  } catch (error) {
    console.error('Error opening session:', error);
    showToast('Error de conexion', 'error');
  }
}

function closeSessionModal() {
  if (!currentSession) {
    showToast('No hay sesion abierta', 'error');
    return;
  }

  // Update modal with session info
  document.getElementById('close-opening').textContent = formatCurrency(currentSession.opening_amount);
  document.getElementById('close-income').textContent = formatCurrency(currentSession.total_income || 0);
  document.getElementById('close-expense').textContent = formatCurrency(currentSession.total_expense || 0);

  const expected = currentSession.opening_amount +
    (currentSession.total_income || 0) -
    (currentSession.total_expense || 0) +
    (currentSession.total_adjustments || 0);
  document.getElementById('close-expected').textContent = formatCurrency(expected);

  document.getElementById('closing-amount').value = '';
  document.getElementById('closing-notes').value = '';
  document.getElementById('close-session-modal').classList.add('active');
}

async function closeSession() {
  const amount = parseFloat(document.getElementById('closing-amount').value);
  const notes = document.getElementById('closing-notes').value.trim();

  if (isNaN(amount) || amount < 0) {
    showToast('Ingrese el monto real en caja', 'error');
    return;
  }

  try {
    const response = await fetch('/api/cashbox/sessions/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closing_amount: amount, notes: notes || null })
    });

    const data = await response.json();

    if (data.success) {
      let message = 'Caja cerrada exitosamente';
      if (data.summary.difference !== 0) {
        const diff = data.summary.difference;
        message += `. Diferencia: ${diff > 0 ? '+' : ''}${formatCurrency(diff)}`;
      }
      showToast(message, 'success');
      closeModal('close-session-modal');
      loadCurrentSession();
      loadStats();
      loadTransactions();
    } else {
      showToast(data.error || 'Error cerrando caja', 'error');
    }
  } catch (error) {
    console.error('Error closing session:', error);
    showToast('Error de conexion', 'error');
  }
}

// ============================================================
// TRANSACTION FUNCTIONS
// ============================================================

function openTransactionModal(type) {
  if (!currentSession) {
    showToast('Debe abrir la caja primero', 'error');
    return;
  }

  document.getElementById('transaction-type').value = type;
  document.getElementById('transaction-amount').value = '';
  document.getElementById('transaction-description').value = '';
  document.getElementById('transaction-payment').value = 'cash';

  // Update modal title
  const title = document.getElementById('transaction-modal-title');
  if (type === 'income') {
    title.innerHTML = '<i class="fas fa-plus" style="color: #27ae60;"></i> Registrar Ingreso';
  } else {
    title.innerHTML = '<i class="fas fa-minus" style="color: #e74c3c;"></i> Registrar Egreso';
  }

  // Populate categories
  const categorySelect = document.getElementById('transaction-category');
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  categorySelect.innerHTML = '<option value="">Seleccionar...</option>' +
    Object.entries(categories).map(([value, label]) =>
      `<option value="${value}">${label}</option>`
    ).join('');

  document.getElementById('transaction-modal').classList.add('active');
}

async function saveTransaction() {
  const type = document.getElementById('transaction-type').value;
  const category = document.getElementById('transaction-category').value;
  const amount = parseFloat(document.getElementById('transaction-amount').value);
  const paymentMethod = document.getElementById('transaction-payment').value;
  const description = document.getElementById('transaction-description').value.trim();

  if (!category) {
    showToast('Seleccione una categoria', 'error');
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast('Ingrese un monto valido', 'error');
    return;
  }

  try {
    const response = await fetch('/api/cashbox/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_type: type,
        category,
        amount,
        payment_method: paymentMethod,
        description: description || null
      })
    });

    const data = await response.json();

    if (data.success) {
      showToast(type === 'income' ? 'Ingreso registrado' : 'Egreso registrado', 'success');
      closeModal('transaction-modal');
      loadCurrentSession();
      loadStats();
      loadTransactions();
    } else {
      showToast(data.error || 'Error guardando transaccion', 'error');
    }
  } catch (error) {
    console.error('Error saving transaction:', error);
    showToast('Error de conexion', 'error');
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    ${message}
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}
