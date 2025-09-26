/**
 * ADMIN ACTIONS MODULE
 * Handles booking-related actions like view, edit, and delete operations
 * Provides global window functions for HTML onclick handlers
 */

import {
  currentBookings,
  currentSection,
  setSelectedBooking,
  removeBooking,
} from "./admin-state.js";
import {
  getBookingEndTime,
  formatTimeRange,
  formatFullDate,
  showNotification,
} from "./admin-utils.js";
import { showModal } from "./admin-modal.js";
import { updateDashboard } from "./admin-dashboard.js";
import { updateBookingsSection } from "./admin-bookings.js";
import { renderAdminCalendar } from "./admin-calendar.js";
import { startEditBooking } from "./admin-edit-booking.js";

// Global booking actions exposed to window for HTML onclick handlers
window.viewBooking = function (bookingId) {
  const booking = currentBookings.find((b) => b.id === bookingId);
  if (!booking) return;

  setSelectedBooking(booking);

  const endTime = getBookingEndTime(booking.time, booking.duration);
  const timeRange = formatTimeRange(booking.time, endTime);

  const content = `
        <div style="line-height: 1.6;">
            <p><strong>Customer:</strong> ${booking.customer}</p>
            <p><strong>Phone:</strong> ${booking.phone}</p>
            ${
              booking.email
                ? `<p><strong>Email:</strong> ${booking.email}</p>`
                : ""
            }
            <p><strong>Date:</strong> ${formatFullDate(booking.date)}</p>
            <p><strong>Time:</strong> ${timeRange}</p>
            <p><strong>Services:</strong> ${booking.services.join(", ")}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p><strong>Price:</strong> $${booking.price}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${
              booking.status
            }">${booking.status}</span></p>
            ${
              booking.notes
                ? `<p><strong>Notes:</strong> ${booking.notes}</p>`
                : ""
            }
        </div>
    `;

  showModal("Booking Details", content);
};

window.editBooking = function (bookingId) {
  const booking = currentBookings.find((b) => b.id === bookingId);
  if (!booking) {
    showNotification("Booking not found!", "error");
    return;
  }

  // Use the new edit booking functionality
  startEditBooking(bookingId);
};

window.deleteBooking = function (bookingId) {
  if (
    confirm(
      "Are you sure you want to delete this booking? This action cannot be undone."
    )
  ) {
    removeBooking(bookingId);

    // Close Day Overview modal if open
    const closeBtn = document.querySelector("#modal-close-btn");
    if (closeBtn) {
      closeBtn.click(); // Użyj normalnej logiki zamykania
    }

    showNotification("Booking deleted successfully!", "success");

    // Update current view
    if (currentSection === "bookings") updateBookingsSection();
    if (currentSection === "dashboard") updateDashboard();
    if (currentSection === "calendar") renderAdminCalendar();
  }
};
