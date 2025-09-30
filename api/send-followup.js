/**
 * Follow-up email sender for completed appointments
 * Sends thank you emails with review request 30 minutes after appointment ends
 * Can be triggered for specific booking or check all recent completions
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
 * Send follow-up email after completed appointment
 * Includes thank you message and review request
 */
async function sendFollowUpEmail(booking) {
  try {
    const bookingDate =
      booking.date instanceof Date
        ? booking.date.toISOString().split("T")[0]
        : booking.date;

    const formattedDate = new Date(bookingDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    await resend.emails.send({
      from: "Elite Barber Studio <booking@100kcalcost.com>",
      to: booking.email,
      subject: `Thank You for Visiting Elite Barber Studio!`,
      html: `
    <h2>✨ Thank You for Your Visit!</h2>
    <p>Dear ${booking.customer},</p>
    
    <h3>We Hope You Enjoyed Your Experience! ⭐⭐⭐⭐⭐</h3>
    <p>Thank you for choosing Elite Barber Studio for your grooming needs.</p>
    
    <h3>Your Visit Today:</h3>
    <p>
      <strong>Date:</strong> ${formattedDate}<br>
      <strong>Services:</strong> ${booking.services.join(", ")}<br>
      <strong>Barber:</strong> Your Elite Barber Professional
    </p>
    
    <p style="text-align: center;">Your satisfaction is our top priority. We'd love to hear about your experience!</p>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://barbersite-eight.vercel.app/booking.html" style="display: inline-block; background: #d4af37; color: #1a1410; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 5px; font-weight: bold;">📅 Book Again</a>
    </div>
    
    <p style="text-align: center;"><em>See you again soon at Elite Barber Studio!</em></p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    
    <p style="text-align: center; color: #666; font-size: 12px;">
      123 Main Street, Downtown, NY 10001<br>
      ☎️ +1 (234) 567-890 | 📧 info@elitebarberstudio.com<br><br>
      © 2025 Elite Barber Studio. All rights reserved.
    </p>
      `,
    });

    // Mark that follow-up was sent (optional - add column to database)
    await pool
      .query("UPDATE bookings SET follow_up_sent = true WHERE id = $1", [
        booking.id,
      ])
      .catch((err) => console.log("follow_up_sent column might not exist yet"));

    console.log(
      `Follow-up email sent to ${booking.email} for booking ${booking.id}`
    );
    return true;
  } catch (error) {
    console.error("Failed to send follow-up email:", error);
    return false;
  }
}

/**
 * Check recently completed appointments and send follow-ups
 * Looks for appointments that ended 30+ minutes ago
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);

    // Format dates for comparison
    const todayStr = now.toISOString().split("T")[0];

    // Find all confirmed bookings from today that should have ended 30+ minutes ago
    const result = await pool.query(
      `SELECT * FROM bookings 
       WHERE date = $1 
       AND status = 'confirmed' 
       AND email IS NOT NULL 
       AND email != ''
       AND (follow_up_sent IS NULL OR follow_up_sent = false)`,
      [todayStr]
    );

    const bookings = result.rows;
    let sentCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      // Calculate when appointment ended
      const [hours, minutes] = booking.time.split(":").map(Number);
      const appointmentStart = new Date(now);
      appointmentStart.setHours(hours, minutes, 0, 0);

      const appointmentEnd = new Date(
        appointmentStart.getTime() + booking.duration * 60000
      );
      const timeSinceEnd = now - appointmentEnd;

      // Send email if appointment ended 30+ minutes ago
      if (timeSinceEnd >= 30 * 60000) {
        const sent = await sendFollowUpEmail(booking);
        if (sent) {
          sentCount++;
        }
      } else {
        skippedCount++;
        console.log(
          `Skipping booking ${booking.id} - only ${Math.floor(
            timeSinceEnd / 60000
          )} minutes since end`
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Follow-up emails processed`,
      sent: sentCount,
      skipped: skippedCount,
      total: bookings.length,
    });
  } catch (error) {
    console.error("Follow-up email handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
