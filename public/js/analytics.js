// Analytics Dashboard - Frontend Logic
// Using existing API_BASE_URL if already defined, otherwise set it
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

// Using var to avoid redeclaration errors when multiple scripts are loaded
if (typeof authToken === 'undefined') {
    var authToken = localStorage.getItem('authToken');
}
let charts = {};

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
        alert('Session expired. Please login again.');
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDatePickers();
    loadAnalytics();
});

function initializeDatePickers() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('endDate').value = lastDay.toISOString().split('T')[0];
}

async function loadAnalytics() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    try {
        // Load all analytics data in parallel
        const [overview, revenue, occupancy, bookings, commissions] = await Promise.all([
            apiRequest(`/api/analytics/overview?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/revenue?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/occupancy?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/bookings?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/commissions?start_date=${startDate}&end_date=${endDate}`)
        ]);

        // Render overview stats
        renderOverviewStats(overview.metrics);

        // Render charts
        renderRevenueChart(revenue);
        renderOccupancyChart(occupancy);
        renderBookingsChart(bookings);
        renderPaymentMethodsChart(revenue);
        renderSourcesChart(revenue);
        renderCommissionsChart(commissions);

    } catch (error) {
        console.error('Failed to load analytics:', error);
        document.getElementById('statsGrid').innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load analytics: ${error.message}
            </div>
        `;
    }
}

function renderOverviewStats(metrics) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card revenue">
            <div class="icon"><i class="fas fa-dollar-sign"></i></div>
            <div class="value">$${metrics.total_revenue.toFixed(2)}</div>
            <div class="label">Total Revenue</div>
        </div>

        <div class="stat-card bookings">
            <div class="icon"><i class="fas fa-calendar-check"></i></div>
            <div class="value">${metrics.total_bookings}</div>
            <div class="label">Total Bookings</div>
        </div>

        <div class="stat-card occupancy">
            <div class="icon"><i class="fas fa-bed"></i></div>
            <div class="value">${metrics.occupancy_rate}%</div>
            <div class="label">Occupancy Rate</div>
        </div>

        <div class="stat-card commissions">
            <div class="icon"><i class="fas fa-percentage"></i></div>
            <div class="value">$${metrics.total_commissions.toFixed(2)}</div>
            <div class="label">Commissions</div>
        </div>

        <div class="stat-card">
            <div class="icon"><i class="fas fa-chart-line"></i></div>
            <div class="value">$${metrics.avg_booking_value.toFixed(2)}</div>
            <div class="label">Avg Booking Value</div>
        </div>

        <div class="stat-card">
            <div class="icon"><i class="fas fa-door-open"></i></div>
            <div class="value">${metrics.occupied_beds} / ${metrics.total_beds}</div>
            <div class="label">Beds Occupied</div>
        </div>
    `;
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');

    if (charts.revenue) {
        charts.revenue.destroy();
    }

    const labels = data.daily_revenue.map(d => formatDate(d.date));
    const revenues = data.daily_revenue.map(d => parseFloat(d.revenue || 0));
    const charges = data.daily_revenue.map(d => parseFloat(d.charges || 0));

    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenues,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Charges',
                    data: charges,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function renderOccupancyChart(data) {
    const ctx = document.getElementById('occupancyChart').getContext('2d');

    if (charts.occupancy) {
        charts.occupancy.destroy();
    }

    const labels = data.occupancy_by_day.map(d => formatDate(d.date));
    const rates = data.occupancy_by_day.map(d => parseFloat(d.occupancy_rate || 0));

    charts.occupancy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Occupancy Rate (%)',
                data: rates,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: '#3498db',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function renderBookingsChart(data) {
    const ctx = document.getElementById('bookingsChart').getContext('2d');

    if (charts.bookings) {
        charts.bookings.destroy();
    }

    const labels = data.daily_trend.map(d => formatDate(d.date));
    const bookings = data.daily_trend.map(d => parseInt(d.bookings || 0));

    charts.bookings = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bookings',
                data: bookings,
                borderColor: '#9b59b6',
                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderPaymentMethodsChart(data) {
    const ctx = document.getElementById('paymentMethodsChart').getContext('2d');

    if (charts.paymentMethods) {
        charts.paymentMethods.destroy();
    }

    const labels = data.by_payment_method.map(m => m.method || 'Unknown');
    const totals = data.by_payment_method.map(m => parseFloat(m.total || 0));

    charts.paymentMethods = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: totals,
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#f39c12',
                    '#e74c3c',
                    '#9b59b6',
                    '#1abc9c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function renderSourcesChart(data) {
    const ctx = document.getElementById('sourcesChart').getContext('2d');

    if (charts.sources) {
        charts.sources.destroy();
    }

    const labels = data.top_sources.map(s => s.source || 'Unknown');
    const revenues = data.top_sources.map(s => parseFloat(s.revenue || 0));

    charts.sources = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: revenues,
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: '#2ecc71',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

function renderCommissionsChart(data) {
    const ctx = document.getElementById('commissionsChart').getContext('2d');

    if (charts.commissions) {
        charts.commissions.destroy();
    }

    const labels = data.by_tour.map(t => t.name);
    const commissions = data.by_tour.map(t => parseFloat(t.commissions || 0));
    const sales = data.by_tour.map(t => parseInt(t.sales || 0));

    charts.commissions = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Commissions ($)',
                    data: commissions,
                    backgroundColor: 'rgba(241, 196, 15, 0.7)',
                    borderColor: '#f1c40f',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Sales',
                    data: sales,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: '#3498db',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function exportReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    try {
        // Get all data
        const [overview, revenue, occupancy, bookings, commissions] = await Promise.all([
            apiRequest(`/api/analytics/overview?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/revenue?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/occupancy?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/bookings?start_date=${startDate}&end_date=${endDate}`),
            apiRequest(`/api/analytics/commissions?start_date=${startDate}&end_date=${endDate}`)
        ]);

        // Create CSV content
        let csv = 'Analytics Report\n';
        csv += `Date Range: ${startDate} to ${endDate}\n\n`;

        csv += 'OVERVIEW\n';
        csv += 'Metric,Value\n';
        csv += `Total Revenue,$${overview.metrics.total_revenue.toFixed(2)}\n`;
        csv += `Total Bookings,${overview.metrics.total_bookings}\n`;
        csv += `Occupancy Rate,${overview.metrics.occupancy_rate}%\n`;
        csv += `Avg Booking Value,$${overview.metrics.avg_booking_value.toFixed(2)}\n`;
        csv += `Total Commissions,$${overview.metrics.total_commissions.toFixed(2)}\n\n`;

        csv += 'DAILY REVENUE\n';
        csv += 'Date,Revenue,Charges\n';
        revenue.daily_revenue.forEach(d => {
            csv += `${d.date},$${d.revenue},$${d.charges}\n`;
        });
        csv += '\n';

        csv += 'PAYMENT METHODS\n';
        csv += 'Method,Total,Count\n';
        revenue.by_payment_method.forEach(m => {
            csv += `${m.method},$${m.total},${m.count}\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${startDate}-to-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert('Report exported successfully!');

    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export report: ' + error.message);
    }
}
