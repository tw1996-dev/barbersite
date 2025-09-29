import { addToCalendar, downloadIcsFile } from "./calendar.js";

/**
 * BOOKING CONFIRMATION MODULE
 * Handles display of booking confirmation after successful reservation
 * Shows confirmation banner with booking details and contact information
 */

document.addEventListener("DOMContentLoaded", function () {
  // Check for booking confirmation in localStorage
  const bookingData = localStorage.getItem("bookingConfirmation");

  if (bookingData) {
    try {
      const booking = JSON.parse(bookingData);
      showBookingConfirmation(booking);

      // Clear the confirmation from localStorage after displaying
      localStorage.removeItem("bookingConfirmation");
    } catch (error) {
      console.error("Error parsing booking confirmation:", error);
      // Clear corrupted data
      localStorage.removeItem("bookingConfirmation");
    }
  }
});

/**
 * Display booking confirmation banner at the top of the page
 * Creates and inserts confirmation UI above the main booking section
 */
function showBookingConfirmation(booking) {
  const bookingContainer = document.querySelector(".booking-container");
  if (!bookingContainer) return;

  // Create confirmation banner
  const confirmationBanner = document.createElement("div");
  confirmationBanner.className = "booking-confirmation-banner";
  confirmationBanner.innerHTML = createConfirmationHTML(booking);

  // Insert at the beginning of booking container
  bookingContainer.insertBefore(
    confirmationBanner,
    bookingContainer.firstChild
  );

  // Scroll to top to show the confirmation
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Generate HTML content for booking confirmation banner
 * Includes booking details, contact info and navigation options
 */
function createConfirmationHTML(booking) {
  return `
        <div class="confirmation-content">
            <div class="confirmation-header">
                <div class="success-icon">✅</div>
                <h2>Booking Confirmed!</h2>
                <button class="close-confirmation" onclick="closeConfirmation()" aria-label="Close confirmation">&times;</button>
            </div>
            
            <div class="confirmation-details">
                <div class="booking-info">
                    <h3>Your Appointment Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Booking ID:</span>
                        <span class="detail-value">#${booking.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Services:</span>
                        <span class="detail-value">${booking.services.join(
                          ", "
                        )}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${booking.date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${booking.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value price">$${
                          booking.totalPrice
                        }</span>
                    </div>
                </div>
                
                <div class="email-confirmation-info">
                    <h4>📧 Email Confirmation Sent</h4>
                    <p>A confirmation email has been sent to your email address with all appointment details.</p>
                    <p><small><strong>Note:</strong> Please check your spam/junk folder if you don't see the email in your inbox.</small></p>
                </div>

                <div class="confirmation-contact-info">
                    <div class="confirmation-contact-item">
                        <div class="confirmation-contact-details">
                            <button onclick="addToCalendar({
                                date: '${booking.date}',
                                time: '${booking.time}',
                                services: ${JSON.stringify(
                                  booking.services
                                ).replace(/"/g, "&quot;")},
                                duration: ${booking.duration || 60},
                                totalPrice: ${booking.totalPrice},
                                id: ${booking.id}
                            })" class="nav-button">📅 Add to Calendar</button>
                        </div>
                    </div>
                    <div class="confirmation-contact-item">
                        <span class="confirmation-contact-icon"></span>
                        <div class="confirmation-contact-details">
                            <span class="confirmation-contact-text">📍 123 Main Street<br>Downtown, NY 10001</span>
                            <a href="https://maps.google.com/?q=123+Main+Street,+Downtown,+NY+10001" 
                               target="_blank" class="nav-button">Get Directions</a>
                        </div>
                    </div>
                    <div class="confirmation-contact-item">
                        <span class="confirmation-contact-icon">☎</span>
                        <div class="confirmation-contact-details">
                            <span class="confirmation-contact-text">☎ +1 (234) 567-890</span>
                            <a href="tel:+1234567890" class="contact-button">Call Us</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Close confirmation banner
 * Removes the confirmation element from DOM
 */
window.closeConfirmation = function () {
  const banner = document.querySelector(".booking-confirmation-banner");
  if (banner) {
    banner.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    banner.style.opacity = "0";
    banner.style.transform = "translateY(-20px)";

    setTimeout(() => {
      banner.remove();
    }, 300);
  }
};

window.addToCalendar = addToCalendar;
window.downloadIcsFile = downloadIcsFile;
