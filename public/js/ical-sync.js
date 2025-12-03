// iCal Sync Management - Frontend Logic
const API_BASE_URL = window.location.origin;

let beds = [];
let importSources = [];
let currentTab = 'export';

// Auth token
let authToken = localStorage.getItem('authToken');

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
        setTimeout(() => {
            window.location.href = '/';
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
    await loadExportCalendars();
});

async function loadInitialData() {
    try {
        beds = await apiRequest('/api/beds');
        populateBedSelect();
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showAlert('Failed to load data: ' + error.message, 'error', 'exportContent');
    }
}

function populateBedSelect() {
    const select = document.getElementById('sourceBed');
    select.innerHTML = '<option value="">Select a bed...</option>';

    beds.forEach(bed => {
        const option = document.createElement('option');
        option.value = bed.id;
        option.textContent = `${bed.name} (${bed.room || 'No room'})`;
        select.appendChild(option);
    });
}

// Tab Management
function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tab').classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}Tab`).classList.add('active');

    // Load content based on tab
    if (tab === 'export') {
        loadExportCalendars();
    } else if (tab === 'import') {
        loadImportSources();
    } else if (tab === 'sync') {
        loadSyncStatus();
    }
}

// Export Tab Functions
async function loadExportCalendars() {
    const container = document.getElementById('exportContent');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading export calendars...</p></div>';

    try {
        const beds = await apiRequest('/api/beds');

        if (beds.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No beds found. Add beds to generate export calendars.
                </div>
            `;
            return;
        }

        // Group beds by room
        const bedsByRoom = {};
        beds.forEach(bed => {
            const room = bed.room || 'Unassigned';
            if (!bedsByRoom[room]) {
                bedsByRoom[room] = [];
            }
            bedsByRoom[room].push(bed);
        });

        let html = '';

        // Export by room
        Object.entries(bedsByRoom).forEach(([room, roomBeds]) => {
            const roomId = roomBeds[0].id;
            const exportUrl = `${API_BASE_URL}/api/ical/rooms/${roomId}.ics`;

            html += `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">
                                <i class="fas fa-door-open"></i> ${room}
                            </div>
                            <div class="card-subtitle">${roomBeds.length} bed(s)</div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Export URL (Share with OTAs)</label>
                        <div class="code-block">
                            <button class="copy-btn" onclick="copyToClipboard('${exportUrl}')">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <code>${exportUrl}</code>
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                        <p style="color: #7f8c8d; font-size: 14px;">
                            <i class="fas fa-info-circle"></i>
                            Share this URL with Booking.com, Hostelworld, or other OTAs to export your availability.
                        </p>
                    </div>
                </div>
            `;
        });

        // Export by bed
        html += '<h3 style="color: #2c3e50; margin: 30px 0 20px 0;">Export by Individual Bed</h3>';

        beds.forEach(bed => {
            const exportUrl = `${API_BASE_URL}/api/ical/beds/${bed.id}.ics`;

            html += `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">
                                <i class="fas fa-bed"></i> ${bed.name}
                            </div>
                            <div class="card-subtitle">${bed.room || 'No room'} - $${bed.price}/night</div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Export URL</label>
                        <div class="code-block">
                            <button class="copy-btn" onclick="copyToClipboard('${exportUrl}')">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <code>${exportUrl}</code>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load export calendars:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load export calendars: ${error.message}
            </div>
        `;
    }
}

// Import Tab Functions
async function loadImportSources() {
    const container = document.getElementById('importContent');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading import sources...</p></div>';

    try {
        importSources = await apiRequest('/api/ical/sources');

        if (importSources.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No import sources configured. Add an iCal URL to import reservations from OTAs.
                </div>
            `;
            return;
        }

        const html = importSources.map(source => `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${source.name}</div>
                        <div class="card-subtitle">
                            <span class="source-badge source-${source.source_type}">
                                ${source.source_type.replace('_', '.')}
                            </span>
                            ${source.is_active ?
                                '<span class="sync-status sync-active"><i class="fas fa-check-circle"></i> Active</span>' :
                                '<span class="sync-status sync-inactive"><i class="fas fa-times-circle"></i> Inactive</span>'
                            }
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Bed/Room</label>
                    <p style="font-size: 14px; color: #2c3e50;">
                        ${getBedName(source.bed_id)}
                    </p>
                </div>

                <div class="form-group">
                    <label>Import URL</label>
                    <div class="code-block" style="font-size: 11px;">
                        ${source.ical_url}
                    </div>
                </div>

                <div class="form-group">
                    <label>Last Sync</label>
                    <p style="font-size: 14px; color: #7f8c8d;">
                        ${source.last_sync ? formatDate(source.last_sync) : 'Never'}
                    </p>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-primary btn-small" onclick="syncSource(${source.id})">
                        <i class="fas fa-sync"></i> Sync Now
                    </button>
                    ${source.is_active ?
                        `<button class="btn btn-secondary btn-small" onclick="toggleSourceActive(${source.id}, false)">
                            <i class="fas fa-pause"></i> Deactivate
                        </button>` :
                        `<button class="btn btn-primary btn-small" onclick="toggleSourceActive(${source.id}, true)">
                            <i class="fas fa-play"></i> Activate
                        </button>`
                    }
                    <button class="btn btn-danger btn-small" onclick="deleteSource(${source.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load import sources:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load import sources: ${error.message}
            </div>
        `;
    }
}

function getBedName(bedId) {
    const bed = beds.find(b => b.id === bedId);
    return bed ? `${bed.name} (${bed.room || 'No room'})` : 'Unknown';
}

// Sync Tab Functions
async function loadSyncStatus() {
    const container = document.getElementById('syncContent');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading sync status...</p></div>';

    try {
        const sources = await apiRequest('/api/ical/sources');

        if (sources.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No import sources to sync.
                </div>
            `;
            return;
        }

        const html = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                Sync status for all configured sources. Click "Sync All Sources" to update all calendars.
            </div>

            ${sources.map(source => `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${source.name}</div>
                            <div class="card-subtitle">
                                ${source.is_active ?
                                    '<span class="sync-status sync-active"><i class="fas fa-check-circle"></i> Active</span>' :
                                    '<span class="sync-status sync-inactive"><i class="fas fa-times-circle"></i> Inactive</span>'
                                }
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div>
                            <p style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px;">LAST SYNC</p>
                            <p style="font-size: 16px; color: #2c3e50; font-weight: 600;">
                                ${source.last_sync ? formatDate(source.last_sync) : 'Never'}
                            </p>
                        </div>
                        <div>
                            <p style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px;">BED/ROOM</p>
                            <p style="font-size: 16px; color: #2c3e50; font-weight: 600;">
                                ${getBedName(source.bed_id)}
                            </p>
                        </div>
                        <div>
                            <p style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px;">SOURCE</p>
                            <p style="font-size: 16px; color: #2c3e50; font-weight: 600;">
                                ${source.source_type.replace('_', '.')}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load sync status:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load sync status: ${error.message}
            </div>
        `;
    }
}

// Modal Functions
function openAddSourceModal() {
    document.getElementById('sourceForm').reset();
    document.getElementById('modalAlert').innerHTML = '';
    document.getElementById('addSourceModal').classList.add('active');
}

function closeModal() {
    document.getElementById('addSourceModal').classList.remove('active');
}

async function submitSource(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('sourceName').value,
        ical_url: document.getElementById('sourceUrl').value,
        bed_id: parseInt(document.getElementById('sourceBed').value),
        source_type: document.getElementById('sourceType').value
    };

    try {
        await apiRequest('/api/ical/sources', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showAlert('Source added successfully!', 'success', 'importContent');
        closeModal();
        switchTab('import');
        await loadImportSources();
    } catch (error) {
        console.error('Failed to add source:', error);
        document.getElementById('modalAlert').innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                ${error.message}
            </div>
        `;
    }
}

async function syncSource(id) {
    try {
        showAlert('Syncing source...', 'info', 'importContent');
        await apiRequest(`/api/ical/sources/${id}/sync`, { method: 'POST' });
        showAlert('Source synced successfully!', 'success', 'importContent');
        await loadImportSources();
    } catch (error) {
        showAlert('Failed to sync source: ' + error.message, 'error', 'importContent');
    }
}

async function syncAll() {
    try {
        showAlert('Syncing all sources...', 'info', 'syncContent');
        await apiRequest('/api/ical/sync-all', { method: 'POST' });
        showAlert('All sources synced successfully!', 'success', 'syncContent');
        await loadSyncStatus();
    } catch (error) {
        showAlert('Failed to sync all sources: ' + error.message, 'error', 'syncContent');
    }
}

async function toggleSourceActive(id, active) {
    try {
        await apiRequest(`/api/ical/sources/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: active })
        });
        showAlert(`Source ${active ? 'activated' : 'deactivated'}!`, 'success', 'importContent');
        await loadImportSources();
    } catch (error) {
        showAlert('Failed to update source: ' + error.message, 'error', 'importContent');
    }
}

async function deleteSource(id) {
    if (!confirm('Delete this import source? This action cannot be undone.')) return;

    try {
        await apiRequest(`/api/ical/sources/${id}`, { method: 'DELETE' });
        showAlert('Source deleted!', 'success', 'importContent');
        await loadImportSources();
    } catch (error) {
        showAlert('Failed to delete source: ' + error.message, 'error', 'importContent');
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Copied to clipboard!', 'success', currentTab + 'Content');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showAlert('Failed to copy to clipboard', 'error', currentTab + 'Content');
    });
}

function showAlert(message, type, containerId) {
    const container = document.getElementById(containerId);
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
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
