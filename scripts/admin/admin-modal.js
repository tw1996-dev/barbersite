/**
 * ADMIN MODAL MODULE
 * Manages modal dialogs for booking details, confirmations,
 * and other popup content throughout the admin panel
 */

import { selectedBooking, setSelectedBooking } from './admin-state.js';

export function setupModal() {
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
}

export function showModal(title, content, actions = null) {
    const modal = document.getElementById('booking-modal');
    const modalTitle = modal.querySelector('.modal-header h3');
    const modalBody = modal.querySelector('.modal-body');
    const modalActions = modal.querySelector('.modal-actions');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = content;
    
    if (actions) {
        modalActions.innerHTML = actions;
        modalActions.style.display = 'flex';
    } else {
        modalActions.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

export function closeModal() {
    const modal = document.getElementById('booking-modal');
    modal.style.display = 'none';
    setSelectedBooking(null);
}