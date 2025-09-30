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
<body>
  <div>
    <h1>⚠️ Appointment Cancelled</h1>
    
    <p>Dear ${booking.customer},</p>
    
    <h2>We Need to Cancel Your Appointment</h2>
    <p>We sincerely apologize for any inconvenience, but we need to cancel your upcoming appointment.</p>
    
    <h3>Cancelled Appointment Details:</h3>
    <p>
      <strong>Booking ID:</strong> #${booking.id}<br>
      <strong>Date:</strong> ${formattedDate}<br>
      <strong>Time:</strong> ${booking.time} - ${endTime}<br>
      <strong>Services:</strong> ${booking.services.join(", ")}
    </p>
    
    <p>
      We understand this may cause inconvenience and we deeply apologize. 
      Our team will be happy to help you reschedule at your earliest convenience.
    </p>
    
    <p>
      <a href="https://barbersite-eight.vercel.app/booking.html">📅 Book New Appointment</a>
    </p>
    
    <p><strong>Need immediate assistance?</strong></p>
    <p>☎️ <strong>Call us:</strong> <a href="tel:+1234567890">+1 (234) 567-890</a></p>
    <p>📧 <strong>Email:</strong> <a href="mailto:info@elitebarberstudio.com">info@elitebarberstudio.com</a></p>
    <p>📍 <strong>Visit us:</strong> 123 Main Street, Downtown, NY 10001</p>
    
    <p>© 2025 Elite Barber Studio. All rights reserved.<br>
    This is an automated message. Please do not reply to this email.</p>
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
