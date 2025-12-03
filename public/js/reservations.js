// Reservations Management - Frontend Logic
// API_BASE_URL should be set based on environment
// Using var to avoid redeclaration errors when multiple scripts are loaded
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

let allReservations = [];
let guests = [];
let beds = [];
let currentEditId = null;

// Auth token (should be stored securely in production)
// Using var to avoid redeclaration errors when multiple scripts are loaded
if (typeof authToken === 'undefined') {
    var authToken = localStorage.getItem('authToken');
}

// API Helper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (response.status === 401) {
        showAlert('Session expired. Please login again.', 'error');
        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    await loadReservations();

    // DEV2-11: Check if action=new in URL, open modal automatically
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
        openCreateModal();
        // Clean up URL without reload
        window.history.replaceState({}, '', window.location.pathname);
    }
});

async function loadInitialData() {
    try {
        // Load guests and beds for the form
        guests = await apiRequest('/api/guests');
        beds = await apiRequest('/api/beds');

        // Populate select dropdowns
        populateGuestSelect();
        populateBedSelect();

        // Load stats
        await loadStats();
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showAlert('Failed to load data: ' + error.message, 'error');
    }
}

function populateGuestSelect() {
    const select = document.getElementById('guestId');
    select.innerHTML = '<option value="">Select a guest...</option>';

    guests.forEach(guest => {
        const option = document.createElement('option');
        option.value = guest.id;
        option.textContent = `${guest.name} (${guest.document})`;
        select.appendChild(option);
    });
}

function populateBedSelect() {
    const select = document.getElementById('bedId');
    select.innerHTML = '<option value="">Select a bed...</option>';

    beds.forEach(bed => {
        const option = document.createElement('option');
        option.value = bed.id;
        option.textContent = `${bed.name} - $${bed.price}/night`;
        option.dataset.price = bed.price;
        select.appendChild(option);
    });
}

async function loadStats() {
    try {
        const reservations = await apiRequest('/api/reservations');

        const stats = {
            total: reservations.length,
            pending: reservations.filter(r => r.status === 'pending').length,
            confirmed: reservations.filter(r => r.status === 'confirmed').length,
            checkedIn: reservations.filter(r => r.status === 'checked_in').length
        };

        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Reservations</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.pending}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.confirmed}</div>
                <div class="stat-label">Confirmed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.checkedIn}</div>
                <div class="stat-label">Checked In</div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadReservations() {
    const container = document.getElementById('reservationsList');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading reservations...</p></div>';

    try {
        allReservations = await apiRequest('/api/reservations');
        displayReservations(allReservations);
        await loadStats(); // Refresh stats
    } catch (error) {
        console.error('Failed to load reservations:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load reservations: ${error.message}
            </div>
        `;
    }
}

function displayReservations(reservations) {
    const container = document.getElementById('reservationsList');

    if (reservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Reservations Found</h3>
                <p>Create your first reservation to get started</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reservations.map(reservation => `
        <div class="reservation-card">
            <div class="reservation-header">
                <div class="reservation-info">
                    <h3>${reservation.guest_name || 'Unknown Guest'}</h3>
                    <p>Confirmation: ${reservation.confirmation_code || 'N/A'}</p>
                </div>
                <span class="status-badge status-${reservation.status}">
                    ${reservation.status.replace('_', ' ')}
                </span>
            </div>

            <div class="reservation-details">
                <div class="detail-item">
                    <i class="fas fa-bed"></i>
                    <div>
                        <div class="label">Bed</div>
                        <div class="value">${reservation.bed_name || 'N/A'}</div>
                    </div>
                </div>

                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <div>
                        <div class="label">Check-in</div>
                        <div class="value">${formatDate(reservation.check_in)}</div>
                    </div>
                </div>

                <div class="detail-item">
                    <i class="fas fa-calendar-check"></i>
                    <div>
                        <div class="label">Check-out</div>
                        <div class="value">${formatDate(reservation.check_out)}</div>
                    </div>
                </div>

                <div class="detail-item">
                    <i class="fas fa-moon"></i>
                    <div>
                        <div class="label">Nights</div>
                        <div class="value">${reservation.nights}</div>
                    </div>
                </div>

                <div class="detail-item">
                    <i class="fas fa-dollar-sign"></i>
                    <div>
                        <div class="label">Total</div>
                        <div class="value">$${parseFloat(reservation.total).toFixed(2)}</div>
                    </div>
                </div>

                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <div class="label">Source</div>
                        <div class="value">${reservation.source || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div class="reservation-actions">
                ${reservation.status === 'pending' ? `
                    <button class="btn btn-success btn-small" onclick="confirmReservation(${reservation.id})">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                ` : ''}

                ${reservation.status === 'confirmed' ? `
                    <button class="btn btn-primary btn-small" onclick="checkIn(${reservation.id})">
                        <i class="fas fa-sign-in-alt"></i> Check In
                    </button>
                ` : ''}

                ${reservation.status === 'checked_in' ? `
                    <button class="btn btn-secondary btn-small" onclick="checkOut(${reservation.id})">
                        <i class="fas fa-sign-out-alt"></i> Check Out
                    </button>
                ` : ''}

                ${reservation.status !== 'cancelled' && reservation.status !== 'checked_out' ? `
                    <button class="btn btn-danger btn-small" onclick="cancelReservation(${reservation.id})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                ` : ''}

                <button class="btn btn-secondary btn-small" onclick="viewReservation(${reservation.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function applyFilters() {
    const status = document.getElementById('filterStatus').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();

    let filtered = allReservations;

    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }

    if (dateFrom) {
        filtered = filtered.filter(r => r.check_in >= dateFrom);
    }

    if (dateTo) {
        filtered = filtered.filter(r => r.check_out <= dateTo);
    }

    if (search) {
        filtered = filtered.filter(r =>
            (r.guest_name && r.guest_name.toLowerCase().includes(search)) ||
            (r.confirmation_code && r.confirmation_code.toLowerCase().includes(search)) ||
            (r.bed_name && r.bed_name.toLowerCase().includes(search))
        );
    }

    displayReservations(filtered);
}

// Modal Functions
function openCreateModal() {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'New Reservation';
    document.getElementById('reservationForm').reset();
    document.getElementById('modalAlert').innerHTML = '';
    document.getElementById('totalPrice').textContent = '0.00';
    document.getElementById('nightsCount').textContent = '0';

    // Set default check-in to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkIn').value = today;

    // Set default check-out to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('checkOut').value = tomorrow.toISOString().split('T')[0];

    document.getElementById('reservationModal').classList.add('active');
}

function closeModal() {
    document.getElementById('reservationModal').classList.remove('active');
}

function calculateTotal() {
    const bedSelect = document.getElementById('bedId');
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;

    if (!bedSelect.value || !checkIn || !checkOut) {
        document.getElementById('totalPrice').textContent = '0.00';
        document.getElementById('nightsCount').textContent = '0';
        return;
    }

    const bedPrice = parseFloat(bedSelect.selectedOptions[0].dataset.price || 0);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (nights > 0) {
        const total = bedPrice * nights;
        document.getElementById('totalPrice').textContent = total.toFixed(2);
        document.getElementById('nightsCount').textContent = nights;
    } else {
        document.getElementById('totalPrice').textContent = '0.00';
        document.getElementById('nightsCount').textContent = '0';
    }
}

function updatePricePreview() {
    calculateTotal();
}

async function submitReservation(event) {
    event.preventDefault();

    const formData = {
        guest_id: parseInt(document.getElementById('guestId').value),
        bed_id: parseInt(document.getElementById('bedId').value),
        check_in: document.getElementById('checkIn').value,
        check_out: document.getElementById('checkOut').value,
        source: document.getElementById('source').value,
        special_requests: document.getElementById('specialRequests').value || null
    };

    try {
        const result = await apiRequest('/api/reservations', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showAlert('Reservation created successfully!', 'success');
        closeModal();
        await loadReservations();
    } catch (error) {
        console.error('Failed to create reservation:', error);
        document.getElementById('modalAlert').innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                ${error.message}
            </div>
        `;
    }
}

async function confirmReservation(id) {
    if (!confirm('Confirm this reservation?')) return;

    try {
        await apiRequest(`/api/reservations/${id}/confirm`, { method: 'POST' });
        showAlert('Reservation confirmed!', 'success');
        await loadReservations();
    } catch (error) {
        showAlert('Failed to confirm reservation: ' + error.message, 'error');
    }
}

async function cancelReservation(id) {
    if (!confirm('Cancel this reservation? This action cannot be undone.')) return;

    try {
        await apiRequest(`/api/reservations/${id}`, { method: 'DELETE' });
        showAlert('Reservation cancelled', 'success');
        await loadReservations();
    } catch (error) {
        showAlert('Failed to cancel reservation: ' + error.message, 'error');
    }
}

async function checkIn(id) {
    if (!confirm('Check in this guest?')) return;

    try {
        // This would need a check-in endpoint
        await apiRequest(`/api/reservations/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'checked_in' })
        });
        showAlert('Guest checked in!', 'success');
        await loadReservations();
    } catch (error) {
        showAlert('Failed to check in: ' + error.message, 'error');
    }
}

async function checkOut(id) {
    if (!confirm('Check out this guest?')) return;

    try {
        await apiRequest(`/api/reservations/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'checked_out' })
        });
        showAlert('Guest checked out!', 'success');
        await loadReservations();
    } catch (error) {
        showAlert('Failed to check out: ' + error.message, 'error');
    }
}

function viewReservation(id) {
    const reservation = allReservations.find(r => r.id === id);
    if (!reservation) return;

    alert(`
Reservation Details
--------------------
Confirmation: ${reservation.confirmation_code}
Guest: ${reservation.guest_name}
Bed: ${reservation.bed_name}
Check-in: ${formatDate(reservation.check_in)}
Check-out: ${formatDate(reservation.check_out)}
Nights: ${reservation.nights}
Total: $${parseFloat(reservation.total).toFixed(2)}
Status: ${reservation.status}
Source: ${reservation.source || 'N/A'}
Special Requests: ${reservation.special_requests || 'None'}
    `);
}

function showAlert(message, type) {
    const container = document.getElementById('reservationsList');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;

    container.insertBefore(alert, container.firstChild);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
