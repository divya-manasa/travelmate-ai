/**
 * Utility functions for the Travel Suggestion application
 */

// Toast Notifications Helper
function showToast(title, message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Modal Management Helpers
function openModal(title, htmlContent) {
    let overlay = document.querySelector('.modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title"></h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Add click listener to close when clicking outside container
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    overlay.querySelector('.modal-title').textContent = title;
    overlay.querySelector('.modal-content').innerHTML = htmlContent;
    
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent body scrolling
}

function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Date Formatter
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return dateString;
    }
}

// Button Loading State Toggler
function setButtonLoading(buttonElement, isLoading, originalText = 'Submit') {
    if (isLoading) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = `<span class="loader"></span> Loading...`;
    } else {
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalText;
    }
}

// Export functions to global scope
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.formatDate = formatDate;
window.setButtonLoading = setButtonLoading;
