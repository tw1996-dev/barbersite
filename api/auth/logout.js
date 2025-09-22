import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Logout endpoint
 * Invalidates session in database and clears cookie
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get token from cookie or Authorization header
    const token =
      req.cookies?.admin_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      // Deactivate session in database
      await pool.query(
        "UPDATE admin_sessions SET is_active = false WHERE session_token = $1",
        [token]
      );
    }

    // Clear cookie
    res.setHeader(
      "Set-Cookie",
      "admin_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/"
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
