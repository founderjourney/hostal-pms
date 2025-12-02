/**
 * Reviews Dashboard JavaScript
 * DEV4-02: Dashboard de Reviews
 */

// ============================================================
// STATE
// ============================================================

let reviews = [];
let stats = null;
let currentPage = 1;
let totalPages = 1;
const ITEMS_PER_PAGE = 20;
let currentReviewId = null;
let trendChart = null;

const CATEGORY_LABELS = {
    cleanliness: 'Limpieza',
    location: 'Ubicacion',
    staff: 'Personal',
    value: 'Calidad/Precio',
    facilities: 'Instalaciones',
    atmosphere: 'Ambiente'
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadReviews();
});

// ============================================================
// API CALLS
// ============================================================

async function loadStats() {
    try {
        const response = await fetch('/api/reviews/stats');
        const result = await response.json();

        if (result.success) {
            stats = result.data;
            renderStats();
            renderDistribution();
            renderCategoryAverages();
            renderTrendChart();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Error al cargar estadisticas', 'error');
    }
}

async function loadReviews() {
    const rating = document.getElementById('filter-rating').value;
    const responded = document.getElementById('filter-responded').value;
    const isPublic = document.getElementById('filter-public').value;
    const sort = document.getElementById('filter-sort').value;

    const params = new URLSearchParams();
    if (rating) params.append('rating', rating);
    if (responded) params.append('responded', responded);
    if (isPublic) params.append('is_public', isPublic);
    params.append('sort', sort);
    params.append('limit', ITEMS_PER_PAGE);
    params.append('offset', (currentPage - 1) * ITEMS_PER_PAGE);

    try {
        const response = await fetch(`/api/reviews?${params}`);
        const result = await response.json();

        if (result.success) {
            reviews = result.data.reviews;
            totalPages = Math.ceil(result.data.pagination.total / ITEMS_PER_PAGE);
            renderReviews();
            renderPagination(result.data.pagination.total);
            checkForNegativeReviews();
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        showToast('Error al cargar reviews', 'error');
    }
}

async function submitResponse() {
    const responseText = document.getElementById('response-text').value.trim();

    if (!responseText) {
        showToast('Por favor escribe una respuesta', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/reviews/${currentReviewId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response: responseText })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Respuesta enviada correctamente', 'success');
            closeModal();
            loadReviews();
            loadStats();
        } else {
            showToast(result.error || 'Error al enviar respuesta', 'error');
        }
    } catch (error) {
        console.error('Error submitting response:', error);
        showToast('Error de conexion', 'error');
    }
}

async function toggleVisibility(reviewId, currentState) {
    try {
        const response = await fetch(`/api/reviews/${reviewId}/visibility`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_public: !currentState })
        });

        const result = await response.json();

        if (result.success) {
            showToast(result.message, 'success');
            loadReviews();
        } else {
            showToast(result.error || 'Error al cambiar visibilidad', 'error');
        }
    } catch (error) {
        console.error('Error toggling visibility:', error);
        showToast('Error de conexion', 'error');
    }
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderStats() {
    if (!stats) return;

    // Main average
    document.getElementById('stat-average').textContent = stats.average_rating.toFixed(1);
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-responded').textContent = stats.response_rate.responded;
    document.getElementById('stat-pending').textContent = stats.response_rate.pending;

    // Stars display
    const starsContainer = document.getElementById('average-stars');
    starsContainer.innerHTML = renderStars(stats.average_rating);

    // Trend indicator
    const trendEl = document.getElementById('rating-trend');
    const avgLast = parseFloat(stats.trend.avg_last_30);
    const avgPrev = parseFloat(stats.trend.avg_prev_30);

    if (avgPrev > 0 && avgLast > 0) {
        const diff = avgLast - avgPrev;
        if (diff > 0) {
            trendEl.className = 'trend up';
            trendEl.innerHTML = `<i class="fas fa-arrow-up"></i> +${diff.toFixed(1)}`;
        } else if (diff < 0) {
            trendEl.className = 'trend down';
            trendEl.innerHTML = `<i class="fas fa-arrow-down"></i> ${diff.toFixed(1)}`;
        } else {
            trendEl.className = 'trend neutral';
            trendEl.innerHTML = `<i class="fas fa-minus"></i> 0`;
        }
    } else {
        trendEl.className = 'trend neutral';
        trendEl.textContent = '--';
    }
}

function renderDistribution() {
    if (!stats) return;

    const container = document.getElementById('distribution-bars');
    container.innerHTML = '';

    const total = stats.total || 1;

    [5, 4, 3, 2, 1].forEach(rating => {
        const count = stats.distribution[rating] || 0;
        const percent = (count / total) * 100;

        const bar = document.createElement('div');
        bar.className = 'distribution-bar';
        bar.innerHTML = `
            <div class="stars-label">
                <span>${rating}</span>
                <i class="fas fa-star" style="color: #f1c40f; font-size: 12px;"></i>
            </div>
            <div class="bar-container">
                <div class="bar" style="width: ${percent}%"></div>
            </div>
            <span class="count">${count}</span>
        `;
        container.appendChild(bar);
    });
}

function renderCategoryAverages() {
    if (!stats || !stats.category_averages) return;

    const container = document.getElementById('category-averages');
    container.innerHTML = '';

    Object.keys(stats.category_averages).forEach(cat => {
        const value = stats.category_averages[cat];
        if (value === null) return;

        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <div class="cat-value">${parseFloat(value).toFixed(1)}</div>
            <div class="cat-label">${CATEGORY_LABELS[cat] || cat}</div>
        `;
        container.appendChild(item);
    });
}

function renderTrendChart() {
    if (!stats) return;

    const ctx = document.getElementById('trend-chart').getContext('2d');

    // Destroy existing chart
    if (trendChart) {
        trendChart.destroy();
    }

    // Generate labels for last 30 days
    const labels = [];
    const data = [];

    // Simulated data based on stats (in production, you'd have daily data)
    const avgRating = stats.average_rating || 4;
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));

        // Simulate variation around average
        const variation = (Math.random() - 0.5) * 0.5;
        data.push(Math.max(1, Math.min(5, avgRating + variation)));
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rating Promedio',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 1,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 7
                    }
                }
            }
        }
    });
}

function renderReviews() {
    const container = document.getElementById('reviews-list');
    document.getElementById('reviews-count').textContent = `(${reviews.length})`;

    if (reviews.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h3>No hay reviews</h3>
                <p>No se encontraron reviews con los filtros seleccionados</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => {
        const isNegative = review.rating < 3;
        const needsResponse = !review.staff_response;
        const initials = getInitials(review.guest_name);
        const date = new Date(review.created_at).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        let classes = 'review-card';
        if (isNegative) classes += ' negative';
        else if (needsResponse) classes += ' pending-response';

        return `
            <div class="${classes}">
                <div class="review-top">
                    <div class="review-guest">
                        <div class="review-avatar">${initials}</div>
                        <div class="review-info">
                            <h4>${review.guest_name || 'Anonimo'}</h4>
                            <div class="review-meta">
                                <span><i class="fas fa-calendar"></i> ${date}</span>
                                ${review.bed_name ? `<span><i class="fas fa-bed"></i> ${review.bed_name}</span>` : ''}
                                ${review.nationality ? `<span><i class="fas fa-flag"></i> ${review.nationality}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="review-rating">
                        <div class="big-rating">${review.rating}.0</div>
                        <div class="stars">${renderStars(review.rating)}</div>
                        <span class="visibility-badge ${review.is_public ? 'public' : 'private'}">
                            ${review.is_public ? 'Publico' : 'Privado'}
                        </span>
                    </div>
                </div>

                ${review.comment ? `<div class="review-comment">${escapeHtml(review.comment)}</div>` : ''}

                ${review.category_ratings ? renderCategoryBadges(review.category_ratings) : ''}

                ${review.staff_response ? `
                    <div class="staff-response">
                        <div class="response-header">
                            <span><i class="fas fa-reply"></i> Respuesta del Staff</span>
                            <span>${review.responded_by_name || ''} - ${formatDate(review.responded_at)}</span>
                        </div>
                        <div class="response-text">${escapeHtml(review.staff_response)}</div>
                    </div>
                ` : ''}

                <div class="review-actions">
                    ${!review.staff_response ? `
                        <button class="btn btn-primary btn-small" onclick="openResponseModal(${review.id})">
                            <i class="fas fa-reply"></i> Responder
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-small" onclick="toggleVisibility(${review.id}, ${review.is_public})">
                        <i class="fas fa-${review.is_public ? 'eye-slash' : 'eye'}"></i>
                        ${review.is_public ? 'Ocultar' : 'Publicar'}
                    </button>
                    ${review.is_public && review.comment ? `
                        <div class="export-dropdown" style="position: relative; display: inline-block;">
                            <button class="btn btn-secondary btn-small" onclick="toggleExportMenu(${review.id})">
                                <i class="fas fa-share-alt"></i> Exportar
                            </button>
                            <div id="export-menu-${review.id}" class="export-menu" style="display: none; position: absolute; top: 100%; right: 0; background: white; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.15); padding: 8px 0; z-index: 100; min-width: 150px;">
                                <a href="#" onclick="exportReview(${review.id}, 'instagram'); return false;" style="display: block; padding: 10px 15px; color: #333; text-decoration: none; font-size: 14px;"><i class="fab fa-instagram" style="color: #E1306C; width: 20px;"></i> Instagram</a>
                                <a href="#" onclick="exportReview(${review.id}, 'twitter'); return false;" style="display: block; padding: 10px 15px; color: #333; text-decoration: none; font-size: 14px;"><i class="fab fa-twitter" style="color: #1DA1F2; width: 20px;"></i> Twitter</a>
                                <a href="#" onclick="exportReview(${review.id}, 'facebook'); return false;" style="display: block; padding: 10px 15px; color: #333; text-decoration: none; font-size: 14px;"><i class="fab fa-facebook" style="color: #4267B2; width: 20px;"></i> Facebook</a>
                                <a href="#" onclick="exportReview(${review.id}, 'text'); return false;" style="display: block; padding: 10px 15px; color: #333; text-decoration: none; font-size: 14px;"><i class="fas fa-copy" style="color: #666; width: 20px;"></i> Texto</a>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderCategoryBadges(categories) {
    if (!categories || Object.keys(categories).length === 0) return '';

    const badges = Object.entries(categories)
        .filter(([_, value]) => value)
        .map(([key, value]) => `
            <span class="category-badge">
                ${CATEGORY_LABELS[key] || key}
                <span class="cat-rating">${value}/5</span>
            </span>
        `).join('');

    return badges ? `<div class="review-categories">${badges}</div>` : '';
}

function renderPagination(total) {
    const container = document.getElementById('pagination');
    totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Page numbers
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (start > 2) html += `<span>...</span>`;
    }

    for (let i = start; i <= end; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span>...</span>`;
        html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = html;
}

function checkForNegativeReviews() {
    const negativeReviews = reviews.filter(r => r.rating < 3 && !r.staff_response);
    const alertsSection = document.getElementById('alerts-section');
    const alertsList = document.getElementById('alerts-list');
    const alertsCount = document.getElementById('alerts-count');

    if (negativeReviews.length === 0) {
        alertsSection.style.display = 'none';
        return;
    }

    alertsSection.style.display = 'block';
    alertsSection.classList.add('has-alerts');
    alertsCount.textContent = negativeReviews.length;

    alertsList.innerHTML = negativeReviews.slice(0, 5).map(review => `
        <div class="alert-item">
            <div class="alert-rating">${review.rating}</div>
            <div class="alert-content">
                <div class="alert-guest">${review.guest_name || 'Anonimo'}</div>
                <div class="alert-date">${formatDate(review.created_at)}</div>
                ${review.comment ? `<div class="alert-comment">${truncate(review.comment, 100)}</div>` : ''}
            </div>
            <button class="btn btn-warning btn-small" onclick="openResponseModal(${review.id})">
                <i class="fas fa-reply"></i> Responder
            </button>
        </div>
    `).join('');
}

// ============================================================
// MODAL FUNCTIONS
// ============================================================

function openResponseModal(reviewId) {
    currentReviewId = reviewId;
    const review = reviews.find(r => r.id === reviewId);

    if (!review) return;

    const preview = document.getElementById('modal-review-preview');
    preview.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>${review.guest_name || 'Anonimo'}</strong>
                <span style="color: #f1c40f;">${'<i class="fas fa-star"></i>'.repeat(review.rating)}</span>
            </div>
            ${review.comment ? `<p style="color: #666; font-size: 14px;">${escapeHtml(review.comment)}</p>` : '<p style="color: #999; font-style: italic;">Sin comentario</p>'}
        </div>
    `;

    document.getElementById('response-text').value = '';
    document.getElementById('response-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('response-modal').classList.remove('active');
    currentReviewId = null;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fas fa-star${i <= rating ? '' : ' empty'}"></i>`;
    }
    return stars;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadReviews();
}

function refreshData() {
    loadStats();
    loadReviews();
    showToast('Datos actualizados', 'success');
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// Close modal on outside click
document.getElementById('response-modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

async function exportReview(reviewId, format) {
    try {
        const response = await fetch(`/api/reviews/${reviewId}/export?format=${format}`);
        const result = await response.json();

        if (result.success) {
            openExportModal(result.data, format);
        } else {
            showToast(result.error || 'Error al exportar', 'error');
        }
    } catch (error) {
        console.error('Error exporting review:', error);
        showToast('Error de conexion', 'error');
    }
}

async function exportBestReviews() {
    try {
        const response = await fetch('/api/reviews/export/best?limit=5&min_rating=4');
        const result = await response.json();

        if (result.success) {
            openBestExportModal(result.data);
        } else {
            showToast(result.error || 'Error al exportar', 'error');
        }
    } catch (error) {
        console.error('Error exporting best reviews:', error);
        showToast('Error de conexion', 'error');
    }
}

function openExportModal(data, format) {
    let content = '';
    let title = 'Exportar Review';

    switch (format) {
        case 'instagram':
            title = 'Exportar para Instagram';
            content = `
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">Caption:</label>
                    <textarea id="export-text" readonly style="width: 100%; height: 150px; padding: 12px; border: 2px solid #ecf0f1; border-radius: 10px; font-size: 14px;">${data.caption}</textarea>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">Texto para imagen:</label>
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 10px; text-align: center; font-size: 18px; font-style: italic;">
                        ${data.image_text}<br><br>
                        <span style="font-size: 14px;">— ${data.author}</span><br>
                        <span style="font-size: 24px;">${'⭐'.repeat(data.rating)}</span>
                    </div>
                </div>
            `;
            break;

        case 'twitter':
            title = 'Exportar para Twitter/X';
            content = `
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">Tweet (${data.characters} caracteres):</label>
                    <textarea id="export-text" readonly style="width: 100%; height: 100px; padding: 12px; border: 2px solid #ecf0f1; border-radius: 10px; font-size: 14px;">${data.tweet}</textarea>
                </div>
            `;
            break;

        case 'facebook':
            title = 'Exportar para Facebook';
            content = `
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">Post:</label>
                    <textarea id="export-text" readonly style="width: 100%; height: 180px; padding: 12px; border: 2px solid #ecf0f1; border-radius: 10px; font-size: 14px;">${data.post}</textarea>
                </div>
            `;
            break;

        default:
            title = 'Exportar Review';
            content = `
                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">Texto:</label>
                    <textarea id="export-text" readonly style="width: 100%; height: 120px; padding: 12px; border: 2px solid #ecf0f1; border-radius: 10px; font-size: 14px;">${data.plain_text}</textarea>
                </div>
            `;
    }

    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'export-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-share-alt"></i> ${title}</h2>
                <button class="modal-close" onclick="closeExportModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeExportModal()">Cerrar</button>
                <button class="btn btn-primary" onclick="copyExportText()">
                    <i class="fas fa-copy"></i> Copiar Texto
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openBestExportModal(data) {
    let reviewsList = data.reviews.map((r, i) => `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>${r.author}</strong>
                <span>${r.stars}</span>
            </div>
            <p style="color: #555; font-size: 14px; margin-bottom: 10px;">"${r.quote}"</p>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-small" style="background: #E1306C; color: white;" onclick="copyText(\`${r.instagram.replace(/`/g, '\\`')}\`)">
                    <i class="fab fa-instagram"></i>
                </button>
                <button class="btn btn-small" style="background: #1DA1F2; color: white;" onclick="copyText(\`${r.twitter.replace(/`/g, '\\`')}\`)">
                    <i class="fab fa-twitter"></i>
                </button>
            </div>
        </div>
    `).join('');

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'export-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2><i class="fas fa-trophy"></i> Mejores Reviews para Redes</h2>
                <button class="modal-close" onclick="closeExportModal()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                ${data.count > 0 ? reviewsList : '<p style="text-align: center; color: #999;">No hay reviews con rating 4+ para exportar</p>'}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeExportModal()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.remove();
}

function copyExportText() {
    const textarea = document.getElementById('export-text');
    if (textarea) {
        textarea.select();
        document.execCommand('copy');
        showToast('Texto copiado al portapapeles', 'success');
    }
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Texto copiado al portapapeles', 'success');
    }).catch(() => {
        showToast('Error al copiar', 'error');
    });
}

function toggleExportMenu(reviewId) {
    // Close all other menus
    document.querySelectorAll('.export-menu').forEach(menu => {
        if (menu.id !== `export-menu-${reviewId}`) {
            menu.style.display = 'none';
        }
    });

    // Toggle current menu
    const menu = document.getElementById(`export-menu-${reviewId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close export menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.export-dropdown')) {
        document.querySelectorAll('.export-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});
