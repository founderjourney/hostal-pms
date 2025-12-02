/**
 * ============================================================
 * ALMANIK PMS - Push Notifications Client
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @developer DEV2
 *
 * Client-side push notification handling.
 * Handles permission requests, subscription management, and UI.
 */

const PushNotifications = (function() {
    'use strict';

    // ============================================================
    // STATE
    // ============================================================

    let isSupported = false;
    let isSubscribed = false;
    let swRegistration = null;
    let vapidPublicKey = null;

    // ============================================================
    // INITIALIZATION
    // ============================================================

    /**
     * Initialize push notifications
     * Call this after page load and service worker registration
     */
    async function init() {
        console.log('[Push] Initializing push notifications...');

        // Check browser support
        if (!('serviceWorker' in navigator)) {
            console.warn('[Push] Service Workers not supported');
            return false;
        }

        if (!('PushManager' in window)) {
            console.warn('[Push] Push notifications not supported');
            return false;
        }

        if (!('Notification' in window)) {
            console.warn('[Push] Notifications not supported');
            return false;
        }

        isSupported = true;

        try {
            // Get service worker registration
            swRegistration = await navigator.serviceWorker.ready;
            console.log('[Push] Service Worker ready');

            // Get VAPID public key from server
            const keyResponse = await fetch('/api/notifications/vapid-public-key');
            const keyData = await keyResponse.json();

            if (!keyData.success || !keyData.data.publicKey) {
                console.warn('[Push] VAPID key not configured on server');
                return false;
            }

            vapidPublicKey = keyData.data.publicKey;

            // Check current subscription status
            const subscription = await swRegistration.pushManager.getSubscription();
            isSubscribed = subscription !== null;

            console.log('[Push] Initialized. Subscribed:', isSubscribed);
            updateUI();

            return true;
        } catch (error) {
            console.error('[Push] Initialization error:', error);
            return false;
        }
    }

    // ============================================================
    // SUBSCRIPTION MANAGEMENT
    // ============================================================

    /**
     * Request permission and subscribe to push notifications
     */
    async function subscribe() {
        if (!isSupported) {
            showToast('Notificaciones no soportadas en este navegador', 'error');
            return false;
        }

        try {
            // Request permission
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                console.log('[Push] Permission denied');
                showToast('Permiso de notificaciones denegado', 'warning');
                return false;
            }

            console.log('[Push] Permission granted');

            // Subscribe to push manager
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            console.log('[Push] Subscribed:', subscription.endpoint);

            // Send subscription to server
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    deviceType: getDeviceType()
                })
            });

            const data = await response.json();

            if (data.success) {
                isSubscribed = true;
                updateUI();
                showToast('Notificaciones activadas', 'success');
                return true;
            } else {
                console.error('[Push] Server subscription failed:', data.error);
                showToast('Error al activar notificaciones', 'error');
                return false;
            }
        } catch (error) {
            console.error('[Push] Subscribe error:', error);
            showToast('Error al suscribirse', 'error');
            return false;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async function unsubscribe() {
        if (!isSupported || !isSubscribed) {
            return false;
        }

        try {
            const subscription = await swRegistration.pushManager.getSubscription();

            if (subscription) {
                // Unsubscribe from push manager
                await subscription.unsubscribe();

                // Notify server
                await fetch('/api/notifications/unsubscribe', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint
                    })
                });

                isSubscribed = false;
                updateUI();
                showToast('Notificaciones desactivadas', 'info');
                return true;
            }
        } catch (error) {
            console.error('[Push] Unsubscribe error:', error);
            showToast('Error al desactivar notificaciones', 'error');
            return false;
        }

        return false;
    }

    /**
     * Toggle subscription status
     */
    async function toggle() {
        if (isSubscribed) {
            return await unsubscribe();
        } else {
            return await subscribe();
        }
    }

    /**
     * Send a test notification
     */
    async function sendTest() {
        if (!isSubscribed) {
            showToast('Primero activa las notificaciones', 'warning');
            return false;
        }

        try {
            const response = await fetch('/api/notifications/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                showToast('Notificacion de prueba enviada', 'success');
                return true;
            } else {
                showToast(data.error || 'Error al enviar prueba', 'error');
                return false;
            }
        } catch (error) {
            console.error('[Push] Test error:', error);
            showToast('Error al enviar prueba', 'error');
            return false;
        }
    }

    // ============================================================
    // UI HELPERS
    // ============================================================

    /**
     * Update UI elements based on subscription status
     */
    function updateUI() {
        // Update toggle buttons
        const toggleBtns = document.querySelectorAll('[data-push-toggle]');
        toggleBtns.forEach(btn => {
            if (isSubscribed) {
                btn.classList.add('active', 'btn-success');
                btn.classList.remove('btn-secondary');
                btn.innerHTML = '<i class="fas fa-bell"></i> Notificaciones Activas';
            } else {
                btn.classList.remove('active', 'btn-success');
                btn.classList.add('btn-secondary');
                btn.innerHTML = '<i class="fas fa-bell-slash"></i> Activar Notificaciones';
            }
        });

        // Update status indicators
        const statusIndicators = document.querySelectorAll('[data-push-status]');
        statusIndicators.forEach(indicator => {
            indicator.textContent = isSubscribed ? 'Activas' : 'Inactivas';
            indicator.className = isSubscribed ? 'badge bg-success' : 'badge bg-secondary';
        });

        // Update test buttons
        const testBtns = document.querySelectorAll('[data-push-test]');
        testBtns.forEach(btn => {
            btn.disabled = !isSubscribed;
        });
    }

    /**
     * Show toast notification (uses existing toast system or creates simple one)
     */
    function showToast(message, type = 'info') {
        // Try to use existing toast system
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        // Simple fallback
        const toast = document.createElement('div');
        toast.className = `push-toast push-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background-color: ${type === 'success' ? '#28a745' :
                              type === 'error' ? '#dc3545' :
                              type === 'warning' ? '#ffc107' : '#17a2b8'};
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Create notification settings UI component
     */
    function createSettingsUI() {
        const container = document.createElement('div');
        container.className = 'notification-settings card';
        container.innerHTML = `
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-bell me-2"></i>Notificaciones Push</h5>
            </div>
            <div class="card-body">
                <p class="text-muted mb-3">
                    Recibe notificaciones sobre nuevas reservaciones, check-ins pendientes y alertas importantes.
                </p>
                <div class="d-flex align-items-center gap-3">
                    <button class="btn btn-secondary" data-push-toggle onclick="PushNotifications.toggle()">
                        <i class="fas fa-bell-slash"></i> Activar Notificaciones
                    </button>
                    <span data-push-status class="badge bg-secondary">Inactivas</span>
                </div>
                <div class="mt-3">
                    <button class="btn btn-sm btn-outline-secondary" data-push-test onclick="PushNotifications.sendTest()" disabled>
                        <i class="fas fa-paper-plane"></i> Enviar Prueba
                    </button>
                </div>
            </div>
        `;

        return container;
    }

    /**
     * Render permission prompt banner (call on pages where you want to prompt)
     */
    function renderPromptBanner(targetSelector) {
        if (!isSupported || isSubscribed) return;

        const permission = Notification.permission;
        if (permission === 'denied') return;

        const target = document.querySelector(targetSelector);
        if (!target) return;

        const banner = document.createElement('div');
        banner.className = 'notification-prompt-banner alert alert-info d-flex align-items-center justify-content-between';
        banner.innerHTML = `
            <div>
                <i class="fas fa-bell me-2"></i>
                <strong>Activa las notificaciones</strong> para recibir alertas de nuevas reservas y check-ins.
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm" onclick="PushNotifications.subscribe(); this.closest('.notification-prompt-banner').remove();">
                    Activar
                </button>
                <button class="btn btn-light btn-sm" onclick="this.closest('.notification-prompt-banner').remove();">
                    Ahora no
                </button>
            </div>
        `;

        target.prepend(banner);
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    /**
     * Convert VAPID public key from base64 to Uint8Array
     */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    /**
     * Detect device type
     */
    function getDeviceType() {
        const ua = navigator.userAgent;

        if (/iPad|iPhone|iPod/.test(ua)) {
            return 'ios';
        }

        if (/android/i.test(ua)) {
            return 'android';
        }

        if (/Windows/.test(ua)) {
            return 'windows';
        }

        if (/Mac/.test(ua)) {
            return 'mac';
        }

        if (/Linux/.test(ua)) {
            return 'linux';
        }

        return 'unknown';
    }

    /**
     * Check if notifications are supported
     */
    function checkSupport() {
        return isSupported;
    }

    /**
     * Check if currently subscribed
     */
    function checkSubscribed() {
        return isSubscribed;
    }

    /**
     * Get current permission status
     */
    function getPermissionStatus() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission;
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    return {
        init,
        subscribe,
        unsubscribe,
        toggle,
        sendTest,
        updateUI,
        createSettingsUI,
        renderPromptBanner,
        checkSupport,
        checkSubscribed,
        getPermissionStatus
    };

})();

// Add CSS for toast animations
const pushStyles = document.createElement('style');
pushStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .notification-prompt-banner {
        animation: slideIn 0.3s ease;
    }
`;
document.head.appendChild(pushStyles);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure SW is registered
        setTimeout(() => PushNotifications.init(), 1000);
    });
} else {
    setTimeout(() => PushNotifications.init(), 1000);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PushNotifications;
}
