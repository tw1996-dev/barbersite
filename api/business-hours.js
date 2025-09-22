import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await pool.query(
        "SELECT * FROM business_hours ORDER BY id"
      );
      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (req.method === "PUT") {
    try {
      const updates = req.body;

      for (const [dayName, data] of Object.entries(updates)) {
        await pool.query(
          "UPDATE business_hours SET enabled = $1, open_time = $2, close_time = $3, overtime_buffer_minutes = $4 WHERE day_name = $5",
          [
            data.enabled,
            data.open,
            data.close,
            data.overtime_buffer_minutes || 0,
            dayName,
          ]
        );
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Database error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
