/**
 * Feedback Module
 * Handles user feedback submission
 */

document.addEventListener('DOMContentLoaded', () => {
    // Create Feedback UI Elements
    createFeedbackUI();

    // Event Listeners
    const feedbackBtn = document.getElementById('feedback-btn');
    const feedbackModal = document.getElementById('feedback-modal');
    const closeFeedbackBtn = document.getElementById('close-feedback');
    const feedbackForm = document.getElementById('feedback-form');

    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            feedbackModal.classList.remove('hidden');
            feedbackModal.style.display = 'flex';
        });
    }

    if (closeFeedbackBtn) {
        closeFeedbackBtn.addEventListener('click', () => {
            feedbackModal.classList.add('hidden');
            feedbackModal.style.display = 'none';
        });
    }

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === feedbackModal) {
            feedbackModal.classList.add('hidden');
            feedbackModal.style.display = 'none';
        }
    });

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = feedbackForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            const formData = {
                type: document.getElementById('feedback-type').value,
                rating: document.querySelector('input[name="rating"]:checked')?.value || 5,
                message: document.getElementById('feedback-message').value,
                email: document.getElementById('feedback-email').value
            };

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Thank you for your feedback!');
                    feedbackModal.classList.add('hidden');
                    feedbackModal.style.display = 'none';
                    feedbackForm.reset();
                } else {
                    alert('Error sending feedback: ' + result.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to send feedback. Please try again.');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

function createFeedbackUI() {
    // Add Feedback Button
    const btn = document.createElement('button');
    btn.id = 'feedback-btn';
    btn.innerHTML = '<i class="fas fa-comment-alt"></i> Feedback';
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 30px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
        z-index: 1000;
        font-weight: 600;
        transition: transform 0.3s ease;
    `;
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    document.body.appendChild(btn);

    // Add Feedback Modal
    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.className = 'hidden';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1001;
        display: none;
        align-items: center;
        justify-content: center;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 500px; position: relative;">
            <button id="close-feedback" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 20px; cursor: pointer; color: #7f8c8d;">&times;</button>
            <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">We value your feedback!</h2>
            
            <form id="feedback-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #2c3e50; font-weight: 600;">Type</label>
                    <select id="feedback-type" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                        <option value="bug">🐛 Report a Bug</option>
                        <option value="feature">💡 Feature Request</option>
                        <option value="general">💬 General Comment</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #2c3e50; font-weight: 600;">Rating</label>
                    <div style="display: flex; justify-content: center; gap: 10px;">
                        <label><input type="radio" name="rating" value="1"> 😠</label>
                        <label><input type="radio" name="rating" value="2"> 😕</label>
                        <label><input type="radio" name="rating" value="3"> 😐</label>
                        <label><input type="radio" name="rating" value="4"> 🙂</label>
                        <label><input type="radio" name="rating" value="5" checked> 🤩</label>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #2c3e50; font-weight: 600;">Message</label>
                    <textarea id="feedback-message" required rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" placeholder="Tell us what you think..."></textarea>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #2c3e50; font-weight: 600;">Email (Optional)</label>
                    <input type="email" id="feedback-email" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" placeholder="your@email.com">
                </div>

                <button type="submit" style="width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Send Feedback</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}
