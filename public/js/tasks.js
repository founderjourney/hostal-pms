/**
 * ============================================================
 * ALMANIK PMS - Tasks/Maintenance Frontend
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-27
 */

// Global state
let allTasks = [];
let allStaff = [];
let currentEditId = null;

// Labels
const TYPE_LABELS = {
    'cleaning': 'Limpieza',
    'maintenance': 'Mantenimiento',
    'check_preparation': 'Prep. Check-in',
    'inspection': 'Inspeccion',
    'restock': 'Reabastecimiento',
    'other': 'Otro'
};

const PRIORITY_LABELS = {
    'urgent': 'Urgente',
    'high': 'Alta',
    'normal': 'Normal',
    'low': 'Baja'
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadStaff();
    loadTasks();
});

// ============================================================
// API CALLS
// ============================================================

async function loadStats() {
    try {
        const response = await fetch('/api/tasks/stats');
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;

            // Find counts from by_status array
            const pending = stats.by_status.find(s => s.status === 'pending')?.count || 0;
            const inProgress = stats.by_status.find(s => s.status === 'in_progress')?.count || 0;

            document.getElementById('stat-overdue').textContent = stats.overdue;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-progress').textContent = inProgress;
            document.getElementById('stat-completed').textContent = stats.completed_today;
            document.getElementById('stat-unassigned').textContent = stats.unassigned;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadStaff() {
    try {
        const response = await fetch('/api/staff?active=1');
        const data = await response.json();

        if (data.success) {
            allStaff = data.staff;

            // Populate filter dropdown
            const filterSelect = document.getElementById('filter-staff');
            const taskSelect = document.getElementById('task-staff');

            const options = data.staff.map(s =>
                `<option value="${s.id}">${s.name} (${s.role})</option>`
            ).join('');

            filterSelect.innerHTML = '<option value="">Todos</option>' + options;
            taskSelect.innerHTML = '<option value="">Sin asignar</option>' + options;
        }
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

async function loadTasks() {
    try {
        const params = new URLSearchParams();

        const type = document.getElementById('filter-type').value;
        const priority = document.getElementById('filter-priority').value;
        const status = document.getElementById('filter-status').value;
        const staffId = document.getElementById('filter-staff').value;

        if (type) params.append('task_type', type);
        if (priority) params.append('priority', priority);
        if (status) params.append('status', status);
        if (staffId) params.append('staff_id', staffId);

        const response = await fetch(`/api/tasks?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            allTasks = data.tasks;
            renderKanban(data.tasks);
        } else {
            showToast('Error cargando tareas', 'error');
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error de conexion', 'error');
    }
}

function renderKanban(tasks) {
    const pending = tasks.filter(t => t.status === 'pending');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const completed = tasks.filter(t => t.status === 'completed');

    document.getElementById('count-pending').textContent = pending.length;
    document.getElementById('count-progress').textContent = inProgress.length;
    document.getElementById('count-completed').textContent = completed.length;

    document.getElementById('tasks-pending').innerHTML = pending.length
        ? pending.map(t => renderTaskCard(t)).join('')
        : '<div class="empty-state"><i class="fas fa-inbox"></i><p>No hay tareas pendientes</p></div>';

    document.getElementById('tasks-progress').innerHTML = inProgress.length
        ? inProgress.map(t => renderTaskCard(t)).join('')
        : '<div class="empty-state"><i class="fas fa-coffee"></i><p>No hay tareas en progreso</p></div>';

    document.getElementById('tasks-completed').innerHTML = completed.length
        ? completed.slice(0, 10).map(t => renderTaskCard(t)).join('')
        : '<div class="empty-state"><i class="fas fa-check"></i><p>No hay tareas completadas</p></div>';
}

function renderTaskCard(task) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

    return `
        <div class="task-card priority-${task.priority}">
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                <span class="task-type ${task.task_type}">${TYPE_LABELS[task.task_type] || task.task_type}</span>
            </div>

            ${task.description ? `<div class="task-description">${truncate(task.description, 80)}</div>` : ''}

            <div class="task-meta">
                <span class="priority-badge ${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
                ${task.due_date ? `
                    <span style="color: ${isOverdue ? '#e74c3c' : '#7f8c8d'}">
                        <i class="fas fa-calendar"></i> ${formatDate(task.due_date)}
                    </span>
                ` : ''}
                ${task.entity_type === 'bed' ? `<span><i class="fas fa-bed"></i> Cama</span>` : ''}
            </div>

            ${task.staff_name ? `
                <div class="task-assignee">
                    <div class="avatar">${getInitials(task.staff_name)}</div>
                    <span>${task.staff_name}</span>
                </div>
            ` : `
                <div class="task-assignee" style="color: #95a5a6;">
                    <i class="fas fa-user-slash"></i> Sin asignar
                </div>
            `}

            <div class="task-actions">
                ${task.status === 'pending' ? `
                    <button class="btn btn-warning btn-small" onclick="startTask(${task.id})">
                        <i class="fas fa-play"></i> Iniciar
                    </button>
                ` : ''}
                ${task.status === 'in_progress' ? `
                    <button class="btn btn-success btn-small" onclick="completeTask(${task.id})">
                        <i class="fas fa-check"></i> Completar
                    </button>
                ` : ''}
                ${task.status !== 'completed' && task.status !== 'cancelled' ? `
                    <button class="btn btn-secondary btn-small" onclick="editTask(${task.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================================
// MODAL FUNCTIONS
// ============================================================

function openAddModal() {
    currentEditId = null;
    document.getElementById('modal-title').textContent = 'Nueva Tarea';
    document.getElementById('task-form').reset();
    document.getElementById('task-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('task-modal').classList.remove('active');
    currentEditId = null;
}

async function editTask(id) {
    try {
        const response = await fetch(`/api/tasks/${id}`);
        const data = await response.json();

        if (data.success) {
            const task = data.task;
            currentEditId = id;

            document.getElementById('modal-title').textContent = 'Editar Tarea';
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title || '';
            document.getElementById('task-type').value = task.task_type || 'other';
            document.getElementById('task-priority').value = task.priority || 'normal';
            document.getElementById('task-staff').value = task.staff_id || '';
            document.getElementById('task-description').value = task.description || '';

            if (task.due_date) {
                const dt = new Date(task.due_date);
                document.getElementById('task-due').value = dt.toISOString().slice(0, 16);
            } else {
                document.getElementById('task-due').value = '';
            }

            document.getElementById('task-modal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading task:', error);
        showToast('Error cargando tarea', 'error');
    }
}

async function saveTask() {
    const title = document.getElementById('task-title').value.trim();
    const taskType = document.getElementById('task-type').value;
    const priority = document.getElementById('task-priority').value;

    if (!title) {
        showToast('Titulo es requerido', 'error');
        return;
    }

    const taskData = {
        title,
        task_type: taskType,
        priority,
        staff_id: document.getElementById('task-staff').value || null,
        description: document.getElementById('task-description').value.trim() || null,
        due_date: document.getElementById('task-due').value || null
    };

    try {
        const url = currentEditId ? `/api/tasks/${currentEditId}` : '/api/tasks';
        const method = currentEditId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        const data = await response.json();

        if (data.success) {
            showToast(currentEditId ? 'Tarea actualizada' : 'Tarea creada', 'success');
            closeModal();
            loadTasks();
            loadStats();
        } else {
            showToast(data.error || 'Error guardando', 'error');
        }
    } catch (error) {
        console.error('Error saving task:', error);
        showToast('Error de conexion', 'error');
    }
}

// ============================================================
// TASK ACTIONS
// ============================================================

async function startTask(id) {
    try {
        const response = await fetch(`/api/tasks/${id}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Tarea iniciada', 'success');
            loadTasks();
            loadStats();
        } else {
            showToast(data.error || 'Error iniciando tarea', 'error');
        }
    } catch (error) {
        console.error('Error starting task:', error);
        showToast('Error de conexion', 'error');
    }
}

async function completeTask(id) {
    const notes = prompt('Notas de completacion (opcional):');

    try {
        const response = await fetch(`/api/tasks/${id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completion_notes: notes })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Tarea completada', 'success');
            loadTasks();
            loadStats();
        } else {
            showToast(data.error || 'Error completando tarea', 'error');
        }
    } catch (error) {
        console.error('Error completing task:', error);
        showToast('Error de conexion', 'error');
    }
}

async function cancelTask(id) {
    if (!confirm('Cancelar esta tarea?')) return;

    try {
        const response = await fetch(`/api/tasks/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Tarea cancelada', 'success');
            loadTasks();
            loadStats();
        } else {
            showToast(data.error || 'Error cancelando', 'error');
        }
    } catch (error) {
        console.error('Error cancelling task:', error);
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Hoy ' + date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Manana ' + date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) +
           ' ' + date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
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
