/**
 * Advanced Reports Module
 * DEV2-06: Graficos Interactivos
 * Handles fetching and displaying financial data, forecasts, and insights.
 */

// Chart instances for cleanup
let charts = {
    forecast: null,
    occupancyBar: null,
    revenueLine: null,
    guestPie: null,
    yoyComparison: null
};

document.addEventListener('DOMContentLoaded', () => {
    // Set default dates (First day of current month to today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    document.getElementById('start-date').valueAsDate = firstDay;
    document.getElementById('end-date').valueAsDate = today;

    // Load initial data
    loadFinancials();
    loadForecast();
    loadInsights();

    // Load new charts (DEV2-06)
    loadOccupancyBarChart();
    loadRevenueLineChart();
    loadGuestPieChart();
    loadYoyComparisonChart();
});

async function loadFinancials() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    try {
        const response = await fetch(`/api/reports/financial?startDate=${start}&endDate=${end}`);
        const data = await response.json();

        // Store for exports
        reportData.financials = {
            startDate: start,
            endDate: end,
            totalRevenue: data.financials.total_revenue,
            revPab: data.financials.rev_pab,
            occupancyRate: data.occupancy.rate,
            occupiedBeds: data.occupancy.occupied_beds,
            totalBeds: data.occupancy.total_beds
        };

        // Update UI
        document.getElementById('total-revenue').textContent = formatCurrency(data.financials.total_revenue);
        document.getElementById('rev-pab').textContent = formatCurrency(data.financials.rev_pab);
        document.getElementById('occupancy-rate').textContent = data.occupancy.rate;

        // Calculate ADR (Avg Daily Rate) roughly
        const revenue = parseFloat(data.financials.total_revenue);
        const occupied = data.occupancy.occupied_beds;
        const adr = occupied > 0 ? revenue / occupied : 0;
        reportData.financials.adr = adr;
        document.getElementById('avg-rate').textContent = formatCurrency(adr);

    } catch (error) {
        console.error('Error loading financials:', error);
    }
}

async function loadForecast() {
    try {
        const response = await fetch('/api/reports/forecast');
        const data = await response.json();

        const ctx = document.getElementById('forecastChart').getContext('2d');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.forecast.map(d => formatDate(d.date)),
                datasets: [
                    {
                        label: 'Confirmed Bookings',
                        data: data.forecast.map(d => d.confirmed),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Projected Total (with Walk-ins)',
                        data: data.forecast.map(d => d.total_projected),
                        borderColor: '#2ecc71',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Beds Occupied' } }
                }
            }
        });

    } catch (error) {
        console.error('Error loading forecast:', error);
    }
}

async function loadInsights() {
    try {
        const response = await fetch('/api/reports/insights');
        const data = await response.json();
        const container = document.getElementById('insights-container');

        if (data.insights.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#7f8c8d;">No urgent insights at the moment. Operations look normal.</p>';
            return;
        }

        container.innerHTML = data.insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <div class="insight-icon"><i class="fas ${insight.icon}"></i></div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.message}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading insights:', error);
    }
}

// Store report data for exports
let reportData = {
    financials: {},
    occupancy: {},
    revenue: {},
    guests: {},
    yoy: {}
};

// ============================================================
// DEV2-06: GRAFICOS INTERACTIVOS
// ============================================================

/**
 * Monthly Occupancy Bar Chart
 */
async function loadOccupancyBarChart() {
    try {
        const response = await fetch('/api/reports/occupancy-monthly');
        let data;

        if (response.ok) {
            data = await response.json();
        } else {
            // Use sample data if endpoint not available
            data = generateSampleOccupancyData();
        }

        const ctx = document.getElementById('occupancyBarChart').getContext('2d');

        if (charts.occupancyBar) charts.occupancyBar.destroy();

        charts.occupancyBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels || ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Ocupacion %',
                    data: data.values || data.occupancy,
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.7)',
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(155, 89, 182, 0.7)',
                        'rgba(241, 196, 15, 0.7)',
                        'rgba(230, 126, 34, 0.7)',
                        'rgba(231, 76, 60, 0.7)',
                        'rgba(52, 73, 94, 0.7)',
                        'rgba(26, 188, 156, 0.7)',
                        'rgba(52, 152, 219, 0.7)',
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(155, 89, 182, 0.7)',
                        'rgba(241, 196, 15, 0.7)'
                    ],
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Ocupacion: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: '% Ocupacion' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading occupancy chart:', error);
    }
}

/**
 * Weekly Revenue Line Chart
 */
async function loadRevenueLineChart() {
    try {
        const response = await fetch('/api/reports/revenue-weekly');
        let data;

        if (response.ok) {
            data = await response.json();
        } else {
            // Use sample data if endpoint not available
            data = generateSampleRevenueData();
        }

        const ctx = document.getElementById('revenueLineChart').getContext('2d');

        if (charts.revenueLine) charts.revenueLine.destroy();

        charts.revenueLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || data.weeks,
                datasets: [{
                    label: 'Ingresos',
                    data: data.values || data.revenue,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2ecc71',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => formatCurrency(ctx.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Ingresos (COP)' },
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

/**
 * Guest Type Distribution Pie Chart
 */
async function loadGuestPieChart() {
    try {
        const response = await fetch('/api/reports/guest-distribution');
        let data;

        if (response.ok) {
            data = await response.json();
        } else {
            // Use sample data if endpoint not available
            data = generateSampleGuestData();
        }

        const ctx = document.getElementById('guestPieChart').getContext('2d');

        if (charts.guestPie) charts.guestPie.destroy();

        charts.guestPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || data.types,
                datasets: [{
                    data: data.values || data.counts,
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(230, 126, 34, 0.8)',
                        'rgba(231, 76, 60, 0.8)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((ctx.raw / total) * 100).toFixed(1);
                                return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading guest pie chart:', error);
    }
}

/**
 * Year-over-Year Comparison Chart
 */
async function loadYoyComparisonChart() {
    try {
        const response = await fetch('/api/reports/yoy-comparison');
        let data;

        if (response.ok) {
            data = await response.json();
        } else {
            // Use sample data if endpoint not available
            data = generateSampleYoyData();
        }

        const ctx = document.getElementById('yoyComparisonChart').getContext('2d');

        if (charts.yoyComparison) charts.yoyComparison.destroy();

        const currentYear = new Date().getFullYear();

        charts.yoyComparison = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [
                    {
                        label: `${currentYear}`,
                        data: data.currentYear || data.current,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: `${currentYear - 1}`,
                        data: data.previousYear || data.previous,
                        borderColor: '#95a5a6',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Ingresos (COP)' },
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading YoY comparison:', error);
    }
}

// ============================================================
// SAMPLE DATA GENERATORS (fallback when API not available)
// ============================================================

function generateSampleOccupancyData() {
    return {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        values: [65, 72, 78, 85, 90, 95, 92, 88, 75, 70, 68, 80]
    };
}

function generateSampleRevenueData() {
    const weeks = [];
    const revenue = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        weeks.push(`Sem ${12 - i}`);
        revenue.push(Math.floor(800000 + Math.random() * 400000));
    }

    return { labels: weeks, values: revenue };
}

function generateSampleGuestData() {
    return {
        labels: ['Mochileros', 'Parejas', 'Familias', 'Negocios', 'Grupos', 'Otros'],
        values: [35, 25, 15, 12, 8, 5]
    };
}

function generateSampleYoyData() {
    return {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        currentYear: [950000, 1100000, 1250000, 1400000, 1600000, 1800000, 1750000, 1650000, 1300000, 1150000, 1050000, 1500000],
        previousYear: [850000, 980000, 1100000, 1200000, 1400000, 1550000, 1500000, 1450000, 1100000, 950000, 900000, 1300000]
    };
}

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateString) {
    const options = { weekday: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

// ============================================================
// DEV2-07: EXPORT FUNCTIONS (PDF, Excel, CSV)
// ============================================================

/**
 * Show/hide loading overlay
 */
function showExportLoading(show, text = 'Generating export...') {
    const overlay = document.getElementById('exportLoading');
    const textEl = document.getElementById('exportLoadingText');
    if (overlay) {
        overlay.classList.toggle('active', show);
        if (textEl) textEl.textContent = text;
    }
}

/**
 * Get current date formatted for filenames
 */
function getExportFilename(type) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    return `almanik-report-${dateStr}.${type}`;
}

/**
 * Collect all report data for export
 */
async function collectReportData() {
    // Fetch fresh data from all endpoints
    const [occupancy, revenue, guests, yoy] = await Promise.all([
        fetch('/api/reports/occupancy-monthly').then(r => r.json()).catch(() => generateSampleOccupancyData()),
        fetch('/api/reports/revenue-weekly').then(r => r.json()).catch(() => generateSampleRevenueData()),
        fetch('/api/reports/guest-distribution').then(r => r.json()).catch(() => generateSampleGuestData()),
        fetch('/api/reports/yoy-comparison').then(r => r.json()).catch(() => generateSampleYoyData())
    ]);

    return {
        period: {
            start: document.getElementById('start-date').value,
            end: document.getElementById('end-date').value
        },
        financials: reportData.financials,
        occupancy,
        revenue,
        guests,
        yoy,
        generatedAt: new Date().toISOString()
    };
}

/**
 * Export to PDF using jsPDF
 */
async function exportToPDF() {
    showExportLoading(true, 'Generating PDF...');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const data = await collectReportData();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text('ALMANIK PMS', 105, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text('Advanced Financial Report', 105, 30, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(127, 140, 141);
        doc.text(`Period: ${data.period.start} to ${data.period.end}`, 105, 38, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString('es-CO')}`, 105, 44, { align: 'center' });

        // Line separator
        doc.setDrawColor(52, 152, 219);
        doc.setLineWidth(0.5);
        doc.line(20, 50, 190, 50);

        // Financial Summary
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Financial Summary', 20, 60);

        doc.autoTable({
            startY: 65,
            head: [['Metric', 'Value']],
            body: [
                ['Total Revenue', formatCurrency(data.financials.totalRevenue || 0)],
                ['RevPAB', formatCurrency(data.financials.revPab || 0)],
                ['Average Daily Rate', formatCurrency(data.financials.adr || 0)],
                ['Occupancy Rate', data.financials.occupancyRate || '0%'],
                ['Occupied Beds', data.financials.occupiedBeds || 0],
                ['Total Beds', data.financials.totalBeds || 27]
            ],
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219] }
        });

        // Monthly Occupancy
        let yPos = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Monthly Occupancy', 20, yPos);

        doc.autoTable({
            startY: yPos + 5,
            head: [['Month', 'Occupancy %']],
            body: data.occupancy.labels.map((label, i) => [
                label,
                `${data.occupancy.values[i]}%`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [46, 204, 113] }
        });

        // Weekly Revenue
        yPos = doc.lastAutoTable.finalY + 15;
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Weekly Revenue', 20, yPos);

        doc.autoTable({
            startY: yPos + 5,
            head: [['Week', 'Revenue']],
            body: data.revenue.labels.map((label, i) => [
                label,
                formatCurrency(data.revenue.values[i])
            ]),
            theme: 'striped',
            headStyles: { fillColor: [155, 89, 182] }
        });

        // Guest Distribution
        yPos = doc.lastAutoTable.finalY + 15;
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Guest Distribution by Source', 20, yPos);

        const guestTotal = data.guests.values.reduce((a, b) => a + b, 0);
        doc.autoTable({
            startY: yPos + 5,
            head: [['Source', 'Count', 'Percentage']],
            body: data.guests.labels.map((label, i) => [
                label,
                data.guests.values[i],
                `${((data.guests.values[i] / guestTotal) * 100).toFixed(1)}%`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [231, 76, 60] }
        });

        // Year-over-Year Comparison
        yPos = doc.lastAutoTable.finalY + 15;
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }
        const currentYear = new Date().getFullYear();
        doc.setFontSize(14);
        doc.text('Year-over-Year Comparison', 20, yPos);

        doc.autoTable({
            startY: yPos + 5,
            head: [['Month', `${currentYear}`, `${currentYear - 1}`, 'Change']],
            body: data.yoy.labels.map((label, i) => {
                const curr = data.yoy.currentYear[i];
                const prev = data.yoy.previousYear[i];
                const change = prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : 'N/A';
                return [
                    label,
                    formatCurrency(curr),
                    formatCurrency(prev),
                    typeof change === 'string' ? change : `${change}%`
                ];
            }),
            theme: 'striped',
            headStyles: { fillColor: [241, 196, 15], textColor: [44, 62, 80] }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(127, 140, 141);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
            doc.text('Almanik PMS - Property Management System', 20, 290);
        }

        // Save
        doc.save(getExportFilename('pdf'));
        showExportLoading(false);

    } catch (error) {
        console.error('PDF export error:', error);
        showExportLoading(false);
        alert('Error generating PDF. Please try again.');
    }
}

/**
 * Export to Excel using SheetJS
 */
async function exportToExcel() {
    showExportLoading(true, 'Generating Excel...');

    try {
        const data = await collectReportData();
        const wb = XLSX.utils.book_new();

        // Sheet 1: Financial Summary
        const financialData = [
            ['ALMANIK PMS - Financial Report'],
            [`Period: ${data.period.start} to ${data.period.end}`],
            [`Generated: ${new Date().toLocaleString('es-CO')}`],
            [],
            ['Metric', 'Value'],
            ['Total Revenue', data.financials.totalRevenue || 0],
            ['RevPAB', data.financials.revPab || 0],
            ['Average Daily Rate', data.financials.adr || 0],
            ['Occupancy Rate', data.financials.occupancyRate || '0%'],
            ['Occupied Beds', data.financials.occupiedBeds || 0],
            ['Total Beds', data.financials.totalBeds || 27]
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(financialData);
        ws1['!cols'] = [{ wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Financial Summary');

        // Sheet 2: Monthly Occupancy
        const occupancyData = [
            ['Monthly Occupancy'],
            [],
            ['Month', 'Occupancy %'],
            ...data.occupancy.labels.map((label, i) => [label, data.occupancy.values[i]])
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(occupancyData);
        ws2['!cols'] = [{ wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Occupancy');

        // Sheet 3: Weekly Revenue
        const revenueData = [
            ['Weekly Revenue'],
            [],
            ['Week', 'Revenue (COP)'],
            ...data.revenue.labels.map((label, i) => [label, data.revenue.values[i]])
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(revenueData);
        ws3['!cols'] = [{ wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Revenue');

        // Sheet 4: Guest Distribution
        const guestTotal = data.guests.values.reduce((a, b) => a + b, 0);
        const guestData = [
            ['Guest Distribution by Source'],
            [],
            ['Source', 'Count', 'Percentage'],
            ...data.guests.labels.map((label, i) => [
                label,
                data.guests.values[i],
                `${((data.guests.values[i] / guestTotal) * 100).toFixed(1)}%`
            ])
        ];
        const ws4 = XLSX.utils.aoa_to_sheet(guestData);
        ws4['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws4, 'Guests');

        // Sheet 5: YoY Comparison
        const currentYear = new Date().getFullYear();
        const yoyData = [
            ['Year-over-Year Comparison'],
            [],
            ['Month', `${currentYear}`, `${currentYear - 1}`, 'Change %'],
            ...data.yoy.labels.map((label, i) => {
                const curr = data.yoy.currentYear[i];
                const prev = data.yoy.previousYear[i];
                const change = prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : 'N/A';
                return [label, curr, prev, change];
            })
        ];
        const ws5 = XLSX.utils.aoa_to_sheet(yoyData);
        ws5['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws5, 'YoY Comparison');

        // Save
        XLSX.writeFile(wb, getExportFilename('xlsx'));
        showExportLoading(false);

    } catch (error) {
        console.error('Excel export error:', error);
        showExportLoading(false);
        alert('Error generating Excel. Please try again.');
    }
}

/**
 * Export to CSV (simple format)
 */
async function exportToCSV() {
    showExportLoading(true, 'Generating CSV...');

    try {
        const data = await collectReportData();

        // Create CSV content
        let csv = 'ALMANIK PMS - Financial Report\n';
        csv += `Period,${data.period.start},${data.period.end}\n`;
        csv += `Generated,${new Date().toLocaleString('es-CO')}\n\n`;

        // Financial Summary
        csv += 'FINANCIAL SUMMARY\n';
        csv += 'Metric,Value\n';
        csv += `Total Revenue,${data.financials.totalRevenue || 0}\n`;
        csv += `RevPAB,${data.financials.revPab || 0}\n`;
        csv += `Average Daily Rate,${data.financials.adr || 0}\n`;
        csv += `Occupancy Rate,${data.financials.occupancyRate || '0%'}\n`;
        csv += `Occupied Beds,${data.financials.occupiedBeds || 0}\n`;
        csv += `Total Beds,${data.financials.totalBeds || 27}\n\n`;

        // Monthly Occupancy
        csv += 'MONTHLY OCCUPANCY\n';
        csv += 'Month,Occupancy %\n';
        data.occupancy.labels.forEach((label, i) => {
            csv += `${label},${data.occupancy.values[i]}\n`;
        });
        csv += '\n';

        // Weekly Revenue
        csv += 'WEEKLY REVENUE\n';
        csv += 'Week,Revenue (COP)\n';
        data.revenue.labels.forEach((label, i) => {
            csv += `${label},${data.revenue.values[i]}\n`;
        });
        csv += '\n';

        // Guest Distribution
        csv += 'GUEST DISTRIBUTION\n';
        csv += 'Source,Count\n';
        data.guests.labels.forEach((label, i) => {
            csv += `${label},${data.guests.values[i]}\n`;
        });
        csv += '\n';

        // YoY Comparison
        const currentYear = new Date().getFullYear();
        csv += 'YEAR-OVER-YEAR COMPARISON\n';
        csv += `Month,${currentYear},${currentYear - 1}\n`;
        data.yoy.labels.forEach((label, i) => {
            csv += `${label},${data.yoy.currentYear[i]},${data.yoy.previousYear[i]}\n`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = getExportFilename('csv');
        link.click();
        URL.revokeObjectURL(link.href);

        showExportLoading(false);

    } catch (error) {
        console.error('CSV export error:', error);
        showExportLoading(false);
        alert('Error generating CSV. Please try again.');
    }
}
