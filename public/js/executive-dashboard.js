/**
 * Executive Dashboard - JavaScript Controller
 * DEV3-10: Dashboard Ejecutivo
 *
 * Provides:
 * - KPI Overview with comparisons
 * - Revenue and Occupancy trends
 * - Forecasting visualization
 * - Year-over-year comparisons
 * - PDF export functionality
 */

// State
let currentPeriod = 'month';
let charts = {};
let dashboardData = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initPeriodSelector();
    loadDashboardData();
});

/**
 * Initialize period selector buttons
 */
function initPeriodSelector() {
    const buttons = document.querySelectorAll('.period-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadDashboardData();
        });
    });
}

/**
 * Get date range based on period
 */
function getDateRange() {
    const now = new Date();
    let startDate, endDate;

    switch(currentPeriod) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
    }

    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        label: formatPeriodLabel(startDate, endDate)
    };
}

/**
 * Format period label for display
 */
function formatPeriodLabel(start, end) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    if (currentPeriod === 'month') {
        return `${months[start.getMonth()]} ${start.getFullYear()}`;
    } else if (currentPeriod === 'quarter') {
        const q = Math.floor(start.getMonth() / 3) + 1;
        return `Q${q} ${start.getFullYear()}`;
    } else {
        return `Ano ${start.getFullYear()}`;
    }
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    const { start, end, label } = getDateRange();
    document.getElementById('report-period').textContent = `Periodo: ${label}`;

    try {
        // Fetch all data in parallel
        const [kpiData, forecastData, revenueData, sourcesData] = await Promise.all([
            fetchAPI(`/api/analytics/kpi-summary?start_date=${start}&end_date=${end}`),
            fetchAPI('/api/analytics/forecast/summary'),
            fetchAPI(`/api/analytics/revenue/by-period?start_date=${start}&end_date=${end}&group_by=day`),
            fetchAPI(`/api/analytics/bookings/by-source?start_date=${start}&end_date=${end}`)
        ]);

        dashboardData = { kpiData, forecastData, revenueData, sourcesData };

        renderKPIs(kpiData);
        renderForecasts(forecastData);
        renderRevenueChart(revenueData);
        renderSourcesChart(sourcesData);
        renderYearComparison();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Error al cargar datos del dashboard');
    }
}

/**
 * Fetch API with authentication
 */
async function fetchAPI(url) {
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId');
    const response = await fetch(url, {
        headers: {
            'session-id': sessionId || ''
        }
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Render KPI cards
 */
function renderKPIs(data) {
    const grid = document.getElementById('kpi-grid');

    if (!data || !data.success) {
        grid.innerHTML = '<p class="loading">No hay datos disponibles</p>';
        return;
    }

    const kpis = data.kpis || {};

    grid.innerHTML = `
        <!-- Revenue -->
        <div class="kpi-card">
            <div class="kpi-header">
                <div class="kpi-icon revenue"><i class="fas fa-dollar-sign"></i></div>
                <span class="kpi-label">Revenue Total</span>
            </div>
            <div class="kpi-value">$${formatNumber(kpis.revenue?.current || 0)}</div>
            <div class="kpi-comparison">
                ${renderComparison(kpis.revenue?.change || 0, 'vs mes anterior')}
                ${renderComparison(kpis.revenue?.yoyChange || 0, 'vs ano anterior')}
            </div>
        </div>

        <!-- Occupancy -->
        <div class="kpi-card">
            <div class="kpi-header">
                <div class="kpi-icon occupancy"><i class="fas fa-bed"></i></div>
                <span class="kpi-label">Ocupacion Promedio</span>
            </div>
            <div class="kpi-value">${(kpis.occupancy?.current || 0).toFixed(1)}%</div>
            <div class="kpi-comparison">
                ${renderComparison(kpis.occupancy?.change || 0, 'vs mes anterior')}
                ${renderComparison(kpis.occupancy?.yoyChange || 0, 'vs ano anterior')}
            </div>
        </div>

        <!-- Total Bookings -->
        <div class="kpi-card">
            <div class="kpi-header">
                <div class="kpi-icon bookings"><i class="fas fa-calendar-check"></i></div>
                <span class="kpi-label">Reservas Totales</span>
            </div>
            <div class="kpi-value">${formatNumber(kpis.bookings?.current || 0)}</div>
            <div class="kpi-comparison">
                ${renderComparison(kpis.bookings?.change || 0, 'vs mes anterior')}
                ${renderComparison(kpis.bookings?.yoyChange || 0, 'vs ano anterior')}
            </div>
        </div>

        <!-- ADR -->
        <div class="kpi-card">
            <div class="kpi-header">
                <div class="kpi-icon adr"><i class="fas fa-tag"></i></div>
                <span class="kpi-label">ADR (Tarifa Promedio)</span>
            </div>
            <div class="kpi-value">$${formatNumber(kpis.adr?.current || 0)}</div>
            <div class="kpi-comparison">
                ${renderComparison(kpis.adr?.change || 0, 'vs mes anterior')}
            </div>
        </div>

        <!-- RevPAB -->
        <div class="kpi-card">
            <div class="kpi-header">
                <div class="kpi-icon revpab"><i class="fas fa-chart-bar"></i></div>
                <span class="kpi-label">RevPAB</span>
            </div>
            <div class="kpi-value">$${formatNumber(kpis.revpab?.current || 0)}</div>
            <div class="kpi-comparison">
                ${renderComparison(kpis.revpab?.change || 0, 'vs mes anterior')}
            </div>
        </div>

        <!-- LOS -->
        <div class="kpi-card">
            <div class="kpi-header">
                <div class="kpi-icon los"><i class="fas fa-clock"></i></div>
                <span class="kpi-label">Estadia Promedio</span>
            </div>
            <div class="kpi-value">${(kpis.los?.current || 0).toFixed(1)} noches</div>
            <div class="kpi-comparison">
                ${renderComparison(kpis.los?.change || 0, 'vs mes anterior')}
            </div>
        </div>
    `;
}

/**
 * Render comparison badge
 */
function renderComparison(change, label) {
    const isPositive = change > 0;
    const isNegative = change < 0;
    const className = isPositive ? 'positive' : (isNegative ? 'negative' : 'neutral');
    const icon = isPositive ? 'fa-arrow-up' : (isNegative ? 'fa-arrow-down' : 'fa-minus');

    return `
        <div class="comparison-item ${className}">
            <i class="fas ${icon}"></i>
            <span>${Math.abs(change).toFixed(1)}%</span>
            <span class="comparison-label">${label}</span>
        </div>
    `;
}

/**
 * Render forecasts
 */
function renderForecasts(data) {
    const grid = document.getElementById('forecast-grid');

    if (!data || !data.success) {
        grid.innerHTML = '<p class="loading">No hay proyecciones disponibles</p>';
        return;
    }

    const forecasts = data.forecasts || {};
    const occupancy = forecasts.occupancy || {};
    const revenue = forecasts.revenue || {};

    grid.innerHTML = `
        <!-- 30 Days Forecast -->
        <div class="forecast-card">
            <h3><i class="fas fa-calendar-day"></i> Proximos 30 dias</h3>
            <div class="forecast-value">${(occupancy.days30?.projected || 0).toFixed(1)}%</div>
            <div class="forecast-details">
                Ocupacion proyectada
                <br>Revenue: $${formatNumber(revenue.days30?.expected || 0)}
            </div>
            <div class="forecast-bar">
                <div class="forecast-fill occupancy" style="width: ${Math.min(occupancy.days30?.projected || 0, 100)}%"></div>
            </div>
        </div>

        <!-- 60 Days Forecast -->
        <div class="forecast-card">
            <h3><i class="fas fa-calendar-week"></i> Proximos 60 dias</h3>
            <div class="forecast-value">${(occupancy.days60?.projected || 0).toFixed(1)}%</div>
            <div class="forecast-details">
                Ocupacion proyectada
                <br>Revenue: $${formatNumber(revenue.days60?.expected || 0)}
            </div>
            <div class="forecast-bar">
                <div class="forecast-fill occupancy" style="width: ${Math.min(occupancy.days60?.projected || 0, 100)}%"></div>
            </div>
        </div>

        <!-- 90 Days Forecast -->
        <div class="forecast-card">
            <h3><i class="fas fa-calendar-alt"></i> Proximos 90 dias</h3>
            <div class="forecast-value">${(occupancy.days90?.projected || 0).toFixed(1)}%</div>
            <div class="forecast-details">
                Ocupacion proyectada
                <br>Revenue: $${formatNumber(revenue.days90?.expected || 0)}
            </div>
            <div class="forecast-bar">
                <div class="forecast-fill occupancy" style="width: ${Math.min(occupancy.days90?.projected || 0, 100)}%"></div>
            </div>
        </div>
    `;
}

/**
 * Render revenue trend chart
 */
function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    // Destroy existing chart
    if (charts.revenue) {
        charts.revenue.destroy();
    }

    const labels = data?.data?.map(d => d.period) || [];
    const values = data?.data?.map(d => d.revenue) || [];

    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#667eea'
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
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        callback: value => '$' + formatNumber(value)
                    }
                }
            }
        }
    });
}

/**
 * Render booking sources chart
 */
function renderSourcesChart(data) {
    const ctx = document.getElementById('sourcesChart');
    if (!ctx) return;

    if (charts.sources) {
        charts.sources.destroy();
    }

    const sources = data?.data || [];
    const labels = sources.map(s => s.source || 'Directo');
    const values = sources.map(s => s.count);

    charts.sources = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Sin datos'],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: [
                    '#667eea',
                    '#10b981',
                    '#f59e0b',
                    '#ec4899',
                    '#8b5cf6',
                    '#14b8a6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgba(255,255,255,0.8)',
                        padding: 16
                    }
                }
            }
        }
    });
}

/**
 * Render year-over-year comparison
 */
async function renderYearComparison() {
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;

    try {
        // Fetch monthly data for both years
        const [thisYearData, lastYearData] = await Promise.all([
            fetchAPI(`/api/analytics/occupancy/monthly?year=${thisYear}`),
            fetchAPI(`/api/analytics/occupancy/monthly?year=${lastYear}`)
        ]);

        renderOccupancyComparison(thisYearData, lastYearData, thisYear, lastYear);
        renderRevenueComparison(thisYear, lastYear);

    } catch (error) {
        console.error('Error loading year comparison:', error);
    }
}

/**
 * Render occupancy year comparison
 */
function renderOccupancyComparison(thisYearData, lastYearData, thisYear, lastYear) {
    const ctx = document.getElementById('yearComparisonChart');
    if (!ctx) return;

    if (charts.yearComparison) {
        charts.yearComparison.destroy();
    }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const thisYearValues = thisYearData?.data?.map(d => d.occupancy) || new Array(12).fill(0);
    const lastYearValues = lastYearData?.data?.map(d => d.occupancy) || new Array(12).fill(0);

    charts.yearComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: `${thisYear}`,
                    data: thisYearValues,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderRadius: 4
                },
                {
                    label: `${lastYear}`,
                    data: lastYearValues,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'rgba(255,255,255,0.8)' }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.6)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        callback: value => value + '%'
                    },
                    max: 100
                }
            }
        }
    });
}

/**
 * Render revenue year comparison
 */
async function renderRevenueComparison(thisYear, lastYear) {
    const ctx = document.getElementById('revenueComparisonChart');
    if (!ctx) return;

    if (charts.revenueComparison) {
        charts.revenueComparison.destroy();
    }

    try {
        const [thisYearData, lastYearData] = await Promise.all([
            fetchAPI(`/api/analytics/revenue/monthly?year=${thisYear}`),
            fetchAPI(`/api/analytics/revenue/monthly?year=${lastYear}`)
        ]);

        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const thisYearValues = thisYearData?.data?.map(d => d.revenue) || new Array(12).fill(0);
        const lastYearValues = lastYearData?.data?.map(d => d.revenue) || new Array(12).fill(0);

        charts.revenueComparison = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: `${thisYear}`,
                        data: thisYearValues,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: `${lastYear}`,
                        data: lastYearValues,
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: 'rgba(255,255,255,0.8)' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(255,255,255,0.6)' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: {
                            color: 'rgba(255,255,255,0.6)',
                            callback: value => '$' + formatNumber(value)
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading revenue comparison:', error);
    }
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Math.round(num).toLocaleString('es-CO');
}

/**
 * Refresh dashboard data
 */
function refreshData() {
    loadDashboardData();
}

/**
 * Export dashboard to PDF
 */
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const content = document.getElementById('dashboard-content');

    // Show loading
    const exportBtn = document.querySelector('.btn-primary');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    exportBtn.disabled = true;

    try {
        // Use html2canvas to capture the dashboard
        const canvas = await html2canvas(content, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#1a1a2e',
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Calculate dimensions to fit page
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add header
        pdf.setFillColor(26, 26, 46);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.text('Dashboard Ejecutivo - Almanik PMS', 10, 15);

        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`, 10, 22);

        // Add dashboard image
        if (imgHeight <= pageHeight - 30) {
            pdf.addImage(imgData, 'PNG', 10, 28, imgWidth, imgHeight);
        } else {
            // Multi-page for long content
            let yPosition = 28;
            let remainingHeight = imgHeight;
            let sourceY = 0;

            while (remainingHeight > 0) {
                const sliceHeight = Math.min(remainingHeight, pageHeight - 30);
                const sliceWidth = imgWidth;

                pdf.addImage(imgData, 'PNG', 10, yPosition, sliceWidth, imgHeight, undefined, 'FAST', 0);

                remainingHeight -= (pageHeight - 30);

                if (remainingHeight > 0) {
                    pdf.addPage();
                    yPosition = 10;
                }
            }
        }

        // Save
        const { label } = getDateRange();
        pdf.save(`Dashboard-Ejecutivo-${label.replace(/\s/g, '-')}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error al generar PDF. Intente de nuevo.');
    } finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

/**
 * Show error message
 */
function showError(message) {
    console.error(message);
    // Could add toast notification here
}
