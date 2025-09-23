import { Pool } from "pg";
import { Resend } from "resend";

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
    await resend.emails.send({
      from: "Elite Barber Studio <onboarding@resend.dev>",
      to: [booking.email],
      subject: `Booking Confirmation - ${booking.date}`,
      html: `
        <h2>Booking Confirmed!</h2>
        <p>Hello ${booking.customer},</p>
        <p><strong>Date:</strong> ${booking.date}<br>
        <strong>Time:</strong> ${booking.time}<br>
        <strong>Services:</strong> ${booking.services.join(", ")}<br>
        <strong>Total:</strong> $${booking.price}</p>
        <p>Address: 123 Main Street, Downtown, NY 10001<br>
        Phone: +1 (234) 567-890</p>
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
    // Public access for booking page to check available slots
    try {
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
