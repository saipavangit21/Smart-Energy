/**
 * routes/auth.js
 * httpOnly cookie-based auth — tokens never exposed to JS (XSS safe)
 * Email optional — only needed for price alerts
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

// ── Token generation ──────────────────────────────────────────
function generateTokens(userId) {
  return {
    accessToken:  jwt.sign({ userId }, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN  || "15m" }),
    refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }),
  };
}

// ── Cookie config ─────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === "production";

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie("sp_access", accessToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? "none" : "lax", // "none" needed for cross-origin Railway→Vercel
    maxAge:   15 * 60 * 1000,
    path:     "/",
  });
  res.cookie("sp_refresh", refreshToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     "/",
  });
}

function clearAuthCookies(res) {
  const opts = { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? "none" : "lax", path: "/" };
  res.clearCookie("sp_access",   opts);
  res.clearCookie("sp_refresh",  opts);
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// ── POST /auth/exchange ───────────────────────────────────────
// Called by AuthCallback after Google OAuth redirect
// Exchanges URL tokens for httpOnly cookies (safe cross-origin)
router.post("/exchange", async (req, res) => {
  try {
    const { accessToken, refreshToken } = req.body;
    if (!accessToken || !refreshToken)
      return res.status(400).json({ success: false, error: "Tokens required" });

    // Verify the access token is legitimate
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await userStore.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, error: "User not found" });

    // Set as httpOnly cookies — tokens leave URL, enter safe cookie storage
    setAuthCookies(res, { accessToken, refreshToken });
    res.json({ success: true, user: userStore.safeUser(user) });
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid tokens" });
  }
});

// ── POST /auth/register ───────────────────────────────────────
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!name || !name.trim())  return res.status(400).json({ success: false, error: "Name is required" });
    if (!password)              return res.status(400).json({ success: false, error: "Password is required" });
    if (password.length < 8)   return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });

    if (email) {
      if (!isValidEmail(email)) return res.status(400).json({ success: false, error: "Invalid email address" });
      if (await userStore.findByEmail(email)) return res.status(409).json({ success: false, error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userStore.create({ email: email || null, passwordHash, name });
    const tokens = generateTokens(user.id);
    await userStore.saveRefreshToken(tokens.refreshToken, user.id);

    setAuthCookies(res, tokens);
    res.status(201).json({ success: true, user: userStore.safeUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Registration failed: " + err.message });
  }
});

// ── POST /auth/login ──────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!password)               return res.status(400).json({ success: false, error: "Password is required" });
    if (!email && !name)         return res.status(400).json({ success: false, error: "Email or name is required" });

    const user = email
      ? await userStore.findByEmail(email)
      : await userStore.findByName(name);

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ success: false, error: "Invalid credentials" });

    const tokens = generateTokens(user.id);
    await userStore.saveRefreshToken(tokens.refreshToken, user.id);

    setAuthCookies(res, tokens);
    res.json({ success: true, user: userStore.safeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Login failed: " + err.message });
  }
});

// ── POST /auth/refresh ────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    // Read from cookie (preferred) or body (fallback for OAuth callback)
    const refreshToken = req.cookies?.sp_refresh || req.body?.refreshToken;
    if (!refreshToken) return res.status(400).json({ success: false, error: "No refresh token" });
    if (!(await userStore.isValidRefreshToken(refreshToken)))
      return res.status(401).json({ success: false, error: "Invalid refresh token" });

    const { userId } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userStore.findById(userId);
    if (!user) return res.status(401).json({ success: false, error: "User not found" });

    await userStore.deleteRefreshToken(refreshToken);
    const tokens = generateTokens(user.id);
    await userStore.saveRefreshToken(tokens.refreshToken, user.id);

    setAuthCookies(res, tokens);
    res.json({ success: true, user: userStore.safeUser(user) });
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// ── POST /auth/logout ─────────────────────────────────────────
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.sp_refresh || req.body?.refreshToken;
  if (refreshToken) await userStore.deleteRefreshToken(refreshToken);
  clearAuthCookies(res);
  res.json({ success: true });
});

// ── GET /auth/me ──────────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── PUT /auth/preferences ─────────────────────────────────────
router.put("/preferences", requireAuth, async (req, res) => {
  try {
    const allowed = ["supplier","alertThreshold","alertEnabled","alertEmail","alertChannels","language"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

    if (updates.alertEmail) {
      const existingByEmail = await userStore.findByEmail(updates.alertEmail);
      if (existingByEmail && existingByEmail.id !== req.user.id)
        return res.status(409).json({ success: false, error: "This email is already linked to another account" });
      const existingByAlertEmail = await userStore.findByAlertEmail(updates.alertEmail);
      if (existingByAlertEmail && existingByAlertEmail.id !== req.user.id)
        return res.status(409).json({ success: false, error: "This email is already linked to another account" });
    }

    if (updates.alertEnabled === true) {
      const currentPrefs = req.user.preferences || {};
      const alertEmail = updates.alertEmail || currentPrefs.alertEmail;
      if (!alertEmail || !isValidEmail(alertEmail))
        return res.status(400).json({ success: false, error: "A valid email is required to enable alerts" });
    }

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
    if (email !== undefined) {
      if (email === "") { changes.email = null; }
      else {
        if (!isValidEmail(email)) return res.status(400).json({ success: false, error: "Invalid email" });
        const existing = await userStore.findByEmail(email);
        if (existing && existing.id !== req.user.id)
          return res.status(409).json({ success: false, error: "Email already in use" });
        changes.email = email;
      }
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