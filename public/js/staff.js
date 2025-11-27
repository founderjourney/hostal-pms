/**
 * ============================================================
 * ALMANIK PMS - Staff Management Frontend
 * ============================================================
 *
 * @version 1.0.0
 * @date 2025-11-27
 */

// Global state
let allStaff = [];
let currentEditId = null;

// Role labels for display
const ROLE_LABELS = {
    'manager': 'Manager',
    'administrativo': 'Administrativo',
    'recepcionista_pago': 'Recepcionista Pago',
    'recepcionista_voluntario': 'Recepcionista Voluntario',
    'aseo': 'Aseo / Limpieza',
    'mantenimiento': 'Mantenimiento',
    'voluntario': 'Voluntario'
};

// Volunteer roles (no salary)
const VOLUNTEER_ROLES = ['voluntario', 'recepcionista_voluntario'];

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadOnDuty();
    loadStaff();

    // Set default hire date to today
    document.getElementById('staff-hire-date').valueAsDate = new Date();
});

// ============================================================
// API CALLS
// ============================================================

async function loadStats() {
    try {
        const response = await fetch('/api/staff/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('stat-total').textContent = data.stats.total_active;
            document.getElementById('stat-onduty').textContent = data.stats.on_duty_today;
            document.getElementById('stat-volunteers').textContent = data.stats.volunteers;
            document.getElementById('stat-paid').textContent = data.stats.paid_staff;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadOnDuty() {
    try {
        const response = await fetch('/api/staff/attendance/today');
        const data = await response.json();

        const container = document.getElementById('on-duty-list');

        if (data.success && data.on_duty.length > 0) {
            container.innerHTML = data.on_duty.map(item => `
                <div class="on-duty-item">
                    <div class="avatar-small">${getInitials(item.staff_name)}</div>
                    <div class="info">
                        <div class="name">${item.staff_name}</div>
                        <div class="time">
                            <i class="fas fa-sign-in-alt"></i>
                            ${formatTime(item.clock_in)}
                            ${item.role ? ` - ${ROLE_LABELS[item.role] || item.role}` : ''}
                        </div>
                    </div>
                    <button class="btn btn-warning btn-small" onclick="clockOut(${item.staff_id})">
                        <i class="fas fa-sign-out-alt"></i> Salida
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-moon"></i>
                    <p>No hay personal en turno actualmente</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading on duty:', error);
    }
}

async function loadStaff() {
    try {
        // Build query params from filters
        const params = new URLSearchParams();

        const role = document.getElementById('filter-role').value;
        const active = document.getElementById('filter-active').value;
        const volunteer = document.getElementById('filter-volunteer').value;

        if (role) params.append('role', role);
        if (active !== '') params.append('active', active);
        if (volunteer !== '') params.append('is_volunteer', volunteer);

        const response = await fetch(`/api/staff?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            allStaff = data.staff;
            renderStaff(allStaff);
        } else {
            showToast('Error cargando personal', 'error');
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        showToast('Error de conexion', 'error');
    }
}

function filterStaff() {
    const search = document.getElementById('filter-search').value.toLowerCase();

    let filtered = allStaff;

    if (search) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(search) ||
            (s.email && s.email.toLowerCase().includes(search)) ||
            (s.phone && s.phone.includes(search)) ||
            (s.document && s.document.includes(search))
        );
    }

    renderStaff(filtered);

    // Reload with server-side filters
    loadStaff();
}

function renderStaff(staff) {
    const container = document.getElementById('staff-grid');

    if (staff.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-users-slash"></i>
                <p>No se encontro personal con los filtros seleccionados</p>
            </div>
        `;
        return;
    }

    container.innerHTML = staff.map(s => `
        <div class="staff-card ${s.active ? '' : 'inactive'}">
            <span class="role-badge ${s.role}">${ROLE_LABELS[s.role] || s.role}</span>

            <div class="avatar">${getInitials(s.name)}</div>
            <div class="name">${s.name}</div>
            <div class="position">${s.position || ROLE_LABELS[s.role]}</div>

            ${s.phone ? `
                <div class="info-row">
                    <i class="fas fa-phone"></i>
                    <span>${s.phone}</span>
                </div>
            ` : ''}

            ${s.email ? `
                <div class="info-row">
                    <i class="fas fa-envelope"></i>
                    <span>${s.email}</span>
                </div>
            ` : ''}

            ${s.schedule ? `
                <div class="info-row">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${s.schedule}</span>
                </div>
            ` : ''}

            ${!s.is_volunteer && s.salary ? `
                <div class="info-row">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>$${formatNumber(s.salary)} COP</span>
                </div>
            ` : ''}

            ${s.is_volunteer ? '<span class="volunteer-badge"><i class="fas fa-heart"></i> Voluntario</span>' : ''}

            <div class="actions">
                <button class="btn btn-success btn-small" onclick="clockIn(${s.id})" title="Registrar entrada">
                    <i class="fas fa-sign-in-alt"></i>
                </button>
                <button class="btn btn-secondary btn-small" onclick="viewDetail(${s.id})" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-primary btn-small" onclick="editStaff(${s.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                ${s.active ? `
                    <button class="btn btn-danger btn-small" onclick="deactivateStaff(${s.id})" title="Desactivar">
                        <i class="fas fa-user-slash"></i>
                    </button>
                ` : `
                    <button class="btn btn-success btn-small" onclick="reactivateStaff(${s.id})" title="Reactivar">
                        <i class="fas fa-user-check"></i>
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

// ============================================================
// MODAL FUNCTIONS
// ============================================================

function openAddModal() {
    currentEditId = null;
    document.getElementById('modal-title').textContent = 'Agregar Personal';
    document.getElementById('staff-form').reset();
    document.getElementById('staff-hire-date').valueAsDate = new Date();
    document.getElementById('salary-group').style.display = 'block';
    document.getElementById('staff-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('staff-modal').classList.remove('active');
    currentEditId = null;
}

async function editStaff(id) {
    try {
        const response = await fetch(`/api/staff/${id}`);
        const data = await response.json();

        if (data.success) {
            const staff = data.staff;
            currentEditId = id;

            document.getElementById('modal-title').textContent = 'Editar Personal';
            document.getElementById('staff-id').value = staff.id;
            document.getElementById('staff-name').value = staff.name || '';
            document.getElementById('staff-role').value = staff.role || '';
            document.getElementById('staff-document').value = staff.document || '';
            document.getElementById('staff-phone').value = staff.phone || '';
            document.getElementById('staff-email').value = staff.email || '';
            document.getElementById('staff-salary').value = staff.salary || '';
            document.getElementById('staff-hire-date').value = staff.hire_date || '';
            document.getElementById('staff-end-date').value = staff.end_date || '';
            document.getElementById('staff-schedule').value = staff.schedule || '';
            document.getElementById('staff-emergency-name').value = staff.emergency_contact_name || '';
            document.getElementById('staff-emergency-phone').value = staff.emergency_contact_phone || '';
            document.getElementById('staff-notes').value = staff.notes || '';

            onRoleChange();
            document.getElementById('staff-modal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        showToast('Error cargando datos', 'error');
    }
}

async function saveStaff() {
    const name = document.getElementById('staff-name').value.trim();
    const role = document.getElementById('staff-role').value;

    if (!name || !role) {
        showToast('Nombre y rol son requeridos', 'error');
        return;
    }

    const staffData = {
        name,
        role,
        document: document.getElementById('staff-document').value.trim() || null,
        phone: document.getElementById('staff-phone').value.trim() || null,
        email: document.getElementById('staff-email').value.trim() || null,
        salary: parseFloat(document.getElementById('staff-salary').value) || null,
        hire_date: document.getElementById('staff-hire-date').value || null,
        end_date: document.getElementById('staff-end-date').value || null,
        schedule: document.getElementById('staff-schedule').value.trim() || null,
        emergency_contact_name: document.getElementById('staff-emergency-name').value.trim() || null,
        emergency_contact_phone: document.getElementById('staff-emergency-phone').value.trim() || null,
        notes: document.getElementById('staff-notes').value.trim() || null
    };

    try {
        const url = currentEditId ? `/api/staff/${currentEditId}` : '/api/staff';
        const method = currentEditId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staffData)
        });

        const data = await response.json();

        if (data.success) {
            showToast(currentEditId ? 'Personal actualizado' : 'Personal agregado', 'success');
            closeModal();
            loadStaff();
            loadStats();
        } else {
            showToast(data.error || 'Error guardando', 'error');
        }
    } catch (error) {
        console.error('Error saving staff:', error);
        showToast('Error de conexion', 'error');
    }
}

function onRoleChange() {
    const role = document.getElementById('staff-role').value;
    const salaryGroup = document.getElementById('salary-group');

    if (VOLUNTEER_ROLES.includes(role)) {
        salaryGroup.style.display = 'none';
        document.getElementById('staff-salary').value = '';
    } else {
        salaryGroup.style.display = 'block';
    }
}

// ============================================================
// DETAIL MODAL
// ============================================================

async function viewDetail(id) {
    try {
        const response = await fetch(`/api/staff/${id}`);
        const data = await response.json();

        if (data.success) {
            const staff = data.staff;
            const stats = data.month_stats;
            const attendance = data.recent_attendance;

            const content = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <div class="avatar" style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; color: white; margin-bottom: 15px;">
                        ${getInitials(staff.name)}
                    </div>
                    <h3 style="color: #2c3e50; margin-bottom: 5px;">${staff.name}</h3>
                    <span class="role-badge ${staff.role}" style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px;">
                        ${ROLE_LABELS[staff.role] || staff.role}
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 24px; font-weight: 700; color: #2ecc71;">${stats.present || 0}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Dias Presentes</div>
                    </div>
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 24px; font-weight: 700; color: #f39c12;">${stats.late || 0}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Llegadas Tarde</div>
                    </div>
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 24px; font-weight: 700; color: #e74c3c;">${stats.absent || 0}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Ausencias</div>
                    </div>
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 24px; font-weight: 700; color: #3498db;">${stats.days_worked || 0}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Total Dias</div>
                    </div>
                </div>

                <h4 style="color: #2c3e50; margin-bottom: 15px;">Informacion de Contacto</h4>
                <div style="margin-bottom: 30px;">
                    ${staff.phone ? `<p><i class="fas fa-phone" style="width: 20px; color: #3498db;"></i> ${staff.phone}</p>` : ''}
                    ${staff.email ? `<p><i class="fas fa-envelope" style="width: 20px; color: #3498db;"></i> ${staff.email}</p>` : ''}
                    ${staff.document ? `<p><i class="fas fa-id-card" style="width: 20px; color: #3498db;"></i> ${staff.document}</p>` : ''}
                    ${staff.schedule ? `<p><i class="fas fa-calendar-alt" style="width: 20px; color: #3498db;"></i> ${staff.schedule}</p>` : ''}
                    ${staff.hire_date ? `<p><i class="fas fa-briefcase" style="width: 20px; color: #3498db;"></i> Desde: ${formatDate(staff.hire_date)}</p>` : ''}
                </div>

                ${staff.emergency_contact_name ? `
                    <h4 style="color: #2c3e50; margin-bottom: 15px;">Contacto de Emergencia</h4>
                    <div style="margin-bottom: 30px;">
                        <p><i class="fas fa-user" style="width: 20px; color: #e74c3c;"></i> ${staff.emergency_contact_name}</p>
                        ${staff.emergency_contact_phone ? `<p><i class="fas fa-phone" style="width: 20px; color: #e74c3c;"></i> ${staff.emergency_contact_phone}</p>` : ''}
                    </div>
                ` : ''}

                ${attendance.length > 0 ? `
                    <h4 style="color: #2c3e50; margin-bottom: 15px;">Ultimas Asistencias</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${attendance.map(a => `
                            <div style="padding: 10px; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between;">
                                <span>${formatDate(a.date)}</span>
                                <span>
                                    ${a.clock_in ? formatTime(a.clock_in) : '-'}
                                    -
                                    ${a.clock_out ? formatTime(a.clock_out) : 'En turno'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${staff.notes ? `
                    <h4 style="color: #2c3e50; margin-bottom: 15px; margin-top: 20px;">Notas</h4>
                    <p style="color: #7f8c8d;">${staff.notes}</p>
                ` : ''}
            `;

            document.getElementById('detail-content').innerHTML = content;
            document.getElementById('detail-modal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading detail:', error);
        showToast('Error cargando detalle', 'error');
    }
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
}

// ============================================================
// CLOCK IN/OUT
// ============================================================

async function clockIn(id) {
    try {
        const response = await fetch(`/api/staff/${id}/clock-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            loadOnDuty();
            loadStats();
        } else {
            showToast(data.error || 'Error registrando entrada', 'error');
        }
    } catch (error) {
        console.error('Error clocking in:', error);
        showToast('Error de conexion', 'error');
    }
}

async function clockOut(id) {
    if (!confirm('Registrar salida?')) return;

    try {
        const response = await fetch(`/api/staff/${id}/clock-out`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.success) {
            showToast(`${data.message} (${data.hours_worked}h)`, 'success');
            loadOnDuty();
            loadStats();
        } else {
            showToast(data.error || 'Error registrando salida', 'error');
        }
    } catch (error) {
        console.error('Error clocking out:', error);
        showToast('Error de conexion', 'error');
    }
}

// ============================================================
// ACTIVATE/DEACTIVATE
// ============================================================

async function deactivateStaff(id) {
    if (!confirm('Desactivar este miembro del personal?')) return;

    try {
        const response = await fetch(`/api/staff/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Personal desactivado', 'success');
            loadStaff();
            loadStats();
        } else {
            showToast(data.error || 'Error desactivando', 'error');
        }
    } catch (error) {
        console.error('Error deactivating:', error);
        showToast('Error de conexion', 'error');
    }
}

async function reactivateStaff(id) {
    try {
        const response = await fetch(`/api/staff/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: true, end_date: null })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Personal reactivado', 'success');
            loadStaff();
            loadStats();
        } else {
            showToast(data.error || 'Error reactivando', 'error');
        }
    } catch (error) {
        console.error('Error reactivating:', error);
        showToast('Error de conexion', 'error');
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatNumber(num) {
    return new Intl.NumberFormat('es-CO').format(num);
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}
