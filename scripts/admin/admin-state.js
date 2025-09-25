/**
 * ADMIN STATE MANAGEMENT MODULE
 * Manages all global state variables and configuration for the admin panel
 * Handles business hours, bookings data, current section state, and calendar states
 *
 * CHANGES: Added refreshBookings() function and updated CRUD operations to reload data
 * after each operation to maintain sync between frontend and database
 */

function normalizeBookingData(bookings) {
  return bookings.map((booking) => ({
    ...booking,
    date: booking.date.split("T")[0], // '2025-09-15T00:00:00.000Z' → '2025-09-15'
    time: booking.time.substring(0, 5), // '09:00:00' → '09:00'
  }));
}

// API functions for data fetching
async function fetchBookings() {
  try {
    const response = await fetch("/api/bookings");
    const data = await response.json();
    return normalizeBookingData(data);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
}

async function fetchBusinessHours() {
  try {
    const response = await fetch("/api/business-hours");
    const data = await response.json();

    // Convert array to object format expected by the app
    const hours = {};
    data.forEach((day) => {
      hours[day.day_name] = {
        enabled: day.enabled,
        open: day.open_time.substring(0, 5), // "09:00:00" -> "09:00"
        close: day.close_time.substring(0, 5),
        overtime_buffer_minutes: day.overtime_buffer_minutes || 0, // Add buffer support
      };
    });
    return hours;
  } catch (error) {
    console.error("Error fetching business hours:", error);
    return businessHours; // fallback to default
  }
}

// Refresh bookings from API - ensures frontend stays in sync with database
export async function refreshBookings() {
  try {
    const response = await fetch("/api/bookings");
    if (response.ok) {
      const rawBookings = await response.json();
      currentBookings = normalizeBookingData(rawBookings);
      return true;
    }
  } catch (error) {
    console.error("Error refreshing bookings:", error);
  }
  return false;
}

// Business hours configuration - default values
export let businessHours = {
  monday: {
    enabled: true,
    open: "09:00",
    close: "18:00",
    overtime_buffer_minutes: 0,
  },
  tuesday: {
    enabled: true,
    open: "09:00",
    close: "18:00",
    overtime_buffer_minutes: 0,
  },
  wednesday: {
    enabled: true,
    open: "09:00",
    close: "18:00",
    overtime_buffer_minutes: 0,
  },
  thursday: {
    enabled: true,
    open: "09:00",
    close: "18:00",
    overtime_buffer_minutes: 0,
  },
  friday: {
    enabled: true,
    open: "09:00",
    close: "18:00",
    overtime_buffer_minutes: 0,
  },
  saturday: {
    enabled: true,
    open: "10:00",
    close: "16:00",
    overtime_buffer_minutes: 0,
  },
  sunday: {
    enabled: false,
    open: "11:00",
    close: "15:00",
    overtime_buffer_minutes: 0,
  },
};

// Current state variables
export let currentBookings = [];
export let currentSection = "dashboard";
export let currentCalendarMonth = new Date().getMonth();
export let currentCalendarYear = new Date().getFullYear();
export let selectedBooking = null;
export let currentDashboardFilter = "today";
export let currentDashboardMonth = new Date().getMonth();
export let currentDashboardYear = new Date().getFullYear();

// Add booking state
export let addBookingCalendarMonth = new Date().getMonth();
export let addBookingCalendarYear = new Date().getFullYear();
export let selectedAddBookingDate = null;
export let selectedAdminServices = new Set();

// Initialize data from API - only after authentication
export async function initializeData() {
  // Check if user is authenticated first
  try {
    const authResponse = await fetch("/api/auth/verify", {
      method: "POST",
      credentials: "include",
    });

    if (!authResponse.ok) {
      // User not authenticated - use default data
      console.log("Not authenticated, using default data");
      return;
    }
  } catch (error) {
    console.log("Auth check failed, using default data");
    return;
  }

  // User is authenticated - load data from API
  currentBookings = await fetchBookings();
  businessHours = await fetchBusinessHours();
}

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

// Add booking to current bookings and sync with API - refreshes data after operation
export async function addBooking(booking) {
  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(booking),
    });

    if (response.ok) {
      const newBooking = await response.json();
      await refreshBookings(); // Reload all bookings from API
      return newBooking;
    } else {
      throw new Error("Failed to add booking");
    }
  } catch (error) {
    console.error("Error adding booking:", error);
    return null;
  }
}

// Remove booking from current bookings and sync with API - refreshes data after operation
export async function removeBooking(bookingId) {
  try {
    const response = await fetch(`/api/booking/${bookingId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await refreshBookings(); // Reload all bookings from API
      return true;
    } else {
      throw new Error("Failed to delete booking");
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    return false;
  }
}

// Save business hours to API
export async function saveBusinessHoursToAPI() {
  try {
    const response = await fetch("/api/business-hours", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(businessHours),
    });

    if (response.ok) {
      return true;
    } else {
      throw new Error("Failed to save business hours");
    }
  } catch (error) {
    console.error("Error saving business hours:", error);
    return false;
  }
}

// Legacy localStorage functions (kept for backward compatibility)
export function loadBusinessHours() {
  // Now loads from API during initializeData()
}

export function saveBusinessHoursToStorage() {
  // Now saves to API via saveBusinessHoursToAPI()
  return saveBusinessHoursToAPI();
}

export let isEditMode = false;
export let editingBookingId = null;
export let previousSection = null;

// Debug support - expose currentBookings to window
if (typeof window !== "undefined") {
  window.currentBookings = currentBookings;
}
