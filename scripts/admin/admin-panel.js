/**
 * ADMIN PANEL MAIN MODULE
 * Main entry point that coordinates all admin panel modules
 * Handles initialization, module setup, and responsive updates
 *
 * CHANGES: Added auto-refresh mechanism every 30 seconds to keep data in sync
 * with database changes from other sources (like client bookings)
 */

import {
  loadBusinessHours,
  initializeData,
  refreshBookings,
} from "./admin-state.js";
import { setupNavigation, initializeNavigation } from "./admin-navigation.js";
import { setupDashboard } from "./admin-dashboard.js";
import { setupBookingsSection } from "./admin-bookings.js";
import { setupCalendar } from "./admin-calendar.js";
import { setupScheduleSection } from "./admin-schedule.js";
import { setupAddBookingSection } from "./admin-add-booking.js";
import { setupModal } from "./admin-modal.js";
import "./admin-actions.js"; // Import for side effects (window functions)
import { setupBookingsEnhancements } from "./admin-bookings-enhanced.js";
import "./admin-edit-booking.js";

// Initialize admin panel when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Load saved business hours first (keeping legacy function call)
  loadBusinessHours();

  // Initialize all modules
  initializeAdminPanel();

  // Setup responsive updates
  setupResponsiveHandlers();
});

// Main initialization function exposed to window for external access
window.initAdminPanel = function () {
  initializeAdminPanel();
};

async function initializeAdminPanel() {
  // Setup all modules first (without data)
  setupNavigation();
  setupDashboard();
  setupBookingsSection();
  setupCalendar();
  setupScheduleSection();
  setupAddBookingSection();
  setupModal();

  // Initialize enhanced bookings BEFORE navigation initialization
  setupBookingsEnhancements();

  // Initialize with dashboard as default
  initializeNavigation();

  // Load data from API (will check auth first)
  await initializeData();

  // Update views with loaded data
  import("./admin-dashboard.js").then((module) => {
    module.updateDashboard();
  });

  // Add auto-refresh every 30 seconds to keep admin panel in sync
  setInterval(async () => {
    const success = await refreshBookings();
    if (success) {
      // Update current views if needed
      const currentSection = getCurrentSection();
      if (currentSection === "dashboard") {
        import("./admin-dashboard.js").then((module) => {
          module.updateDashboard();
        });
      } else if (currentSection === "calendar") {
        import("./admin-calendar.js").then((module) => {
          module.renderAdminCalendar();
        });
      } else if (currentSection === "bookings") {
        // Call enhanced function directly since it's already overridden
        if (window.updateBookingsSection) {
          window.updateBookingsSection();
        }
      }
    }
  }, 10000);
}

function setupResponsiveHandlers() {
  // Handle window resize for responsive updates
  function handleWindowResize() {
    const currentSection = getCurrentSection();

    if (currentSection === "dashboard") {
      // Dynamically import and call dashboard update
      import("./admin-dashboard.js").then((module) => {
        module.updateDashboard();
      });
    } else if (currentSection === "bookings") {
      // Call enhanced function directly since it's already overridden
      if (window.updateBookingsSection) {
        window.updateBookingsSection();
      }
    }
  }

  // Throttle resize events
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleWindowResize, 250);
  });
}

function getCurrentSection() {
  const activeSection = document.querySelector(".admin-section.active");
  return activeSection ? activeSection.id.replace("-section", "") : "dashboard";
}

/**
 * Restores admin panel state after page reload
 * This function handles the restoration of the admin panel's previous state
 * when the page is reloaded after booking operations (edit/delete).
 * It ensures users return to the same section and view they were in before.
 */

function restoreAdminState() {
  const savedState = localStorage.getItem("adminPanelState");
  console.log("Saved state from localStorage:", savedState);

  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      console.log("Parsed state:", state);
      console.log("Time difference:", Date.now() - state.timestamp);

      // Only restore if timestamp is recent (within 5 seconds)
      if (Date.now() - state.timestamp < 5000) {
        console.log("Attempting to restore section:", state.section);

        // Check if showSection exists
        if (typeof showSection === "function") {
          showSection(state.section);
          console.log("showSection called successfully");
        } else {
          console.log("showSection is not available");
        }

        // If user was viewing calendar day overview, reopen it automatically
        if (state.section === "calendar" && state.editedBookingDate) {
          console.log("Restoring calendar day:", state.editedBookingDate);
          setTimeout(() => {
            const calendarDay = document.querySelector(
              `[data-date="${state.editedBookingDate}"]`
            );
            console.log("Calendar day element found:", !!calendarDay);
            if (calendarDay) {
              calendarDay.click();
            }
          }, 1000);
        }
      } else {
        console.log("State too old, not restoring");
      }
    } catch (e) {
      console.log("Failed to restore admin state:", e.message);
      console.log("Raw localStorage value:", savedState);
    }

    localStorage.removeItem("adminPanelState");
  } else {
    console.log("No saved state found");
  }
}
