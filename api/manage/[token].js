/**
 * TOKEN-BASED BOOKING MANAGEMENT API
 *
 * This endpoint allows customers to manage their bookings using secure tokens.
 * Provides read and cancel operations without requiring user authentication.
 *
 * Features:
 * - Retrieve booking details using management token
 * - Cancel bookings with token authorization
 * - Token validation and expiration checking
 * - Automatic token cleanup after cancellation
 *
 * Security:
 * - Validates token exists and is active
 * - Checks token expiration before operations
 * - Deactivates tokens after cancellation
 * - No sensitive data exposure
 *
 * Database Tables Used:
 * - booking_tokens: Token validation and expiration
 * - bookings: Booking data retrieval and updates
 *
 * Routes:
 * - GET /api/booking/[token]: Get booking details
 * - DELETE /api/booking/[token]: Cancel booking
 */

import { Pool } from "pg";
import { Resend } from "resend";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Validate management token and return associated booking
 * Checks token exists, is active, and hasn't expired
 * @param {string} token - Management token to validate
 * @returns {Object|null} Booking object if token valid, null otherwise
 */
async function validateTokenAndGetBooking(token) {
  try {
    // Get token info with associated booking
    const result = await pool.query(
      `
      SELECT 
        bt.id as token_id,
        bt.expires_at,
        bt.is_active,
        b.*
      FROM booking_tokens bt
      JOIN bookings b ON bt.booking_id = b.id
      WHERE bt.token = $1 AND bt.is_active = true
    `,
      [token]
    );

    if (result.rows.length === 0) {
      return null; // Token not found or inactive
    }

    const tokenData = result.rows[0];

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      // Deactivate expired token
      await pool.query(
        "UPDATE booking_tokens SET is_active = false WHERE id = $1",
        [tokenData.token_id]
      );
      return null; // Token expired
    }

    return tokenData;
  } catch (error) {
    console.error("Token validation error:", error);
    return null;
  }
}

/**
 * Format booking data for client response
 * Removes sensitive/internal fields and formats dates/times
 * @param {Object} booking - Raw booking object from database
 * @returns {Object} Formatted booking data
 */
function formatBookingResponse(booking) {
  // Format date for display
  const bookingDate =
    booking.date instanceof Date
      ? booking.date.toISOString().split("T")[0]
      : booking.date;

  // Format time (remove seconds if present)
  const bookingTime =
    booking.time.length > 5 ? booking.time.substring(0, 5) : booking.time;

  // Calculate end time
  const [hours, minutes] = bookingTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + booking.duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
    .toString()
    .padStart(2, "0")}`;

  return {
    id: booking.id,
    date: bookingDate,
    time: bookingTime,
    endTime: endTime,
    customer: booking.customer,
    phone: booking.phone,
    email: booking.email,
    services: booking.services,
    duration: booking.duration,
    price: booking.price,
    status: booking.status,
    notes: booking.notes,
    // Format date for display (e.g., "Wednesday, October 15, 2025")
    formattedDate: new Date(bookingDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    canCancel: true,
  };
}

async function sendCancellationEmailByCustomer(booking) {
  try {
    console.log(`=== EMAIL DEBUG START ===`);
    console.log(
      `Sending cancellation email to ${booking.email} for booking ${booking.id}`
    );

    // Check if RESEND_API_KEY exists
    const apiKey = process.env.RESEND_API_KEY;
    console.log(`RESEND_API_KEY exists: ${!!apiKey}`);
    console.log(`RESEND_API_KEY length: ${apiKey ? apiKey.length : "N/A"}`);
    console.log(
      `RESEND_API_KEY starts with: ${
        apiKey ? apiKey.substring(0, 10) + "..." : "N/A"
      }`
    );

    // Prepare email data
    const emailData = {
      from: "Elite Barber Studio <bookings@elitebarberstudio.com>",
      to: booking.email,
      subject: `Booking Cancelled - Appointment #${booking.id}`,
      html: `
      <h2>📅 Appointment Cancelled</h2>
      <p>Hi ${booking.customer},</p>
      
      <p><strong>You have successfully cancelled your appointment #${
        booking.id
      }.</strong></p>
      
      <p>Date: ${booking.formattedDate}<br>
         Time: ${booking.time} - ${booking.endTime}<br>
         Services: ${booking.services.join(", ")}</p>
      
      <p>We're sorry to see you cancel. To book a new appointment, visit our website or call +1 (234) 567-890.</p>
      
      <p>Thank you,<br>Elite Barber Studio Team</p>
      `,
    };

    console.log("Email data prepared:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      htmlLength: emailData.html.length,
    });

    console.log("Calling resend.emails.send()...");
    const result = await resend.emails.send(emailData);

    console.log("Resend result type:", typeof result);
    console.log("Resend result:", JSON.stringify(result, null, 2));

    if (result && result.id) {
      console.log(`✅ Cancellation email sent successfully: ${result.id}`);
      console.log(`=== EMAIL DEBUG END - SUCCESS ===`);
      return true;
    } else if (result && result.error) {
      console.error(`❌ Resend API error:`, result.error);
      console.log(`=== EMAIL DEBUG END - RESEND ERROR ===`);
      return false;
    } else {
      console.error(`❌ Unexpected result from Resend:`, result);
      console.log(`=== EMAIL DEBUG END - UNEXPECTED RESULT ===`);
      return false;
    }
  } catch (error) {
    console.error("❌ Customer cancellation email error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.log(`=== EMAIL DEBUG END - EXCEPTION ===`);
    return false;
  }
}

/**
 * Cancel booking and deactivate associated tokens
 * Updates booking status and cleans up tokens
 * @param {number} bookingId - ID of booking to cancel
 * @param {string} token - Token used for cancellation (for logging)
 * @returns {boolean} Success status
 */
async function cancelBooking(bookingId, token) {
  try {
    // Start transaction
    await pool.query("BEGIN");

    // Update booking status to cancelled
    const updateResult = await pool.query(
      "UPDATE bookings SET status = $1 WHERE id = $2 AND status = $3 RETURNING *",
      ["cancelled", bookingId, "confirmed"]
    );

    if (updateResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return false; // Booking not found or already cancelled
    }

    // Deactivate all tokens for this booking
    await pool.query(
      "UPDATE booking_tokens SET is_active = false WHERE booking_id = $1",
      [bookingId]
    );

    // Commit transaction
    await pool.query("COMMIT");

    console.log(`Booking ${bookingId} cancelled via token ${token}`);
    return true;
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Booking cancellation error:", error);
    return false;
  }
}

/**
 * Main API handler for token-based booking management
 * Handles GET (retrieve) and DELETE (cancel) operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handler(req, res) {
  const { token } = req.query;

  // Validate token parameter
  if (!token || typeof token !== "string") {
    return res.status(400).json({
      error: "Invalid token",
      message: "Valid management token is required",
    });
  }

  try {
    // Validate token and get booking
    const booking = await validateTokenAndGetBooking(token);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
        message: "Invalid, expired, or deactivated management token",
      });
    }

    // Handle different HTTP methods
    if (req.method === "GET") {
      // Return booking details
      const formattedBooking = formatBookingResponse(booking);

      return res.status(200).json({
        success: true,
        booking: formattedBooking,
      });
    } else if (req.method === "DELETE") {
      // Check if cancellation is allowed (booking hasn't started)
      const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
      const now = new Date();

      if (bookingDateTime <= now) {
        return res.status(400).json({
          error: "Cancellation not allowed",
          message: "Cannot cancel booking that has already started or passed",
        });
      }

      // Attempt to cancel booking
      const cancelled = await cancelBooking(booking.id, token);

      if (!cancelled) {
        return res.status(500).json({
          error: "Cancellation failed",
          message: "Unable to cancel booking. Please contact support.",
        });
      }
      // Send cancellation email to customer
      const formattedBooking = formatBookingResponse(booking);
      const emailSent = await sendCancellationEmailByCustomer(formattedBooking);

      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully",
        bookingId: booking.id,
        emailSent: emailSent,
      });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Booking management error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Export without auth protection - public API using token-based auth
export default handler;
