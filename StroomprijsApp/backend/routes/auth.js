/**
 * routes/auth.js — Authentication Routes (PostgreSQL version)
 * All userStore calls are now async (database queries)
 */

const express    = require("express");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const rateLimit  = require("express-rate-limit");
const userStore  = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const loginLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20, message: { success: false, error: "Too many attempts. Try in 15 minutes." } });
const registerLimiter = rateLimit({ windowMs: 60*60*1000, max: 10, message: { success: false, error: "Too many registrations." } });

function generateTokens(userId) {
  return {
    accessToken:  jwt.sign({ userId }, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN  || "15m" }),
    refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }),
  };
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// ── POST /auth/register ───────────────────────────────────────
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)          return res.status(400).json({ success: false, error: "Email and password required" });
    if (!isValidEmail(email))         return res.status(400).json({ success: false, error: "Invalid email address" });
    if (password.length < 8)          return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
    if (await userStore.findByEmail(email)) return res.status(409).json({ success: false, error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userStore.create({ email, passwordHash, name });
    const { accessToken, refreshToken } = generateTokens(user.id);
    await userStore.saveRefreshToken(refreshToken, user.id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user:    userStore.safeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Registration failed: " + err.message });
  }
});

// ── POST /auth/login ──────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });

    const user = await userStore.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ success: false, error: "Invalid email or password" });

    const { accessToken, refreshToken } = generateTokens(user.id);
    await userStore.saveRefreshToken(refreshToken, user.id);

    res.json({
      success: true,
      user:    userStore.safeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Login failed: " + err.message });
  }
});

// ── POST /auth/refresh ────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: "Refresh token required" });
    if (!(await userStore.isValidRefreshToken(refreshToken)))
      return res.status(401).json({ success: false, error: "Invalid refresh token" });

    const { userId } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userStore.findById(userId);
    if (!user) return res.status(401).json({ success: false, error: "User not found" });

    await userStore.deleteRefreshToken(refreshToken);
    const tokens = generateTokens(user.id);
    await userStore.saveRefreshToken(tokens.refreshToken, user.id);

    res.json({ success: true, ...tokens });
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// ── POST /auth/logout ─────────────────────────────────────────
router.post("/logout", async (req, res) => {
  if (req.body.refreshToken) await userStore.deleteRefreshToken(req.body.refreshToken);
  res.json({ success: true });
});

// ── GET /auth/me ──────────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── PUT /auth/preferences ─────────────────────────────────────
router.put("/preferences", requireAuth, async (req, res) => {
  try {
    const allowed = ["supplier","alertThreshold","alertEnabled","alertChannels","language"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const updated = await userStore.updatePreferences(req.user.id, updates);
    res.json({ success: true, preferences: updated.preferences });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update preferences" });
  }
});

// ── PUT /auth/profile ─────────────────────────────────────────
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const changes = {};
    if (name) changes.name = name;
    if (email) {
      if (!isValidEmail(email)) return res.status(400).json({ success: false, error: "Invalid email" });
      const existing = await userStore.findByEmail(email);
      if (existing && existing.id !== req.user.id)
        return res.status(409).json({ success: false, error: "Email already in use" });
      changes.email = email;
    }
    const updated = await userStore.update(req.user.id, changes);
    res.json({ success: true, user: userStore.safeUser(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

// ── PUT /auth/change-password ─────────────────────────────────
router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, error: "Both passwords required" });
    if (newPassword.length < 8)
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters" });

    const user = await userStore.findById(req.user.id);
    if (!(await bcrypt.compare(currentPassword, user.password_hash)))
      return res.status(401).json({ success: false, error: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userStore.update(req.user.id, { passwordHash });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to change password" });
  }
});

module.exports = router;