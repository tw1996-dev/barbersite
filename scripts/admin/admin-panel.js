/**
 * ADMIN PANEL MAIN MODULE
 * Main entry point that coordinates all admin panel modules
 * Handles initialization, module setup, and responsive updates
 */

import { loadBusinessHours, initializeData } from './admin-state.js';
import { setupNavigation, initializeNavigation } from './admin-navigation.js';
import { setupDashboard } from './admin-dashboard.js';
import { setupBookingsSection } from './admin-bookings.js';
import { setupCalendar } from './admin-calendar.js';
import { setupScheduleSection } from './admin-schedule.js';
import { setupAddBookingSection } from './admin-add-booking.js';
import { setupModal } from './admin-modal.js';
import './admin-actions.js'; // Import for side effects (window functions)

// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Load saved business hours first (keeping legacy function call)
    loadBusinessHours();
    
    // Initialize all modules
    initializeAdminPanel();
    
    // Setup responsive updates
    setupResponsiveHandlers();
});

// Main initialization function exposed to window for external access
window.initAdminPanel = function() {
    initializeAdminPanel();
};

async function initializeAdminPanel() {
    // Load data from API
    await initializeData();
    
    // Setup all modules in order
    setupNavigation();
    setupDashboard();
    setupBookingsSection();
    setupCalendar();
    setupScheduleSection();
    setupAddBookingSection();
    setupModal();
    
    // Initialize with dashboard as default
    initializeNavigation();
}

function setupResponsiveHandlers() {
    // Handle window resize for responsive updates
    function handleWindowResize() {
        const currentSection = getCurrentSection();
        
        if (currentSection === 'dashboard') {
            // Dynamically import and call dashboard update
            import('./admin-dashboard.js').then(module => {
                module.updateDashboard();
            });
        } else if (currentSection === 'bookings') {
            // Dynamically import and call bookings update
            import('./admin-bookings.js').then(module => {
                module.updateBookingsSection();
            });
        }
    }
    
    // Throttle resize events
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleWindowResize, 250);
    });
}

function getCurrentSection() {
    const activeSection = document.querySelector('.admin-section.active');
    return activeSection ? activeSection.id.replace('-section', '') : 'dashboard';
}