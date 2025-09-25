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
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const result = await pool.query(
        "DELETE FROM bookings WHERE id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Booking not found" });
      }
      return res.status(200).json({ message: "Booking deleted" });
    } catch (error) {
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
        return res.status(400).json({ error: "Missing required fields" });
      }

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
          JSON.stringify(services),
          duration,
          price,
          notes,
          status || "confirmed",
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Booking not found" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Error updating booking:", error);
      return res.status(500).json({ error: "Database error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(handler);
