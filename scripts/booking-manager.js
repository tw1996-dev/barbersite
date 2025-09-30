/**
 * BOOKING MANAGER FRONTEND
 *
 * Handles the booking-manager.html page functionality.
 * Manages booking data retrieval, display, and cancellation through token-based API.
 *
 * Features:
 * - Extract token from URL parameters
 * - Fetch booking data from API using token
 * - Display booking information in UI
 * - Handle booking cancellation with confirmation
 * - Manage different UI states (loading, success, error)
 * - Calendar integration with real booking data
 *
 * UI States:
 * - Loading: Shows spinner while fetching data
 * - Success: Displays booking details with management options
 * - Error: Shows error message for invalid/expired tokens
 * - Cancelled: Shows confirmation after successful cancellation
 */

document.addEventListener("DOMContentLoaded", function () {
  // Get DOM elements
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const bookingManager = document.getElementById("booking-manager");
  const cancelModal = document.getElementById("cancel-modal");

  // Global booking data
  let currentBooking = null;
  let currentToken = null;

  // Initialize the page
  init();

  /**
   * Initialize booking manager page
   * Extract token from URL and load booking data
   */
  function init() {
    currentToken = extractTokenFromURL();

    if (!currentToken) {
      showErrorState("Invalid or missing management link");
      return;
    }

    loadBookingData();
  }

  /**
   * Extract booking management token from URL parameters
   * @returns {string|null} Token if found, null otherwise
   */
  function extractTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      console.error("No token found in URL");
      return null;
    }

    // Basic token format validation (UUID v4)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      console.error("Invalid token format");
      return null;
    }

    return token;
  }

  /**
   * Fetch booking data from API using management token
   * Updates UI based on API response
   */
  async function loadBookingData() {
    try {
      showLoadingState();

      const response = await fetch(`/api/manage/${currentToken}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.booking) {
        currentBooking = data.booking;
        showBookingData(data.booking);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error loading booking data:", error);
      showErrorState(`Unable to load booking: ${error.message}`);
    }
  }

  /**
   * Display booking data in the UI
   * Populates all booking fields with real data
   * @param {Object} booking - Booking data from API
   */
  function showBookingData(booking) {
    // Update booking details
    document.getElementById("booking-id").textContent = `#${booking.id}`;
    document.getElementById("booking-services").textContent =
      booking.services.join(", ");
    document.getElementById("booking-date").textContent = booking.formattedDate;
    document.getElementById(
      "booking-time"
    ).textContent = `${booking.time} - ${booking.endTime}`;
    document.getElementById("booking-total").textContent = `$${booking.price}`;

    // Update cancel button availability
    const cancelBtn = document.querySelector(".cancel-booking-btn");
    if (cancelBtn) {
      if (booking.canCancel) {
        cancelBtn.style.display = "flex";
      } else {
        cancelBtn.style.display = "none";
        // Add note about cancellation not being available
        const actionsSection = document.querySelector(".booking-actions");
        if (actionsSection) {
          actionsSection.innerHTML = `
            <div class="confirmation-contact-details">
              <p style="text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 15px;">
                📅 Appointment has started or passed - cancellation no longer available
              </p>
            </div>
          `;
        }
      }
    }

    // Show the booking manager interface
    hideAllStates();
    bookingManager.style.display = "block";
  }

  /**
   * Show loading state while fetching data
   */
  function showLoadingState() {
    hideAllStates();
    loadingState.style.display = "block";
  }

  /**
   * Show error state with custom message
   * @param {string} message - Error message to display
   */
  function showErrorState(message) {
    hideAllStates();

    // Update error message if provided
    if (message) {
      const errorContent = errorState.querySelector(".booking-info p");
      if (errorContent) {
        errorContent.textContent = message;
      }
    }

    errorState.style.display = "block";
  }

  /**
   * Hide all UI states (loading, error, manager, modal)
   */
  function hideAllStates() {
    loadingState.style.display = "none";
    errorState.style.display = "none";
    bookingManager.style.display = "none";
    cancelModal.style.display = "none";
  }

  /**
   * Show cancellation confirmation modal
   */
  window.cancelBooking = function () {
    if (!currentBooking || !currentBooking.canCancel) {
      alert("This booking cannot be cancelled.");
      return;
    }

    cancelModal.style.display = "flex";
  };

  /**
   * Close cancellation modal
   */
  window.closeCancelModal = function () {
    cancelModal.style.display = "none";
  };

  /**
   * Confirm and execute booking cancellation
   * Calls API to cancel booking and updates UI
   */
  window.confirmCancellation = async function () {
    // Get button reference and save original text
    const confirmBtn = document.querySelector(".confirm-cancel-btn");
    const originalText = confirmBtn.textContent;

    try {
      // Show loading in modal
      confirmBtn.textContent = "Cancelling...";
      confirmBtn.disabled = true;

      const response = await fetch(`/api/manage/${currentToken}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Show success message and redirect
        showCancellationSuccess();
      } else {
        throw new Error("Cancellation failed");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert(`Cancellation failed: ${error.message}`);

      // Restore button state using saved originalText
      confirmBtn.textContent = originalText;
      confirmBtn.disabled = false;
    }
  };

  /**
   * Show cancellation success message and redirect
   */
  function showCancellationSuccess() {
    hideAllStates();

    // Create success message
    const successHTML = `
      <div class="booking-confirmation-banner">
        <div class="confirmation-content">
          <div class="confirmation-header">
            <div class="success-icon">✅</div>
            <h2>Booking Cancelled</h2>
          </div>
          <div class="confirmation-details">
            <div class="booking-info">
              <p style="text-align: center; color: #bbb; margin-bottom: 20px;">
                Your appointment has been successfully cancelled.
              </p>
              <div style="text-align: center;">
                <a href="index.html" class="nav-button">🏠 Return to Homepage</a>
                <a href="booking.html" class="nav-button" style="margin-top: 10px;">📅 Book New Appointment</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.querySelector(".booking-container").innerHTML = successHTML;

    // Auto-redirect after 5 seconds
    setTimeout(() => {
      window.location.href = "index.html";
    }, 5000);
  }

  /**
   * Add booking to calendar with real data
   * Uses current booking information for calendar integration
   */
  window.addToCalendar = function () {
    if (!currentBooking) {
      alert("Booking data not available");
      return;
    }

    // Generate calendar URLs with real booking data
    const calendarData = {
      title: "Appointment at Elite Barber Studio",
      startDate: currentBooking.date,
      startTime: currentBooking.time,
      endTime: currentBooking.endTime,
      description: `Services: ${currentBooking.services.join(
        ", "
      )}\\nDuration: ${currentBooking.duration} minutes\\nTotal: $${
        currentBooking.price
      }\\n\\nPlease arrive 5 minutes early.`,
      location: "Elite Barber Studio, 123 Main Street, Downtown, NY 10001",
    };

    // Create Google Calendar URL
    const startDateTime = `${calendarData.startDate.replace(
      /-/g,
      ""
    )}T${calendarData.startTime.replace(":", "")}00`;
    const endDateTime = `${calendarData.startDate.replace(
      /-/g,
      ""
    )}T${calendarData.endTime.replace(":", "")}00`;

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      calendarData.title
    )}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(
      calendarData.description
    )}&location=${encodeURIComponent(calendarData.location)}`;

    // Open calendar in new tab
    window.open(googleCalendarUrl, "_blank");
  };

  // Handle browser back/forward buttons
  window.addEventListener("popstate", function () {
    // Reload page if user navigates back
    window.location.reload();
  });

  // Handle page visibility changes (tab switching)
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && currentToken) {
      // Refresh booking data when tab becomes visible again
      // This helps catch if booking was cancelled in another tab
      loadBookingData();
    }
  });

  // Add keyboard shortcuts
  document.addEventListener("keydown", function (event) {
    // ESC key closes modal
    if (event.key === "Escape" && cancelModal.style.display === "block") {
      cancelCancelModal();
    }
  });
});
