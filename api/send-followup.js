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
            .thank-you-section {
              background: rgba(212, 175, 55, 0.1);
              border: 1px solid rgba(212, 175, 55, 0.3);
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .service-summary {
              background: rgba(26, 20, 16, 0.6);
              border: 1px solid rgba(212, 175, 55, 0.3);
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .cta-buttons {
              display: flex;
              gap: 15px;
              justify-content: center;
              margin: 30px 0;
              flex-wrap: wrap;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(90deg, #d4af37 0%, #f4d03f 100%);
              color: #1a1410;
              text-decoration: none;
              padding: 15px 25px;
              border-radius: 8px;
              font-weight: 700;
              text-align: center;
            }
            .footer {
              background: rgba(15, 13, 10, 0.9);
              padding: 20px;
              text-align: center;
              color: #999;
              font-size: 14px;
            }
            .rating-stars {
              font-size: 30px;
              color: #d4af37;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>✨ Thank You for Your Visit!</h1>
            </div>
            
            <div class="email-body">
              <p>Dear ${booking.customer},</p>
              
              <div class="thank-you-section">
                <h2 style="color: #d4af37; margin: 0 0 15px 0;">We Hope You Enjoyed Your Experience!</h2>
                <div class="rating-stars">⭐⭐⭐⭐⭐</div>
                <p>Thank you for choosing Elite Barber Studio for your grooming needs.</p>
              </div>
              
              <div class="service-summary">
                <h3 style="color: #d4af37;">Your Visit Today:</h3>
                <p><strong>Date:</strong> ${formattedDate}<br>
                <strong>Services:</strong> ${booking.services.join(", ")}<br>
                <strong>Barber:</strong> Your Elite Barber Professional</p>
              </div>
              
              <p style="color: #e8eaed; line-height: 1.6; text-align: center;">
                Your satisfaction is our top priority. We'd love to hear about your experience!
              </p>
              
              <div class="cta-buttons">           
                <a href="https://barbersite-eight.vercel.app/booking.html" class="cta-button">
                  📅 Book Again
                </a>
              </div>
              
              <p style="color: #bbb; text-align: center; margin-top: 30px;">
                <em>See you again soon at Elite Barber Studio!</em>
              </p>
            </div>
            
            <div class="footer">
              <p>123 Main Street, Downtown, NY 10001<br>
              ☎️ +1 (234) 567-890 | 📧 info@elitebarberstudio.com<br><br>
              © 2025 Elite Barber Studio. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
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
