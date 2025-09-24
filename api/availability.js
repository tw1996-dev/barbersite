import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Public endpoint for booking availability data
 * Returns only non-sensitive data needed for booking calendar
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Use database view - only returns safe data
    const result = await pool.query(
      "SELECT * FROM public_availability ORDER BY date, time"
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Availability query error:", error);
    return res.status(500).json({ error: "Database error" });
  }
}
