/**
 * BOOKING TOKEN GENERATION API
 *
 * This endpoint handles generation and management of booking access tokens.
 * Tokens allow customers to manage their bookings (view, cancel) without authentication.
 *
 * Features:
 * - Generate secure tokens for existing bookings
 * - Store tokens with expiration in booking_tokens table
 * - Token validation and cleanup
 * - Automatic expiration based on appointment time
 *
 * Token Security:
 * - Uses crypto.randomUUID() for secure token generation
 * - Tokens expire 30 minutes after appointment start time
 * - One active token per booking (replaces old tokens)
 *
 * Database Tables Used:
 * - bookings: Source booking data
 * - booking_tokens: Token storage with expiration
 *
 * Routes:
 * - POST /api/generate-token: Generate token for existing booking
 */

import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Generate secure booking management token
 * Uses crypto.randomUUID() for cryptographically secure token generation
 * @returns {string} UUID v4 token
 */
function generateSecureToken() {
  return crypto.randomUUID();
}

/**
 * Calculate token expiration time based on booking datetime
 * Tokens expire 30 minutes after appointment start to allow late management
 * @param {string} bookingDate - Date in YYYY-MM-DD format
 * @param {string} bookingTime - Time in HH:MM format
 * @returns {Date} Expiration datetime
 */
function calculateTokenExpiration(bookingDate, bookingTime) {
  // Parse booking date and time
  const bookingDateTime = new Date(`${bookingDate}T${bookingTime}:00`);

  // Token expires AT appointment start time (cannot cancel after it starts)
  return bookingDateTime;
}

/**
 * Deactivate existing tokens for a booking
 * Ensures only one active token per booking for security
 * @param {number} bookingId - ID of the booking
 */
async function deactivateExistingTokens(bookingId) {
  await pool.query(
    "UPDATE booking_tokens SET is_active = false WHERE booking_id = $1 AND is_active = true",
    [bookingId]
  );
}

/**
 * Create new booking token in database
 * Deactivates old tokens and creates new one with proper expiration
 * @param {number} bookingId - ID of the booking
 * @param {string} bookingDate - Date in YYYY-MM-DD format
 * @param {string} bookingTime - Time in HH:MM format
 * @returns {string} Generated token
 */
async function createBookingToken(bookingId, bookingDate, bookingTime) {
  const token = generateSecureToken();
  const expiresAt = calculateTokenExpiration(bookingDate, bookingTime);

  // Deactivate existing tokens for this booking
  await deactivateExistingTokens(bookingId);

  // Create new token
  await pool.query(
    "INSERT INTO booking_tokens (booking_id, token, expires_at, is_active) VALUES ($1, $2, $3, true)",
    [bookingId, token, expiresAt]
  );

  return token;
}

/**
 * Validate booking exists and is manageable
 * Checks if booking exists, is confirmed, and hasn't started yet
 * @param {number} bookingId - ID of the booking to validate
 * @returns {Object|null} Booking object if valid, null if invalid
 */
async function validateBookingForToken(bookingId) {
  const result = await pool.query(
    "SELECT * FROM bookings WHERE id = $1 AND status = $2",
    [bookingId, "confirmed"]
  );

  if (result.rows.length === 0) {
    return null; // Booking not found or not confirmed
  }

  const booking = result.rows[0];

  // Check if appointment is in the future (allow token generation)
  const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
  const now = new Date();

  if (bookingDateTime <= now) {
    return null; // Appointment has already started/passed
  }

  return booking;
}

/**
 * Cleanup expired tokens from database
 * Maintenance function to keep booking_tokens table clean
 */
async function cleanupExpiredTokens() {
  await pool.query(
    "UPDATE booking_tokens SET is_active = false WHERE expires_at < NOW() AND is_active = true"
  );
}

/**
 * Main API handler for token generation
 * Handles POST requests to generate management tokens for bookings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId } = req.body;

    // Validation
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    // Validate booking exists and is manageable
    const booking = await validateBookingForToken(bookingId);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found or cannot be managed",
        message: "Booking may be cancelled, completed, or does not exist",
      });
    }

    // Generate new token
    const token = await createBookingToken(
      booking.id,
      booking.date,
      booking.time
    );

    // Cleanup expired tokens (maintenance)
    await cleanupExpiredTokens();

    // Return token and basic booking info
    return res.status(200).json({
      success: true,
      token: token,
      bookingId: booking.id,
      expiresAt: calculateTokenExpiration(
        booking.date,
        booking.time
      ).toISOString(),
      managementUrl: `/booking-manager.html?token=${token}`,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Export without auth protection - public API for token generation
export default handler;
