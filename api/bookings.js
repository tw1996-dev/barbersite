import { Pool } from "pg";
import { Resend } from "resend";
import { requireAuth } from "./auth/auth-middleware.js";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper functions for server-side conflict detection
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function getBookingEndTime(startTime, duration) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  return `${endHours.toString().padStart(2, "0")}:${endMins
    .toString()
    .padStart(2, "0")}`;
}

function checkTimeSlotConflict(
  existingBookings,
  newDate,
  newTime,
  newDuration
) {
  const newEndTime = getBookingEndTime(newTime, newDuration);
  const newStartMinutes = timeToMinutes(newTime);
  const newEndMinutes = timeToMinutes(newEndTime);

  const dayBookings = existingBookings.filter(
    (booking) => booking.date === newDate && booking.status === "confirmed"
  );

  for (const booking of dayBookings) {
    const existingStartMinutes = timeToMinutes(booking.time);
    const existingEndTime = getBookingEndTime(booking.time, booking.duration);
    const existingEndMinutes = timeToMinutes(existingEndTime);

    if (
      newStartMinutes < existingEndMinutes &&
      newEndMinutes > existingStartMinutes
    ) {
      return true; // Conflict found
    }
  }

  return false; // No conflict
}

// Send simple confirmation email
async function sendEmail(booking) {
  try {
    // Calculate end time
    const [hours, minutes] = booking.time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + booking.duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
      .toString()
      .padStart(2, "0")}`;

    // Format for calendar URLs
    const bookingDate =
      booking.date instanceof Date
        ? booking.date.toISOString().split("T")[0]
        : booking.date;
    const bookingTime =
      booking.time.length > 5 ? booking.time.substring(0, 5) : booking.time;

    const startDateTime =
      bookingDate.replace(/-/g, "") + "T" + bookingTime.replace(":", "") + "00";
    const endDateTime =
      bookingDate.replace(/-/g, "") + "T" + endTime.replace(":", "") + "00";

    // Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      "Appointment at Elite Barber Studio"
    )}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(
      `Services: ${booking.services.join(", ")}\nDuration: ${
        booking.duration
      } minutes\nTotal: $${
        booking.price
      }\n\nPlease arrive 5 minutes early.\n\nElite Barber Studio\n123 Main Street, Downtown, NY 10001\nPhone: +1 (234) 567-890`
    )}&location=${encodeURIComponent(
      "Elite Barber Studio, 123 Main Street, Downtown, NY 10001"
    )}`;

    // Microsoft Outlook URL
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
      "Appointment at Elite Barber Studio"
    )}&startdt=${new Date(
      bookingDate + "T" + bookingTime
    ).toISOString()}&enddt=${new Date(
      bookingDate + "T" + endTime
    ).toISOString()}&body=${encodeURIComponent(
      `Services: ${booking.services.join(", ")}\nDuration: ${
        booking.duration
      } minutes\nTotal: $${
        booking.price
      }\n\nPlease arrive 5 minutes early.\n\nElite Barber Studio\n123 Main Street, Downtown, NY 10001\nPhone: +1 (234) 567-890`
    )}&location=${encodeURIComponent(
      "Elite Barber Studio, 123 Main Street, Downtown, NY 10001"
    )}`;

    await resend.emails.send({
      from: "Elite Barber Studio <booking@100kcalcost.com>",
      to: [booking.email],
      subject: `Booking Confirmation - ${booking.date}`,
      html: `
    <h2>Booking Confirmed!</h2>
    <p>Hello ${booking.customer},</p>
    <p>
      <strong>Date:</strong> ${bookingDate}<br>
      <strong>Time:</strong> ${bookingTime} - ${endTime}<br>
      <strong>Services:</strong> ${booking.services.join(", ")}<br>
      <strong>Duration:</strong> ${booking.duration} minutes<br>
      <strong>Total:</strong> $${booking.price}
    </p>
    <p>Address: 123 Main Street, Downtown, NY 10001<br>
    Phone: +1 (234) 567-890</p>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="${googleCalendarUrl}" style="display: inline-block; background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 5px; font-weight: bold;">📅 Google Calendar</a>
      <a href="${outlookUrl}" style="display: inline-block; background: #0078d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 5px; font-weight: bold;">📅 Outlook</a>
    </div>
    
    ${
      booking.managementUrl
        ? `
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545;">
      <h3 style="color: #dc3545; margin-bottom: 15px; font-size: 18px;">📱 Manage Your Booking</h3>
      <p style="color: #6c757d; margin-bottom: 15px; font-size: 14px;">
        Need to cancel your appointment? Use the secure link below:
      </p>
      <div style="text-align: center;">
        <a href="${booking.managementUrl}" 
           style="display: inline-block; 
                  background: #dc3545; 
                  color: white; 
                  padding: 12px 30px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: bold;
                  font-size: 16px;">
          🔗 Manage Booking
        </a>
      </div>
      <p style="color: #6c757d; font-size: 12px; margin-top: 15px; text-align: center;">
        This link expires 30 minutes after your appointment time for security.<br>
        For rescheduling or other changes, please call us at +1 (234) 567-890.
      </p>
    </div>
    `
        : ""
    }
    
    <p><strong>Please arrive 5 minutes before your appointment time.</strong></p>
    <p>If you need to reschedule or have questions, please call us at +1 (234) 567-890.</p>
  `,
    });
    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
}

async function handler(req, res) {
  if (req.method === "GET") {
    // Protected endpoint - require admin authentication
    const authResult = await requireAuth(req, res);
    if (authResult !== true) return; // Auth middleware handles error response

    try {
      // Admin access - return all booking data
      const result = await pool.query(
        "SELECT * FROM bookings ORDER BY date, time"
      );
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (req.method === "POST") {
    // Public access for customers to create bookings
    try {
      const {
        date,
        time,
        customer,
        phone,
        email,
        services,
        duration,
        price,
        status,
        notes,
      } = req.body;

      // Validation
      if (
        !date ||
        !time ||
        !customer ||
        !phone ||
        !services ||
        !duration ||
        !price
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get existing bookings for conflict check
      const existingResult = await pool.query(
        "SELECT * FROM bookings WHERE date = $1 AND status = $2",
        [date, "confirmed"]
      );
      const existingBookings = existingResult.rows;

      // Server-side conflict check
      if (checkTimeSlotConflict(existingBookings, date, time, duration)) {
        return res.status(409).json({
          error: "Time slot conflict",
          message: "This time slot conflicts with an existing booking",
        });
      }

      const result = await pool.query(
        "INSERT INTO bookings (date, time, customer, phone, email, services, duration, price, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        [
          date,
          time,
          customer,
          phone,
          email || "",
          services,
          duration,
          price,
          status || "confirmed",
          notes || "",
        ]
      );

      // Generate management token for the new booking
      try {
        const newBooking = result.rows[0];

        // Import crypto if not already imported at the top of file
        // import crypto from "crypto";

        // Generate secure token using same method as api/generate-token.js
        const token = crypto.randomUUID();

        // Calculate token expiration (30 minutes after appointment time)
        const bookingDateTime = new Date(
          `${newBooking.date}T${newBooking.time}:00`
        );
        const tokenExpiration = new Date(
          bookingDateTime.getTime() + 30 * 60 * 1000
        );

        // Store token in database
        await pool.query(
          "INSERT INTO booking_tokens (booking_id, token, expires_at, is_active) VALUES ($1, $2, $3, true)",
          [newBooking.id, token, tokenExpiration]
        );

        // Add management URL to booking object for email template
        const siteUrl =
          process.env.SITE_URL ||
          process.env.VERCEL_URL ||
          "https://barbersite-eight.vercel.app/";
        newBooking.managementUrl = `${siteUrl}/booking-manager.html?token=${token}`;
        newBooking.managementToken = token;

        console.log(`Generated management token for booking ${newBooking.id}`);
      } catch (tokenError) {
        // Don't fail the booking if token generation fails
        console.error("Failed to generate management token:", tokenError);
        // Continue without token - booking still succeeds
      }
      // Send confirmation email
      await sendEmail(result.rows[0]);

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// Export without auth protection - public API for booking page
export default handler;
