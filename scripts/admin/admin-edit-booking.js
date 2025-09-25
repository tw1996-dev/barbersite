/**
 * ADMIN EDIT BOOKING MODULE
 * Handles booking editing functionality without modifying existing code
 * Provides edit mode for the Add Booking form with pre-populated data
 */

import {
  currentBookings,
  currentSection,
  setCurrentSection,
  setSelectedAddBookingDate,
  setSelectedAdminServices,
  setAddBookingCalendarMonth,
  setAddBookingCalendarYear,
  refreshBookings,
} from "./admin-state.js";
import { showSection } from "./admin-navigation.js";
import { renderAddBookingCalendar } from "./admin-add-booking.js";
import { updateDashboard } from "./admin-dashboard.js";
import { updateBookingsSection } from "./admin-bookings.js";
import { renderAdminCalendar } from "./admin-calendar.js";
import { showNotification } from "./admin-utils.js";

// Edit mode state - isolated from main application state
let isEditMode = false;
let editingBookingId = null;
let previousSection = null;
let editingBookingData = null;

// Update booking via API - similar pattern to addBooking but with PUT
async function updateBooking(bookingId, bookingData) {
  try {
    const response = await fetch(`/api/booking/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    });

    if (response.ok) {
      const updatedBooking = await response.json();
      await refreshBookings(); // Reload all bookings from API to sync
      return updatedBooking;
    } else {
      throw new Error("Failed to update booking");
    }
  } catch (error) {
    console.error("Error updating booking:", error);
    return null;
  }
}

// Start edit booking process - main entry point called from admin-actions.js
export function startEditBooking(bookingId) {
  const booking = currentBookings.find((b) => b.id === bookingId);
  if (!booking) {
    showNotification("Booking not found!", "error");
    return;
  }

  // Store edit state
  isEditMode = true;
  editingBookingId = bookingId;
  previousSection = currentSection; // Remember where we came from
  editingBookingData = { ...booking }; // Create copy of original data

  // Switch to add-booking section
  showSection("add-booking");

  // Wait for section to load then setup edit mode
  setTimeout(() => {
    setupEditMode(booking);
  }, 100);
}

// Setup the Add Booking form for edit mode
function setupEditMode(booking) {
  // Change UI to edit mode
  updateUIForEditMode();

  // Populate form with booking data
  populateEditForm(booking);

  // Setup calendar with booking date
  setupEditCalendar(booking.date);

  // Setup event handlers for edit mode
  setupEditEventHandlers();
}

// Update UI elements for edit mode
function updateUIForEditMode() {
  // Change section title
  const sectionTitle = document.querySelector("#add-booking-section h2");
  if (sectionTitle) {
    sectionTitle.textContent = "Edit Booking";
  }

  // Change save button text and functionality
  const saveBtn = document.getElementById("save-booking-btn");
  if (saveBtn) {
    saveBtn.textContent = "Update Booking";
    saveBtn.className = "save-btn edit-btn"; // Green styling
  }

  // Change reset button to cancel
  const resetBtn = document.getElementById("reset-form-btn");
  if (resetBtn) {
    resetBtn.textContent = "Cancel";
    resetBtn.className = "cancel-btn";
  }

  // Add edit mode indicator
  const formHeader = document.querySelector(
    "#add-booking-section .section-header"
  );
  if (formHeader && !document.getElementById("edit-mode-indicator")) {
    const indicator = document.createElement("div");
    indicator.id = "edit-mode-indicator";
    indicator.innerHTML = `
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); 
                        border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; color: #3b82f6; 
                        font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                <span>✏️</span>
                <span>Editing Booking #${editingBookingId}</span>
            </div>
        `;
    formHeader.appendChild(indicator);
  }
}

// Populate form fields with booking data
function populateEditForm(booking) {
  // Customer information
  const customerName = document.getElementById("customer-name");
  const customerPhone = document.getElementById("customer-phone");
  const customerEmail = document.getElementById("customer-email");
  const adminNotes = document.getElementById("admin-notes");

  if (customerName) customerName.value = booking.customer || "";
  if (customerPhone) customerPhone.value = booking.phone || "";
  if (customerEmail) customerEmail.value = booking.email || "";
  if (adminNotes) adminNotes.value = booking.notes || "";

  // Services - check the appropriate checkboxes using VALUE attribute with mapping
  document
    .querySelectorAll('input[name="admin-services"]')
    .forEach((checkbox) => {
      checkbox.checked = false; // Clear all first
    });

  if (booking.services && booking.services.length > 0) {
    const serviceMapping = {
      "Premium Haircut": "premium-haircut",
      "Beard Trim & Style": "beard-trim",
      "Hot Towel Shave": "hot-towel-shave",
      "Head Shave": "head-shave",
      "Mustache Trim": "mustache-trim",
      "Haircut + Beard Package": "haircut-beard-package",
    };

    booking.services.forEach((serviceName) => {
      // Use mapping to convert full name to checkbox value
      const checkboxValue = serviceMapping[serviceName] || serviceName;
      const checkbox = document.querySelector(
        `input[name="admin-services"][value="${checkboxValue}"]`
      );
      if (checkbox) {
        checkbox.checked = true;
        // Trigger change event to update conflicts and summary
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  // Update booking summary with selected services
  updateBookingSummary();
}

// Setup calendar for edit mode with pre-selected date
function setupEditCalendar(bookingDate) {
  const date = new Date(bookingDate + "T00:00:00"); // Ensure proper date parsing
  const month = date.getMonth();
  const year = date.getFullYear();

  // Set calendar to booking's month/year
  setAddBookingCalendarMonth(month);
  setAddBookingCalendarYear(year);

  // Set selected date
  setSelectedAddBookingDate(bookingDate);

  // Re-render calendar with new date
  renderAddBookingCalendar();

  // After calendar renders, select the date and time slot
  setTimeout(() => {
    // Select the calendar day
    const calendarDays = document.querySelectorAll(".admin-calendar-day");
    calendarDays.forEach((day) => {
      if (day.dataset.date === bookingDate) {
        day.click(); // This will trigger day selection and show time slots
      }
    });

    // After day is selected, select the time slot
    setTimeout(() => {
      selectTimeSlotForEdit(editingBookingData.time);
    }, 100);
  }, 200);
}

// Select the time slot that matches the booking's time
function selectTimeSlotForEdit(bookingTime) {
  const timeSlots = document.querySelectorAll(".admin-time-slot");
  timeSlots.forEach((slot) => {
    if (slot.dataset.time === bookingTime) {
      slot.click(); // This will trigger the existing selectTimeSlot function
    }
  });
}

// Update booking summary - reuse existing function
function updateBookingSummary() {
  const checkboxes = document.querySelectorAll(
    'input[name="admin-services"]:checked'
  );
  let totalDuration = 0;
  let totalPrice = 0;

  checkboxes.forEach((checkbox) => {
    totalDuration += parseInt(checkbox.getAttribute("data-duration"));
    totalPrice += parseInt(checkbox.getAttribute("data-price"));
  });

  const durationEl = document.getElementById("admin-total-duration");
  const priceEl = document.getElementById("admin-total-price");

  if (durationEl) durationEl.textContent = `${totalDuration} min`;
  if (priceEl) priceEl.textContent = `$${totalPrice}`;
}

// Setup event handlers specific to edit mode
function setupEditEventHandlers() {
  const saveBtn = document.getElementById("save-booking-btn");
  const resetBtn = document.getElementById("reset-form-btn");

  if (saveBtn) {
    // Remove existing event listeners and add edit-specific one
    saveBtn.replaceWith(saveBtn.cloneNode(true));
    const newSaveBtn = document.getElementById("save-booking-btn");
    newSaveBtn.addEventListener("click", handleEditSave);
  }

  if (resetBtn) {
    // Remove existing event listeners and add cancel-specific one
    resetBtn.replaceWith(resetBtn.cloneNode(true));
    const newResetBtn = document.getElementById("reset-form-btn");
    newResetBtn.addEventListener("click", handleEditCancel);
  }
}

// Handle saving edited booking
async function handleEditSave() {
  // Get date from multiple sources as fallback
  const selectedDate =
    selectedAddBookingDate ||
    document.querySelector(".admin-calendar-day.selected")?.dataset?.date ||
    editingBookingData?.date;

  // Collect form data
  const formData = {
    customer: document.getElementById("customer-name")?.value.trim(),
    phone: document.getElementById("customer-phone")?.value.trim(),
    email: document.getElementById("customer-email")?.value.trim(),
    date: selectedDate,
    time: document.getElementById("booking-time")?.value,
    notes: document.getElementById("admin-notes")?.value.trim(),
  };

  // Collect selected services
  const selectedServices = Array.from(
    document.querySelectorAll('input[name="admin-services"]:checked')
  );
  const services = selectedServices.map((checkbox) => checkbox.value);

  // Calculate totals
  const totalDuration = selectedServices.reduce(
    (sum, checkbox) => sum + parseInt(checkbox.getAttribute("data-duration")),
    0
  );
  const totalPrice = selectedServices.reduce(
    (sum, checkbox) => sum + parseInt(checkbox.getAttribute("data-price")),
    0
  );

  // Validation
  if (
    !formData.customer ||
    !formData.phone ||
    !formData.date ||
    !formData.time ||
    services.length === 0
  ) {
    showNotification(
      "Please fill in all required fields and select at least one service.",
      "error"
    );
    return;
  }

  // Prepare booking data for API
  const bookingData = {
    ...formData,
    services: services,
    duration: totalDuration,
    price: totalPrice,
    status: "confirmed", // Keep existing status or default to confirmed
  };

  // Show loading state
  const saveBtn = document.getElementById("save-booking-btn");
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Updating...";
  saveBtn.disabled = true;

  try {
    // Update booking via API
    const result = await updateBooking(editingBookingId, bookingData);

    if (result) {
      showNotification("Booking updated successfully!", "success");
      exitEditMode();
    } else {
      showNotification("Failed to update booking. Please try again.", "error");
    }
  } catch (error) {
    console.error("Error updating booking:", error);
    showNotification("An error occurred while updating the booking.", "error");
  } finally {
    // Restore button state
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

// Handle canceling edit mode
function handleEditCancel() {
  exitEditMode();
}

// Exit edit mode and return to previous section
function exitEditMode() {
  // Clear edit state
  isEditMode = false;
  editingBookingId = null;
  editingBookingData = null;

  // Remove edit mode indicator
  const indicator = document.getElementById("edit-mode-indicator");
  if (indicator) {
    indicator.remove();
  }

  // Reset UI to normal state
  const sectionTitle = document.querySelector("#add-booking-section h2");
  if (sectionTitle) {
    sectionTitle.textContent = "Add New Booking";
  }

  const saveBtn = document.getElementById("save-booking-btn");
  if (saveBtn) {
    saveBtn.textContent = "Create Booking";
    saveBtn.className = "save-btn";
  }

  const resetBtn = document.getElementById("reset-form-btn");
  if (resetBtn) {
    resetBtn.textContent = "Reset Form";
    resetBtn.className = "cancel-btn";
  }

  // Return to previous section and update views
  const targetSection = previousSection || "bookings";
  previousSection = null;

  showSection(targetSection);

  // Update the target section with fresh data
  setTimeout(() => {
    switch (targetSection) {
      case "dashboard":
        updateDashboard();
        break;
      case "bookings":
        updateBookingsSection();
        break;
      case "calendar":
        renderAdminCalendar();
        break;
    }
  }, 100);
}

// Check if currently in edit mode - can be used by other modules
export function isInEditMode() {
  return isEditMode;
}

// Get current editing booking ID - can be used by other modules
export function getEditingBookingId() {
  return editingBookingId;
}

// Debug support - expose for console access
if (typeof window !== "undefined") {
  window.populateEditForm = populateEditForm;
}
