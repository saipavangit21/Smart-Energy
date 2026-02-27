/**
 * routes/google.js — Google OAuth 2.0
 * GET /auth/google          → redirect to Google
 * GET /auth/google/callback → handle Google response
 */

const express   = require("express");
const axios     = require("axios");
const jwt       = require("jsonwebtoken");
const userStore = require("../db");
const router    = express.Router();

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL          = process.env.BACKEND_URL || "https://smart-energy-production-aef3.up.railway.app";
const FRONTEND_URL         = process.env.FRONTEND_URL || "http://localhost:5173";
const REDIRECT_URI         = `${BACKEND_URL}/auth/google/callback`;

function generateTokens(userId) {
  return {
    accessToken:  jwt.sign({ userId }, process.env.JWT_SECRET,         { expiresIn: "15m" }),
    refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d"  }),
  };
}

// Step 1: Redirect to Google
router.get("/", (req, res) => {
  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2: Handle Google callback
router.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}?auth_error=google_cancelled`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    });

    // Get user info from Google
    const userRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    const { email, name, sub: googleId } = userRes.data;

    // Find or create user
    let user = await userStore.findByEmail(email);

    if (user) {
      // Link Google to existing account
      if (!user.providers?.google) {
        await userStore.update(user.id, {
          providers: { ...(user.providers || {}), google: true, googleId },
        });
        user = await userStore.findById(user.id);
      }
    } else {
      // Create new account via OAuth
      user = await userStore.createOAuth({ email, name, provider: "google", googleId });
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    await userStore.saveRefreshToken(refreshToken, user.id);

    // Redirect to frontend with tokens
    const params = new URLSearchParams({ access_token: accessToken, refresh_token: refreshToken });
    res.redirect(`${FRONTEND_URL}/oauth/callback?${params}`);

  } catch (err) {
    console.error("Google OAuth error:", err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}?auth_error=google_failed`);
  }
});

module.exports = router;