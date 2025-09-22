import { Pool } from "pg";
import jwt from "jsonwebtoken";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Token verification endpoint
 * Checks if JWT token is valid and session exists in database
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

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }
      return res.status(401).json({ error: "Invalid token" });
    }

    // Check if session exists and is active in database
    const sessionResult = await pool.query(
      "SELECT * FROM admin_sessions WHERE session_token = $1 AND is_active = true AND expires_at > NOW()",
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session not found or expired" });
    }

    const session = sessionResult.rows[0];

    return res.status(200).json({
      valid: true,
      isAdmin: decoded.isAdmin,
      loginTime: decoded.loginTime,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
