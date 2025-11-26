/**
 * Advanced Reports Module
 * Handles fetching and displaying financial data, forecasts, and insights.
 */

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
});

async function loadFinancials() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    try {
        const response = await fetch(`/api/reports/financial?startDate=${start}&endDate=${end}`);
        const data = await response.json();

        // Update UI
        document.getElementById('total-revenue').textContent = formatCurrency(data.financials.total_revenue);
        document.getElementById('rev-pab').textContent = formatCurrency(data.financials.rev_pab);
        document.getElementById('occupancy-rate').textContent = data.occupancy.rate;

        // Calculate ADR (Avg Daily Rate) roughly
        const revenue = parseFloat(data.financials.total_revenue);
        const occupied = data.occupancy.occupied_beds;
        const adr = occupied > 0 ? revenue / occupied : 0;
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

function exportReport() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    alert(`Exporting report for ${start} to ${end}... (Feature simulated for Day 10)`);
}

// Helpers
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
}

function formatDate(dateString) {
    const options = { weekday: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}
