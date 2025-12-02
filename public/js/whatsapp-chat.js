/**
 * WhatsApp Chat Panel - Almanik PMS
 * DEV4-08: Panel de chat para respuestas manuales
 * @version 1.0.0
 * @date 2025-11-29
 */

// State
let conversations = [];
let currentConversation = null;
let currentMessages = [];
let botEnabled = true;
let refreshInterval = null;
let sessionId = localStorage.getItem('sessionId');

// DOM Elements
const conversationsList = document.getElementById('conversationsList');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const emptyChatState = document.getElementById('emptyChatState');
const activeChatContainer = document.getElementById('activeChatContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    loadBotStatus();
    setupEventListeners();
    startAutoRefresh();
});

// Event Listeners
function setupEventListeners() {
    // Message input
    messageInput.addEventListener('input', () => {
        sendBtn.disabled = !messageInput.value.trim();
        adjustTextareaHeight();
    });

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.value.trim()) {
                sendMessage();
            }
        }
    });

    // Search
    document.getElementById('searchConversations').addEventListener('input', (e) => {
        filterConversations(e.target.value);
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Load Conversations
async function loadConversations() {
    try {
        const response = await fetch('/api/whatsapp/conversations?limit=50', {
            headers: { 'session-id': sessionId }
        });

        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }

        const data = await response.json();

        if (data.success) {
            conversations = data.data || [];
            renderConversations();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
        conversationsList.innerHTML = `
            <div class="empty-state" style="padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #e74c3c;"></i>
                <p style="margin-top: 15px;">Error al cargar conversaciones</p>
                <button class="btn btn-small btn-primary" onclick="loadConversations()" style="margin-top: 10px;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Render Conversations
function renderConversations(filtered = null) {
    const list = filtered || conversations;

    if (list.length === 0) {
        conversationsList.innerHTML = `
            <div class="empty-state" style="padding: 40px;">
                <i class="fab fa-whatsapp" style="font-size: 50px; opacity: 0.3;"></i>
                <p style="margin-top: 15px;">No hay conversaciones</p>
            </div>
        `;
        return;
    }

    conversationsList.innerHTML = list.map(conv => {
        const initials = getInitials(conv.guest_name || conv.number);
        const isActive = currentConversation && currentConversation.number === conv.number;
        const timeAgo = formatTimeAgo(conv.last_message_at);
        const preview = truncateText(conv.last_message, 40);
        const directionIcon = conv.last_direction === 'incoming' ? '' : '<i class="fas fa-reply" style="font-size: 10px; margin-right: 3px; opacity: 0.6;"></i>';

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}"
                 onclick="selectConversation('${conv.number}')">
                <div class="conversation-avatar">${initials}</div>
                <div class="conversation-info">
                    <div class="conversation-name">${conv.guest_name || formatPhoneNumber(conv.number)}</div>
                    <div class="conversation-preview">${directionIcon}${preview}</div>
                </div>
                <div class="conversation-meta">
                    <div class="conversation-time">${timeAgo}</div>
                    ${conv.message_count > 1 ? `<div class="conversation-badge">${conv.message_count}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Filter Conversations
function filterConversations(query) {
    if (!query.trim()) {
        renderConversations();
        return;
    }

    const filtered = conversations.filter(conv => {
        const name = (conv.guest_name || '').toLowerCase();
        const number = conv.number;
        const q = query.toLowerCase();
        return name.includes(q) || number.includes(q);
    });

    renderConversations(filtered);
}

// Select Conversation
async function selectConversation(number) {
    try {
        // Show loading
        emptyChatState.style.display = 'none';
        activeChatContainer.style.display = 'flex';
        messagesArea.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Cargando mensajes...</div>';

        // Fetch conversation
        const response = await fetch(`/api/whatsapp/conversations/${number}?limit=100`, {
            headers: { 'session-id': sessionId }
        });

        if (!response.ok) throw new Error('Failed to load conversation');

        const data = await response.json();

        if (data.success) {
            currentConversation = {
                number: data.data.number,
                guest: data.data.guest,
                messages: data.data.messages
            };
            currentMessages = data.data.messages;

            updateChatHeader();
            updateDetailsPanel();
            renderMessages();
            renderConversations(); // Update active state

            // Mobile: show chat
            chatContainer.classList.add('chat-active');
            document.getElementById('backBtn').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
        messagesArea.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                <p>Error al cargar la conversacion</p>
            </div>
        `;
    }
}

// Render Messages
function renderMessages() {
    if (currentMessages.length === 0) {
        messagesArea.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments" style="font-size: 50px; opacity: 0.3;"></i>
                <p>No hay mensajes</p>
            </div>
        `;
        return;
    }

    let html = '';
    let lastDate = null;

    currentMessages.forEach(msg => {
        const msgDate = new Date(msg.created_at).toLocaleDateString('es-ES');

        // Date separator
        if (msgDate !== lastDate) {
            html += `<div class="date-separator"><span>${formatDateSeparator(msg.created_at)}</span></div>`;
            lastDate = msgDate;
        }

        const isOutgoing = msg.direction === 'outgoing';
        const isBot = msg.message_id && msg.message_id.startsWith('bot_');
        const time = new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        html += `
            <div class="message ${isOutgoing ? 'outgoing' : 'incoming'} ${isBot ? 'bot' : ''}">
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <div class="message-time">
                    ${isBot ? '<i class="fas fa-robot" style="margin-right: 3px;"></i>' : ''}
                    ${time}
                    ${isOutgoing ? getStatusIcon(msg.status) : ''}
                </div>
            </div>
        `;
    });

    messagesArea.innerHTML = html;
    scrollToBottom();
}

// Update Chat Header
function updateChatHeader() {
    if (!currentConversation) return;

    const name = currentConversation.guest?.name || formatPhoneNumber(currentConversation.number);
    const initials = getInitials(name);

    document.getElementById('chatAvatar').textContent = initials;
    document.getElementById('chatName').textContent = name;
    document.getElementById('chatStatus').textContent = currentConversation.guest
        ? 'Huesped registrado'
        : formatPhoneNumber(currentConversation.number);
}

// Update Details Panel
function updateDetailsPanel() {
    if (!currentConversation) return;

    const name = currentConversation.guest?.name || formatPhoneNumber(currentConversation.number);
    const initials = getInitials(name);

    document.getElementById('detailsAvatar').textContent = initials;
    document.getElementById('detailsName').textContent = name;
    document.getElementById('detailsPhone').textContent = formatPhoneNumber(currentConversation.number);

    // Guest info
    const guestSection = document.getElementById('guestInfoSection');
    if (currentConversation.guest) {
        guestSection.style.display = 'block';
        document.getElementById('guestEmail').textContent = currentConversation.guest.email || '-';
        // TODO: Load reservation info
    } else {
        guestSection.style.display = 'none';
    }

    // Stats
    document.getElementById('statsTotalMsgs').textContent = currentMessages.length;
    if (currentMessages.length > 0) {
        document.getElementById('statsFirstMsg').textContent = formatDateShort(currentMessages[0].created_at);
    }
}

// Send Message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentConversation) return;

    const number = currentConversation.number;

    // Optimistic UI update
    const tempMessage = {
        id: 'temp_' + Date.now(),
        content: text,
        direction: 'outgoing',
        status: 'sending',
        created_at: new Date().toISOString()
    };

    currentMessages.push(tempMessage);
    renderMessages();

    // Clear input
    messageInput.value = '';
    sendBtn.disabled = true;
    adjustTextareaHeight();

    try {
        const response = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({
                number: number,
                message: text,
                type: 'text'
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update temp message
            const idx = currentMessages.findIndex(m => m.id === tempMessage.id);
            if (idx >= 0) {
                currentMessages[idx].status = 'sent';
                currentMessages[idx].message_id = data.data.messageId;
            }
            renderMessages();
            showToast('Mensaje enviado', 'success');
        } else {
            throw new Error(data.error || 'Failed to send');
        }
    } catch (error) {
        console.error('Error sending message:', error);

        // Mark as failed
        const idx = currentMessages.findIndex(m => m.id === tempMessage.id);
        if (idx >= 0) {
            currentMessages[idx].status = 'failed';
        }
        renderMessages();
        showToast('Error al enviar mensaje', 'error');
    }
}

// Quick Reply
function insertQuickReply(text) {
    messageInput.value = text;
    messageInput.focus();
    sendBtn.disabled = false;
    adjustTextareaHeight();
}

// Send New Message (Modal)
async function sendNewMessage() {
    const number = document.getElementById('newMessageNumber').value.trim();
    const text = document.getElementById('newMessageText').value.trim();

    if (!number || !text) {
        showToast('Ingresa numero y mensaje', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({
                number: number.replace(/\D/g, ''),
                message: text,
                type: 'text'
            })
        });

        const data = await response.json();

        if (data.success) {
            closeNewMessageModal();
            showToast('Mensaje enviado', 'success');
            loadConversations();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error sending new message:', error);
        showToast('Error al enviar: ' + error.message, 'error');
    }
}

// Modal Functions
function openNewMessageModal() {
    document.getElementById('newMessageNumber').value = '';
    document.getElementById('newMessageText').value = '';
    document.getElementById('newMessageModal').classList.add('active');
}

function closeNewMessageModal() {
    document.getElementById('newMessageModal').classList.remove('active');
}

// Bot Status
async function loadBotStatus() {
    try {
        const response = await fetch('/api/whatsapp/bot/config', {
            headers: { 'session-id': sessionId }
        });
        const data = await response.json();

        if (data.success) {
            botEnabled = data.data.enabled;
            updateBotStatusUI();
        }
    } catch (error) {
        console.error('Error loading bot status:', error);
    }
}

async function toggleBotStatus() {
    try {
        const response = await fetch('/api/whatsapp/bot/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({ enabled: !botEnabled })
        });

        const data = await response.json();

        if (data.success) {
            botEnabled = data.data.enabled;
            updateBotStatusUI();
            showToast(botEnabled ? 'Bot activado' : 'Bot desactivado', 'success');
        }
    } catch (error) {
        console.error('Error toggling bot:', error);
        showToast('Error al cambiar estado del bot', 'error');
    }
}

function updateBotStatusUI() {
    document.getElementById('botStatusText').textContent = botEnabled ? 'Bot: ON' : 'Bot: OFF';
}

// Assign Conversation
async function assignConversation() {
    const assignTo = document.getElementById('assignStaff').value;

    if (!currentConversation) return;

    // TODO: Implement assignment logic
    showToast(`Asignado a: ${assignTo || 'Nadie'}`, 'success');
}

// Refresh
function refreshChat() {
    if (currentConversation) {
        selectConversation(currentConversation.number);
    }
}

function backToConversations() {
    chatContainer.classList.remove('chat-active');
    currentConversation = null;
    emptyChatState.style.display = 'flex';
    activeChatContainer.style.display = 'none';
}

function toggleDetailsPanel() {
    const panel = document.getElementById('detailsPanel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

// Auto Refresh
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadConversations();
        // If viewing a conversation, refresh messages
        if (currentConversation) {
            refreshCurrentConversation();
        }
    }, 10000); // Every 10 seconds
}

async function refreshCurrentConversation() {
    if (!currentConversation) return;

    try {
        const response = await fetch(`/api/whatsapp/conversations/${currentConversation.number}?limit=100`, {
            headers: { 'session-id': sessionId }
        });

        if (!response.ok) return;

        const data = await response.json();

        if (data.success) {
            const newMessages = data.data.messages;

            // Check for new messages
            if (newMessages.length > currentMessages.length) {
                currentMessages = newMessages;
                renderMessages();
            }
        }
    } catch (error) {
        console.error('Error refreshing conversation:', error);
    }
}

// Update Stats
function updateStats() {
    document.getElementById('statConversations').textContent = conversations.length;

    // Count unread (incoming without response)
    const unread = conversations.filter(c => c.last_direction === 'incoming').length;
    document.getElementById('statUnread').textContent = unread;

    // Count today
    const today = new Date().toDateString();
    const todayCount = conversations.filter(c =>
        new Date(c.last_message_at).toDateString() === today
    ).length;
    document.getElementById('statToday').textContent = todayCount;
}

// Utility Functions
function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatPhoneNumber(number) {
    if (!number) return '';
    // Format: +57 300 123 4567
    const clean = number.replace(/\D/g, '');
    if (clean.length === 10) {
        return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
    } else if (clean.length > 10) {
        return `+${clean.substring(0, clean.length - 10)} ${clean.substring(clean.length - 10, clean.length - 7)} ${clean.substring(clean.length - 7, clean.length - 4)} ${clean.substring(clean.length - 4)}`;
    }
    return number;
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatDateSeparator(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
    }

    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusIcon(status) {
    switch (status) {
        case 'sent':
            return '<i class="fas fa-check message-status sent"></i>';
        case 'delivered':
            return '<i class="fas fa-check-double message-status delivered"></i>';
        case 'read':
            return '<i class="fas fa-check-double message-status read"></i>';
        case 'failed':
            return '<i class="fas fa-exclamation-circle message-status" style="color: #e74c3c;"></i>';
        default:
            return '<i class="fas fa-clock message-status" style="opacity: 0.5;"></i>';
    }
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Cleanup on page leave
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
