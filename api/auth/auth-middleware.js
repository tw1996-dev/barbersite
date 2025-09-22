import jwt from "jsonwebtoken";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Authentication middleware for protecting API endpoints
 * Verifies JWT token and checks database session
 */
export async function requireAuth(req, res, next) {
  try {
    // Get token from cookie or Authorization header
    const token =
      req.cookies?.admin_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
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
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Check if session exists and is active in database
    const sessionResult = await pool.query(
      "SELECT id FROM admin_sessions WHERE session_token = $1 AND is_active = true AND expires_at > NOW()",
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    // Add user info to request object
    req.admin = {
      isAdmin: decoded.isAdmin,
      loginTime: decoded.loginTime,
      sessionId: sessionResult.rows[0].id,
    };

    // Continue to next middleware/handler
    if (next) next();
    return true;
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Wrapper function for API routes that need authentication
 * Usage: export default withAuth(yourHandler);
 */
export function withAuth(handler) {
  return async (req, res) => {
    const authResult = await requireAuth(req, res);
    if (authResult === true) {
      return handler(req, res);
    }
    // If authResult is not true, requireAuth already sent the response
  };
}
