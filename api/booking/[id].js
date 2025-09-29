import { Pool } from "pg";
import { withAuth } from "../auth/auth-middleware.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const result = await pool.query("SELECT * FROM bookings WHERE id = $1", [
        id,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Booking not found" });
      }
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("GET booking error:", error);
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (req.method === "DELETE") {
    /**
     * Send cancellation email when admin cancels a booking
     * Different template than customer self-cancellation
     */
    async function sendAdminCancellationEmail(booking) {
      try {
        // Format the date for display
        const bookingDate =
          booking.date instanceof Date
            ? booking.date.toISOString().split("T")[0]
            : booking.date;

        const formattedDate = new Date(bookingDate).toLocaleDateString(
          "en-US",
          {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );

        // Calculate end time for the appointment
        const [hours, minutes] = booking.time.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + booking.duration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMins = totalMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
          .toString()
          .padStart(2, "0")}`;

        await resend.emails.send({
          from: "Elite Barber Studio <booking@100kcalcost.com>",
          to: booking.email,
          subject: `Appointment Cancelled by Elite Barber Studio`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  font-family: 'DM Sans', Arial, sans-serif;
                  background: radial-gradient(circle, #3d2f1f 0%, #2a1f15 40%, #1a1410 100%);
                  color: #e8eaed;
                }
                .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: rgba(26, 20, 16, 0.95);
                  border: 2px solid #d4af37;
                  border-radius: 12px;
                  overflow: hidden;
                }
                .email-header {
                  background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%);
                  color: #1a1410;
                  padding: 30px;
                  text-align: center;
                }
                .email-header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 700;
                  letter-spacing: 1px;
                }
                .email-body {
                  padding: 30px;
                  background: rgba(42, 31, 21, 0.8);
                }
                .appointment-details {
                  background: rgba(26, 20, 16, 0.6);
                  border: 1px solid rgba(212, 175, 55, 0.3);
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
                }
                .detail-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 12px;
                  padding-bottom: 12px;
                  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
                  color: #e8eaed;
                }
                .detail-row:last-child {
                  border-bottom: none;
                  margin-bottom: 0;
                }
                .detail-label {
                  color: #d4af37;
                  font-weight: 600;
                }
                .important-notice {
                  background: rgba(239, 68, 68, 0.1);
                  border: 1px solid rgba(239, 68, 68, 0.3);
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
                  text-align: center;
                }
                .important-notice h2 {
                  color: #ef4444;
                  margin: 0 0 10px 0;
                }
                .cta-button {
                  display: inline-block;
                  background: linear-gradient(90deg, #d4af37 0%, #f4d03f 100%);
                  color: #1a1410;
                  text-decoration: none;
                  padding: 15px 30px;
                  border-radius: 8px;
                  font-weight: 700;
                  margin: 20px 0;
                  text-align: center;
                }
                .footer {
                  background: rgba(15, 13, 10, 0.9);
                  padding: 20px;
                  text-align: center;
                  color: #999;
                  font-size: 14px;
                }
                .contact-info {
                  margin: 15px 0;
                  color: #bbb;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <h1>⚠️ Appointment Cancelled</h1>
                </div>
                
                <div class="email-body">
                  <p>Dear ${booking.customer},</p>
                  
                  <div class="important-notice">
                    <h2>We Need to Cancel Your Appointment</h2>
                    <p>We sincerely apologize for any inconvenience, but we need to cancel your upcoming appointment.</p>
                  </div>
                  
                  <div class="appointment-details">
                    <h3 style="color: #d4af37; margin-bottom: 15px;">Cancelled Appointment Details:</h3>
                    <div class="detail-row">
                      <span class="detail-label">Booking ID:</span>
                      <span>#${booking.id}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Date:</span>
                      <span>${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Time:</span>
                      <span>${booking.time} - ${endTime}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Services:</span>
                      <span>${booking.services.join(", ")}</span>
                    </div>
                  </div>
                  
                  <p style="color: #e8eaed; line-height: 1.6;">
                    We understand this may cause inconvenience and we deeply apologize. 
                    Our team will be happy to help you reschedule at your earliest convenience.
                  </p>
                  
                  <center>
                    <a href="https://barbersite-eight.vercel.app/booking.html" class="cta-button">
                      📅 Book New Appointment
                    </a>
                  </center>
                  
                  <div class="contact-info">
                    <p><strong>Need immediate assistance?</strong></p>
                  <p>☎️ <strong>Call us:</strong> <a href="tel:+1234567890">+1 (234) 567-890</a></p>
                  <p>📧 <strong>Email:</strong> <a href="mailto:info@elitebarberstudio.com">info@elitebarberstudio.com</a></p>
                  <p>📍 <strong>Visit us:</strong> 123 Main Street, Downtown, NY 10001</p>
                </div>
                
                <div class="footer">
                  <p>© 2025 Elite Barber Studio. All rights reserved.<br>
                  This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log(
          `Admin cancellation email sent to ${booking.email} for booking ${booking.id}`
        );
        return true;
      } catch (error) {
        console.error("Failed to send admin cancellation email:", error);
        return false;
      }
    }

    try {
      // Instead of deleting, update status to 'cancelled'
      // This keeps the booking in database but frees up the time slot
      const result = await pool.query(
        "UPDATE bookings SET status = $1 WHERE id = $2 AND status != $1 RETURNING *",
        ["cancelled", id]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Booking not found or already cancelled" });
      }

      // Send cancellation email before deactivating tokens
      const cancelledBooking = result.rows[0];
      if (cancelledBooking.email) {
        await sendAdminCancellationEmail(cancelledBooking);
      }

      // Deactivate all tokens for this cancelled booking
      await pool.query(
        "UPDATE booking_tokens SET is_active = false WHERE booking_id = $1",
        [id]
      );

      console.log(`Admin cancelled booking ${id}`);
      return res.status(200).json({
        message: "Booking cancelled successfully",
        booking: result.rows[0],
      });
    } catch (error) {
      console.error("DELETE booking error:", error);
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (req.method === "PUT") {
    try {
      const {
        customer,
        phone,
        email,
        date,
        time,
        services,
        duration,
        price,
        notes,
        status,
      } = req.body;

      // DEBUG: Log received data
      console.log("=== PUT BOOKING DEBUG ===");
      console.log("Booking ID:", id);
      console.log("Received body:", req.body);
      console.log("Services type:", typeof services);
      console.log("Services value:", services);

      // Validation
      if (
        !customer ||
        !phone ||
        !date ||
        !time ||
        !services ||
        !duration ||
        price === undefined
      ) {
        console.log("Validation failed - missing fields");
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log("Starting UPDATE query...");
      const result = await pool.query(
        `UPDATE bookings 
         SET customer = $1, phone = $2, email = $3, date = $4, 
             time = $5, services = $6, duration = $7, price = $8, 
             notes = $9, status = $10
         WHERE id = $11 
         RETURNING *`,
        [
          customer,
          phone,
          email,
          date,
          time,
          Array.isArray(services)
            ? services
            : typeof services === "string"
            ? JSON.parse(services)
            : services,
          duration,
          price,
          notes,
          status || "confirmed",
          id,
        ]
      );

      console.log("UPDATE successful, rows affected:", result.rows.length);
      console.log("UPDATE result:", result.rows[0]);

      if (result.rows.length === 0) {
        console.log("No booking found with ID:", id);
        return res.status(404).json({ error: "Booking not found" });
      }

      console.log("Returning updated booking");
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("=== PUT BOOKING ERROR ===");
      console.error("Error updating booking:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("PostgreSQL error code:", error.code);
      console.error("PostgreSQL error detail:", error.detail);
      return res.status(500).json({
        error: "Database error",
        details: error.message,
        code: error.code,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(handler);
