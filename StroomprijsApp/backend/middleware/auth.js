/**
 * middleware/auth.js — JWT Authentication Middleware (async DB version)
 */

const jwt       = require("jsonwebtoken");
const userStore = require("../db");

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer "))
      return res.status(401).json({ success: false, error: "No token provided" });

    const decoded = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET);
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