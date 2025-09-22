import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Rate limiting storage (in-memory for serverless)
const loginAttempts = new Map();

/**
 * Admin login endpoint with rate limiting and secure password verification
 * Creates JWT token and stores session in database
 */
export default async function handler(req, res) {
  // DEBUG - sprawdź zmienne środowiskowe i request
  console.log("LOGIN DEBUG:", {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasPassword: !!req.body?.password,
    passwordLength: req.body?.password?.length || 0,
    envVars: {
      hasPasswordHash: !!process.env.ADMIN_PASSWORD_HASH,
      passwordHashStart:
        process.env.ADMIN_PASSWORD_HASH?.substring(0, 10) + "...",
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretStart: process.env.JWT_SECRET?.substring(0, 10) + "...",
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlStart: process.env.DATABASE_URL?.substring(0, 30) + "...",
    },
  });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password } = req.body;
    const clientIP =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"] || "";

    console.log("Login attempt for password:", password); // TEMPORARY DEBUG

    // Rate limiting - max 5 attempts per IP per 15 minutes
    const now = Date.now();
    const attempts = loginAttempts.get(clientIP) || {
      count: 0,
      resetTime: now,
    };

    if (attempts.count >= 5 && now < attempts.resetTime) {
      return res.status(429).json({
        error: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil((attempts.resetTime - now) / 1000 / 60), // minutes
      });
    }

    // Reset counter if 15 minutes passed
    if (now >= attempts.resetTime) {
      attempts.count = 0;
      attempts.resetTime = now + 15 * 60 * 1000; // 15 minutes
    }

    // Validate password
    if (!password) {
      attempts.count++;
      loginAttempts.set(clientIP, attempts);
      console.log("No password provided");
      return res.status(400).json({ error: "Password is required" });
    }

    // Get password hash from environment
    const storedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!storedPasswordHash) {
      console.error("ADMIN_PASSWORD_HASH not set in environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    console.log("About to compare password with hash...");

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, storedPasswordHash);

    console.log("Password comparison result:", isPasswordValid);

    if (!isPasswordValid) {
      attempts.count++;
      loginAttempts.set(clientIP, attempts);
      console.log("Invalid password");
      return res.status(401).json({ error: "Invalid password" });
    }

    // Password is correct - reset rate limiting
    loginAttempts.delete(clientIP);

    console.log("Password valid, generating JWT...");

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET not set in environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = jwt.sign(
      {
        isAdmin: true,
        loginTime: new Date().toISOString(),
      },
      jwtSecret,
      { expiresIn: "8h" } // 8 hour session
    );

    console.log("JWT generated, storing in database...");

    // Store session in database
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now

    await pool.query(
      "INSERT INTO admin_sessions (session_token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4)",
      [token, expiresAt, clientIP, userAgent]
    );

    console.log("Session stored in database");

    // Set secure HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${
        8 * 60 * 60
      }; Path=/`
    );

    console.log("Login successful!");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
