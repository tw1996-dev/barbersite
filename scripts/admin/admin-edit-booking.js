/**
 * ADMIN EDIT BOOKING MODULE
 * Lightweight edit functionality that leverages existing Add Booking infrastructure
 * Follows DRY principle by reusing existing functions where possible
 */

import {
  currentBookings,
  currentSection,
  setSelectedAddBookingDate,
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

// Edit mode state - minimal state management
let isEditMode = false;
let editingBookingId = null;
let previousSection = null;
let editingBookingData = null; // Store original booking data
let originalEventHandlers = new Map(); // Store original handlers for cleanup

// Service name mapping for database to UI conversion
const SERVICE_MAPPING = {
  "Premium Haircut": "premium-haircut",
  "Beard Trim & Style": "beard-trim",
  "Hot Towel Shave": "hot-towel-shave",
  "Head Shave": "head-shave",
  "Mustache Trim": "mustache-trim",
  "Haircut + Beard Package": "haircut-beard-package",
};

// Update booking via API - matches addBooking pattern with proper error handling
async function updateBooking(bookingId, bookingData) {
  try {
    console.log(`Updating booking ID: ${bookingId}`);
    console.log("Booking data being sent:", bookingData);

    const formattedData = {
      ...bookingData,
      services: JSON.stringify(bookingData.services), // Format for database storage
    };

    console.log("Formatted data for API:", formattedData);

    const response = await fetch(`/api/booking/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
    });

    console.log("API Response status:", response.status);

    if (response.ok) {
      const updatedBooking = await response.json();
      console.log("Successfully updated booking:", updatedBooking);
      await refreshBookings(); // Reload all bookings from API to sync
      return updatedBooking;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error:", errorData);
      throw new Error(
        errorData.error || `Failed to update booking (${response.status})`
      );
    }
  } catch (error) {
    console.error("Error updating booking:", error);
    throw error; // Re-throw to handle in calling function
  }
}

// Start edit booking process - main entry point
export function startEditBooking(bookingId) {
  const booking = currentBookings.find((b) => b.id === bookingId);
  if (!booking) {
    showNotification("Booking not found!", "error");
    return;
  }

  // Store edit state
  isEditMode = true;
  editingBookingId = bookingId;
  previousSection = currentSection;

  // Switch to add-booking section
  showSection("add-booking");

  // Setup edit mode after section loads
  setTimeout(() => setupEditMode(booking), 100);
}

// Setup edit mode - orchestrates all edit setup steps
function setupEditMode(booking) {
  // Store booking data for reference
  editingBookingData = { ...booking };

  updateUIForEditMode();
  populateForm(booking);
  setupCalendarAndTimeSlot(booking);
  attachEditEventHandlers();
}

// Update UI for edit mode - minimal UI changes
function updateUIForEditMode() {
  const sectionTitle = document.querySelector("#add-booking-section h2");
  const saveBtn = document.getElementById("save-booking-btn");
  const resetBtn = document.getElementById("reset-form-btn");

  if (sectionTitle) sectionTitle.textContent = "Edit Booking";
  if (saveBtn) {
    saveBtn.textContent = "Update Booking";
    saveBtn.className = "save-btn edit-btn";
  }
  if (resetBtn) {
    resetBtn.textContent = "Cancel";
    resetBtn.className = "cancel-btn";
  }

  addEditModeIndicator();
}

// Add visual indicator for edit mode
function addEditModeIndicator() {
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

// Populate form with booking data - streamlined approach
function populateForm(booking) {
  // Populate basic fields
  const fields = {
    "customer-name": booking.customer,
    "customer-phone": booking.phone,
    "customer-email": booking.email,
    "admin-notes": booking.notes,
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value || "";
  });

  // Populate services using existing change handlers
  populateServices(booking.services);

  // Update summary using local implementation
  updateBookingSummary();
}

// Populate service checkboxes and trigger change events
function populateServices(services) {
  // Clear all checkboxes first
  document
    .querySelectorAll('input[name="admin-services"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });

  // Check appropriate services
  if (services?.length > 0) {
    services.forEach((serviceName) => {
      const checkboxValue = SERVICE_MAPPING[serviceName] || serviceName;
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
}

// Setup calendar and time slot selection - reuses existing functions
function setupCalendarAndTimeSlot(booking) {
  const date = new Date(booking.date + "T00:00:00");

  // Set calendar state
  setAddBookingCalendarMonth(date.getMonth());
  setAddBookingCalendarYear(date.getFullYear());
  setSelectedAddBookingDate(booking.date);

  // Render calendar and select date/time
  renderAddBookingCalendar();

  setTimeout(() => {
    selectCalendarDate(booking.date);
    setTimeout(() => selectTimeSlot(booking.time), 100);
  }, 200);
}

// Select calendar date - reuses existing click handler
function selectCalendarDate(dateStr) {
  const calendarDay = document.querySelector(
    `.admin-calendar-day[data-date="${dateStr}"]`
  );
  if (calendarDay) calendarDay.click();
}

// Select time slot - reuses existing click handler
function selectTimeSlot(time) {
  const timeSlot = document.querySelector(
    `.admin-time-slot[data-time="${time}"]`
  );
  if (timeSlot) timeSlot.click();
}

// Attach edit-specific event handlers - cleaner approach than cloning
function attachEditEventHandlers() {
  const saveBtn = document.getElementById("save-booking-btn");
  const resetBtn = document.getElementById("reset-form-btn");

  // Store original handlers for cleanup
  if (saveBtn) {
    originalEventHandlers.set("save", saveBtn.onclick);
    saveBtn.onclick = handleEditSave;
  }
  if (resetBtn) {
    originalEventHandlers.set("reset", resetBtn.onclick);
    resetBtn.onclick = handleEditCancel;
  }
}

// Handle saving edited booking
async function handleEditSave() {
  const formData = collectFormData();
  if (!validateFormData(formData)) return;

  const bookingData = prepareBookingData(formData);

  // Show loading state
  const saveBtn = document.getElementById("save-booking-btn");
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "Updating...";
  saveBtn.disabled = true;

  try {
    console.log(`Attempting to update booking ID: ${editingBookingId}`);
    const result = await updateBooking(editingBookingId, bookingData);

    if (result) {
      showNotification("Booking updated successfully!", "success");
      exitEditMode();
    } else {
      showNotification("Failed to update booking. Please try again.", "error");
    }
  } catch (error) {
    console.error("Error in handleEditSave:", error);

    // Show specific error message from API if available
    const errorMessage =
      error.message || "An error occurred while updating the booking.";
    showNotification(errorMessage, "error");

    // Don't exit edit mode on error so user can try again
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

// Update booking summary - local implementation since not exported from add-booking
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
  if (priceEl) priceEl.textContent = `${totalPrice}`;
}
function collectFormData() {
  const selectedDate =
    setSelectedAddBookingDate ||
    document.querySelector(".admin-calendar-day.selected")?.dataset?.date;

  const selectedServices = Array.from(
    document.querySelectorAll('input[name="admin-services"]:checked')
  );

  return {
    customer: document.getElementById("customer-name")?.value.trim(),
    phone: document.getElementById("customer-phone")?.value.trim(),
    email: document.getElementById("customer-email")?.value.trim(),
    date: selectedDate,
    time: document.getElementById("booking-time")?.value,
    notes: document.getElementById("admin-notes")?.value.trim(),
    selectedServices,
    services: selectedServices.map((checkbox) => checkbox.value),
  };
}

// Validate form data - centralized validation with better error messages
function validateFormData(formData) {
  const missingFields = [];

  if (!formData.customer) missingFields.push("Customer name");
  if (!formData.phone) missingFields.push("Phone number");
  if (!formData.date) missingFields.push("Date");
  if (!formData.time) missingFields.push("Time");
  if (!formData.services || formData.services.length === 0)
    missingFields.push("Services");

  if (missingFields.length > 0) {
    console.log("Validation failed. Missing fields:", missingFields);
    console.log("Current form data:", formData);
    showNotification(
      `Missing required fields: ${missingFields.join(", ")}`,
      "error"
    );
    return false;
  }
  return true;
}

// Prepare booking data for API - centralized data preparation with debug
function prepareBookingData(formData) {
  const totalDuration = formData.selectedServices.reduce(
    (sum, checkbox) => sum + parseInt(checkbox.getAttribute("data-duration")),
    0
  );
  const totalPrice = formData.selectedServices.reduce(
    (sum, checkbox) => sum + parseInt(checkbox.getAttribute("data-price")),
    0
  );

  const bookingData = {
    customer: formData.customer,
    phone: formData.phone,
    email: formData.email || "",
    date: formData.date,
    time: formData.time,
    notes: formData.notes || "",
    services: formData.services,
    duration: totalDuration,
    price: totalPrice,
    status: "confirmed",
  };

  console.log("Prepared booking data:", bookingData);
  return bookingData;
}

// Handle canceling edit mode
function handleEditCancel() {
  exitEditMode();
}

// Exit edit mode and cleanup - comprehensive cleanup
function exitEditMode() {
  // Clear edit state
  isEditMode = false;
  editingBookingId = null;

  // Remove UI changes
  removeEditModeIndicator();
  resetUIToNormalState();
  restoreEventHandlers();

  // Return to previous section
  const targetSection = previousSection || "bookings";
  previousSection = null;

  showSection(targetSection);

  // Update target section with fresh data
  setTimeout(() => updateTargetSection(targetSection), 100);
}

// Remove edit mode indicator
function removeEditModeIndicator() {
  const indicator = document.getElementById("edit-mode-indicator");
  if (indicator) indicator.remove();
}

// Reset UI to normal state
function resetUIToNormalState() {
  const sectionTitle = document.querySelector("#add-booking-section h2");
  const saveBtn = document.getElementById("save-booking-btn");
  const resetBtn = document.getElementById("reset-form-btn");

  if (sectionTitle) sectionTitle.textContent = "Add New Booking";
  if (saveBtn) {
    saveBtn.textContent = "Create Booking";
    saveBtn.className = "save-btn";
  }
  if (resetBtn) {
    resetBtn.textContent = "Reset Form";
    resetBtn.className = "cancel-btn";
  }
}

// Restore original event handlers - proper cleanup
function restoreEventHandlers() {
  const saveBtn = document.getElementById("save-booking-btn");
  const resetBtn = document.getElementById("reset-form-btn");

  if (saveBtn) saveBtn.onclick = originalEventHandlers.get("save") || null;
  if (resetBtn) resetBtn.onclick = originalEventHandlers.get("reset") || null;

  originalEventHandlers.clear();
}

// Update target section after exiting edit mode
function updateTargetSection(targetSection) {
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
}

// Public API for other modules
export function isInEditMode() {
  return isEditMode;
}

export function getEditingBookingId() {
  return editingBookingId;
}
