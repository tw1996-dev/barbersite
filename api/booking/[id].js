import { Pool } from "pg";
import { withAuth } from "../auth/auth-middleware.js";

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
