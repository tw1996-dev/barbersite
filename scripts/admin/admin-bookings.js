/**
 * ADMIN BOOKINGS MODULE
 * Manages the bookings section with filtering, mobile/desktop responsive views,
 * and displays all bookings with status and date filters
 */

import { currentBookings } from './admin-state.js';
import { 
    getWeekStart, 
    getWeekEnd, 
    getBookingEndTime, 
    formatTimeRange, 
    formatDate 
} from './admin-utils.js';

export function setupBookingsSection() {
    const statusFilter = document.getElementById('status-filter');
    const dateFilter = document.getElementById('date-filter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', updateBookingsSection);
        // Remove pending option
        const pendingOption = statusFilter.querySelector('option[value="pending"]');
        if (pendingOption) pendingOption.remove();
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', updateBookingsSection);
    }
}

export function updateBookingsSection() {
    const isMobile = window.innerWidth <= 870;
    
    if (isMobile) {
        updateMobileAllBookingsView();
    } else {
        updateBookingsTable();
    }
}

function updateMobileAllBookingsView() {
    let mobileContainer = document.querySelector('#bookings-section .mobile-bookings-container');
    if (!mobileContainer) {
        // Create mobile container
        mobileContainer = document.createElement('div');
        mobileContainer.className = 'mobile-bookings-container';
        
        const bookingsSection = document.getElementById('bookings-section');
        const tableContainer = bookingsSection.querySelector('.bookings-table-container');
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        
        // Insert after filters
        const filtersDiv = bookingsSection.querySelector('.section-header');
        filtersDiv.parentNode.insertBefore(mobileContainer, filtersDiv.nextSibling);
    }
    
    const filteredBookings = getFilteredBookings();
    
    mobileContainer.innerHTML = '';
    
    if (filteredBookings.length === 0) {
        mobileContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No bookings found</p>';
        return;
    }
    
    filteredBookings.forEach(booking => {
        const card = createMobileBookingCard(booking, true); // true = include all actions
        mobileContainer.appendChild(card);
    });
}

function createMobileBookingCard(booking, includeAllActions = false) {
    const card = document.createElement('div');
    card.className = 'booking-card';
    
    const endTime = getBookingEndTime(booking.time, booking.duration);
    const timeRange = formatTimeRange(booking.time, endTime);
    
    const actions = includeAllActions 
        ? `<button class="action-btn view-btn" onclick="viewBooking(${booking.id})">View</button>
           <button class="action-btn edit-btn" onclick="editBooking(${booking.id})">Edit</button>
           <button class="action-btn delete-btn" onclick="deleteBooking(${booking.id})">Delete</button>`
        : `<button class="action-btn view-btn" onclick="viewBooking(${booking.id})">View</button>`;
    
    card.innerHTML = `
        <div class="booking-card-header">
            <div class="booking-customer">${booking.customer}</div>
            <div class="booking-datetime">
                ${formatDate(booking.date)}<br>
                ${timeRange}
            </div>
        </div>
        <div class="booking-services">${booking.services.join(', ')}</div>
        <div class="booking-card-footer">
            <div class="booking-price">
                ${includeAllActions ? `<span class="status-badge status-${booking.status}">${booking.status}</span>` : ''}
                $${booking.price}
            </div>
            <div class="booking-actions">
                ${actions}
            </div>
        </div>
    `;
    
    return card;
}

function getFilteredBookings() {
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const dateFilter = document.getElementById('date-filter')?.value || 'all';
    
    let filteredBookings = currentBookings;
    
    // Apply status filter
    if (statusFilter !== 'all') {
        filteredBookings = filteredBookings.filter(b => b.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
        switch(dateFilter) {
            case 'today':
                filteredBookings = filteredBookings.filter(b => b.date === today);
                break;
            case 'tomorrow':
                filteredBookings = filteredBookings.filter(b => b.date === tomorrow);
                break;
            case 'week':
                const weekStart = getWeekStart(new Date());
                const weekEnd = getWeekEnd(new Date());
                filteredBookings = filteredBookings.filter(b => {
                    const bookingDate = new Date(b.date);
                    return bookingDate >= weekStart && bookingDate <= weekEnd;
                });
                break;
            case 'month':
                const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                filteredBookings = filteredBookings.filter(b => {
                    const bookingDate = new Date(b.date);
                    return bookingDate >= monthStart && bookingDate <= monthEnd;
                });
                break;
        }
    }
    
    // Sort by date and time
    return filteredBookings.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
}

function updateBookingsTable() {
    const tableBody = document.querySelector('#all-bookings-table tbody');
    if (!tableBody) return;
    
    // Show table container
    const tableContainer = document.querySelector('#bookings-section .bookings-table-container');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    
    const filteredBookings = getFilteredBookings();
    
    tableBody.innerHTML = '';
    
    filteredBookings.forEach(booking => {
        const row = createBookingRow(booking, true); // true = include actions column
        tableBody.appendChild(row);
    });
    
    if (filteredBookings.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="10" style="text-align: center; color: #64748b; padding: 20px;">No bookings found</td>';
        tableBody.appendChild(row);
    }
}

function createBookingRow(booking, includeActions = false) {
    const row = document.createElement('tr');
    
    const endTime = getBookingEndTime(booking.time, booking.duration);
    const timeRange = formatTimeRange(booking.time, endTime);
    
    row.innerHTML = `
        ${includeActions ? `<td>${booking.id}</td>` : ''}
        <td>${formatDate(booking.date)}</td>
        <td>${timeRange}</td>
        <td>${booking.customer}</td>
        ${includeActions ? `<td>${booking.phone}</td>` : ''}
        <td>${booking.services.join(', ')}</td>
        ${includeActions ? `<td>${booking.duration} min</td>` : ''}
        <td>$${booking.price}</td>
        <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
        ${includeActions ? `
            <td>
                <button class="action-btn view-btn" onclick="viewBooking(${booking.id})">View</button>
                <button class="action-btn edit-btn" onclick="editBooking(${booking.id})">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteBooking(${booking.id})">Delete</button>
            </td>
        ` : ''}
    `;
    
    return row;
}