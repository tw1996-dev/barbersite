/**
 * ADMIN DASHBOARD MODULE
 * Manages the main dashboard view including revenue cards, quick stats,
 * recent bookings, and dashboard filters with responsive mobile/desktop views
 */

import { 
    currentBookings, 
    currentDashboardFilter, 
    currentDashboardMonth, 
    currentDashboardYear,
    setCurrentDashboardFilter,
    setCurrentDashboardMonth,
    setCurrentDashboardYear
} from './admin-state.js';
import { 
    getWeekStart, 
    getWeekEnd, 
    getBookingEndTime, 
    formatTimeRange, 
    formatDate 
} from './admin-utils.js';

export function setupDashboard() {
    const dashboardFilter = document.getElementById('dashboard-filter');
    if (dashboardFilter) {
        dashboardFilter.addEventListener('change', (e) => {
            setCurrentDashboardFilter(e.target.value);
            updateDashboard();
        });
    }

    // Add month selector for dashboard
    const sectionHeader = document.querySelector('#dashboard-section .section-header');
    if (sectionHeader && !document.getElementById('dashboard-month-filter')) {
        const filtersContainer = sectionHeader.querySelector('.date-filter') || 
                               document.createElement('div');
        filtersContainer.className = 'dashboard-filters';
        
        // Month selector
        const monthSelect = document.createElement('select');
        monthSelect.id = 'dashboard-month-filter';
        
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = `${currentYear}-${index}`;
            option.textContent = `${month} ${currentYear}`;
            if (index === currentMonth) option.selected = true;
            monthSelect.appendChild(option);
        });
        
        monthSelect.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            setCurrentDashboardYear(parseInt(year));
            setCurrentDashboardMonth(parseInt(month));
            updateDashboard();
        });
        
        if (!sectionHeader.querySelector('.date-filter')) {
            filtersContainer.appendChild(dashboardFilter);
        }
        filtersContainer.appendChild(monthSelect);
        
        if (!sectionHeader.querySelector('.dashboard-filters')) {
            sectionHeader.appendChild(filtersContainer);
        }
    }
}

export function updateDashboard() {
    // Show/hide revenue cards based on filter
    const todayCard = document.querySelector('.revenue-cards .revenue-card:nth-child(1)');
    const weekCard = document.querySelector('.revenue-cards .revenue-card:nth-child(2)');
    const monthCard = document.querySelector('.revenue-cards .revenue-card:nth-child(3)');
    
    if (currentDashboardFilter === 'month') {
        // Hide today and week cards, show only month
        if (todayCard) todayCard.classList.add('hidden');
        if (weekCard) weekCard.classList.add('hidden');
        if (monthCard) monthCard.classList.remove('hidden');
        
        // Update only monthly revenue
        updateRevenueCard('month', 'month');
    } else {
        // Show all cards
        if (todayCard) todayCard.classList.remove('hidden');
        if (weekCard) weekCard.classList.remove('hidden');
        if (monthCard) monthCard.classList.remove('hidden');
        
        // Update all revenue cards
        updateRevenueCard('today', 'today');
        updateRevenueCard('week', 'week');
        updateRevenueCard('month', 'month');
    }
    
    // Update quick stats
    updateQuickStats();
    
    // Update recent bookings table
    updateRecentBookingsTable();
}

function updateRevenueCard(period, dateFilter) {
    let filteredBookings = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch(period) {
        case 'today':
            if (currentDashboardFilter === 'today') {
                filteredBookings = currentBookings.filter(b => b.date === todayStr && b.status === 'confirmed');
            } else {
                const targetDate = new Date(currentDashboardYear, currentDashboardMonth, today.getDate());
                const targetDateStr = targetDate.toISOString().split('T')[0];
                filteredBookings = currentBookings.filter(b => b.date === targetDateStr && b.status === 'confirmed');
            }
            break;
        case 'week':
            if (currentDashboardFilter === 'today' || currentDashboardFilter === 'week') {
                const weekStart = getWeekStart(today);
                const weekEnd = getWeekEnd(today);
                filteredBookings = currentBookings.filter(b => {
                    const bookingDate = new Date(b.date);
                    return bookingDate >= weekStart && bookingDate <= weekEnd && b.status === 'confirmed';
                });
            } else {
                const targetDate = new Date(currentDashboardYear, currentDashboardMonth, today.getDate());
                const weekStart = getWeekStart(targetDate);
                const weekEnd = getWeekEnd(targetDate);
                filteredBookings = currentBookings.filter(b => {
                    const bookingDate = new Date(b.date);
                    return bookingDate >= weekStart && bookingDate <= weekEnd && b.status === 'confirmed';
                });
            }
            break;
        case 'month':
            const monthStart = new Date(currentDashboardYear, currentDashboardMonth, 1);
            const monthEnd = new Date(currentDashboardYear, currentDashboardMonth + 1, 0);
            filteredBookings = currentBookings.filter(b => {
                const bookingDate = new Date(b.date);
                return bookingDate >= monthStart && bookingDate <= monthEnd && b.status === 'confirmed';
            });
            break;
    }
    
    const revenue = filteredBookings.reduce((sum, booking) => sum + booking.price, 0);
    const bookingCount = filteredBookings.length;
    
    const revenueElement = document.getElementById(`${period}-revenue`);
    const bookingsElement = document.getElementById(`${period}-bookings`);
    
    if (revenueElement) revenueElement.textContent = `$${revenue}`;
    if (bookingsElement) bookingsElement.textContent = `${bookingCount} bookings`;
}

function updateQuickStats() {
    const today = new Date().toISOString().split('T')[0];
    
    // Next appointment
    const nextAppointment = findNextAppointment();
    const nextAppointmentEl = document.getElementById('next-appointment');
    if (nextAppointmentEl) {
        if (nextAppointment) {
            const endTime = getBookingEndTime(nextAppointment.time, nextAppointment.duration);
            nextAppointmentEl.textContent = `${formatTimeRange(nextAppointment.time, endTime)} - ${nextAppointment.customer}`;
        } else {
            nextAppointmentEl.textContent = 'No upcoming appointments';
        }
    }
    
    // Today's schedule
    const todayBookings = currentBookings.filter(b => b.date === today && b.status === 'confirmed');
    const todayScheduleEl = document.getElementById('today-schedule');
    if (todayScheduleEl) {
        if (todayBookings.length > 0) {
            todayScheduleEl.textContent = `${todayBookings.length} appointments scheduled`;
        } else {
            todayScheduleEl.textContent = 'No appointments today';
        }
    }
}

function findNextAppointment() {
    const now = new Date();
    const upcomingBookings = currentBookings
        .filter(b => {
            const bookingDateTime = new Date(`${b.date}T${b.time}`);
            return bookingDateTime > now && b.status === 'confirmed';
        })
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
    
    return upcomingBookings[0] || null;
}

function updateRecentBookingsTable() {
    // Check if we should show mobile or desktop view
    const isMobile = window.innerWidth <= 640;
    
    if (isMobile) {
        updateMobileBookingsView();
    } else {
        updateDesktopBookingsTable();
    }
}

function updateMobileBookingsView() {
    let mobileContainer = document.querySelector('.recent-bookings .mobile-bookings-container');
    if (!mobileContainer) {
        // Create mobile container
        mobileContainer = document.createElement('div');
        mobileContainer.className = 'mobile-bookings-container';
        
        const recentBookingsDiv = document.querySelector('.recent-bookings');
        const tableContainer = recentBookingsDiv.querySelector('.bookings-table-container');
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        recentBookingsDiv.appendChild(mobileContainer);
    }
    
    // Get recent bookings
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekEnd = getWeekEnd(today);
    
    const recentBookings = currentBookings
        .filter(b => {
            const bookingDate = new Date(b.date);
            return (b.date === todayStr || (bookingDate > today && bookingDate <= weekEnd)) && 
                   b.status === 'confirmed';
        })
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
        .slice(0, 8);
    
    mobileContainer.innerHTML = '';
    
    if (recentBookings.length === 0) {
        mobileContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No recent or upcoming bookings</p>';
        return;
    }
    
    recentBookings.forEach(booking => {
        const card = createMobileBookingCard(booking);
        mobileContainer.appendChild(card);
    });
}

function createMobileBookingCard(booking) {
    const card = document.createElement('div');
    card.className = 'booking-card';
    
    const endTime = getBookingEndTime(booking.time, booking.duration);
    const timeRange = formatTimeRange(booking.time, endTime);
    
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
            <div class="booking-price">$${booking.price}</div>
            <div class="booking-actions">
                <button class="action-btn view-btn" onclick="viewBooking(${booking.id})">View</button>
            </div>
        </div>
    `;
    
    return card;
}

function updateDesktopBookingsTable() {
    const tableBody = document.querySelector('#recent-bookings-table tbody');
    if (!tableBody) return;
    
    // Show table container
    const tableContainer = document.querySelector('.recent-bookings .bookings-table-container');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    
    // Get recent bookings
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekEnd = getWeekEnd(today);
    
    const recentBookings = currentBookings
        .filter(b => {
            const bookingDate = new Date(b.date);
            return (b.date === todayStr || (bookingDate > today && bookingDate <= weekEnd)) && 
                   b.status === 'confirmed';
        })
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
        .slice(0, 8);
    
    tableBody.innerHTML = '';
    
    recentBookings.forEach(booking => {
        const row = createBookingRow(booking, false);
        tableBody.appendChild(row);
    });
    
    if (recentBookings.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">No recent or upcoming bookings</td>';
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
        <td>${booking.price}</td>
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