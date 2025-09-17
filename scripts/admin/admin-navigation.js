/**
 * ADMIN NAVIGATION MODULE
 * Handles navigation between different sections of the admin panel
 * Manages section visibility, active states, and section-specific updates
 */

import { setCurrentSection } from './admin-state.js';
import { updateDashboard } from './admin-dashboard.js';
import { updateBookingsSection } from './admin-bookings.js';
import { renderAdminCalendar } from './admin-calendar.js';
import { resetAddBookingForm, renderAddBookingCalendar } from './admin-add-booking.js';

// DOM elements
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.admin-section');

export function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            showSection(section);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

export function showSection(sectionName) {
    setCurrentSection(sectionName);
    
    // Hide all sections
    sections.forEach(section => section.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update content based on section
    switch(sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'bookings':
            updateBookingsSection();
            break;
        case 'calendar':
            renderAdminCalendar();
            break;
        case 'add-booking':
            resetAddBookingForm();
            renderAddBookingCalendar();
            break;
    }
}

// Initialize navigation with dashboard as default
export function initializeNavigation() {
    showSection('dashboard');
}