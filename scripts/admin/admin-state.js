/**
 * ADMIN STATE MANAGEMENT MODULE
 * Manages all global state variables and configuration for the admin panel
 * Handles business hours, bookings data, current section state, and calendar states
 */

import { mockBookings } from './mockbookings.js';

// Business hours configuration
export let businessHours = {
    monday: { enabled: true, open: "09:00", close: "18:00" },
    tuesday: { enabled: true, open: "09:00", close: "18:00" },
    wednesday: { enabled: true, open: "09:00", close: "18:00" },
    thursday: { enabled: true, open: "09:00", close: "18:00" },
    friday: { enabled: true, open: "09:00", close: "18:00" },
    saturday: { enabled: true, open: "10:00", close: "16:00" },
    sunday: { enabled: false, open: "11:00", close: "15:00" }
};

// Current state variables
export let currentBookings = [...mockBookings];
export let currentSection = 'dashboard';
export let currentCalendarMonth = new Date().getMonth();
export let currentCalendarYear = new Date().getFullYear();
export let selectedBooking = null;
export let currentDashboardFilter = 'today';
export let currentDashboardMonth = new Date().getMonth();
export let currentDashboardYear = new Date().getFullYear();

// Add booking state
export let addBookingCalendarMonth = new Date().getMonth();
export let addBookingCalendarYear = new Date().getFullYear();
export let selectedAddBookingDate = null;
export let selectedAdminServices = new Set();

// State setters
export function setBusinessHours(newBusinessHours) {
    businessHours = newBusinessHours;
}

export function setCurrentBookings(newBookings) {
    currentBookings = newBookings;
}

export function setCurrentSection(section) {
    currentSection = section;
}

export function setCurrentCalendarMonth(month) {
    currentCalendarMonth = month;
}

export function setCurrentCalendarYear(year) {
    currentCalendarYear = year;
}

export function setSelectedBooking(booking) {
    selectedBooking = booking;
}

export function setCurrentDashboardFilter(filter) {
    currentDashboardFilter = filter;
}

export function setCurrentDashboardMonth(month) {
    currentDashboardMonth = month;
}

export function setCurrentDashboardYear(year) {
    currentDashboardYear = year;
}

export function setAddBookingCalendarMonth(month) {
    addBookingCalendarMonth = month;
}

export function setAddBookingCalendarYear(year) {
    addBookingCalendarYear = year;
}

export function setSelectedAddBookingDate(date) {
    selectedAddBookingDate = date;
}

export function setSelectedAdminServices(services) {
    selectedAdminServices = services;
}

// Add booking to current bookings
export function addBooking(booking) {
    currentBookings.push(booking);
}

// Remove booking from current bookings
export function removeBooking(bookingId) {
    currentBookings = currentBookings.filter(b => b.id !== bookingId);
}

// Load saved business hours
export function loadBusinessHours() {
    try {
        const saved = localStorage.getItem('elite_barber_business_hours');
        if (saved) {
            businessHours = JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Could not load saved business hours:', error);
    }
}

// Save business hours to localStorage
export function saveBusinessHoursToStorage() {
    try {
        localStorage.setItem('elite_barber_business_hours', JSON.stringify(businessHours));
        return true;
    } catch (error) {
        console.warn('Could not save business hours:', error);
        return false;
    }
}