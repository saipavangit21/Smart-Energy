/**
 * middleware/auth.js
 * Reads JWT from httpOnly cookie (sp_access) — falls back to Bearer header
 * for backwards compatibility with Google OAuth callback
 */

const jwt       = require("jsonwebtoken");
const userStore = require("../db");

async function requireAuth(req, res, next) {
  try {
    // Prefer httpOnly cookie, fall back to Authorization header
    let token = req.cookies?.sp_access;
    if (!token) {
      const h = req.headers.authorization;
      if (h && h.startsWith("Bearer ")) token = h.split(" ")[1];
    }

    if (!token)
      return res.status(401).json({ success: false, error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await userStore.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, error: "User not found" });

    req.user = userStore.safeUser(user);
    next();
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID";
    return res.status(401).json({ success: false, error: err.message, code });
  }
}

module.exports = { requireAuth };