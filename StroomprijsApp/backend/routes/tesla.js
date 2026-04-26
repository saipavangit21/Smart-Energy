/**
 * routes/tesla.js — Tesla Fleet API OAuth integration
 * Flow: GET /auth/tesla → Tesla consent → GET /auth/tesla/callback → store tokens
 * Data: GET /api/tesla/vehicle → battery + charging state for logged-in user
 */

const express    = require("express");
const axios      = require("axios");
const router     = express.Router();
const userStore  = require("../db");
const { requireAuth } = require("../middleware/auth");

const CLIENT_ID     = process.env.TESLA_CLIENT_ID;
const CLIENT_SECRET = process.env.TESLA_CLIENT_SECRET;
const FRONTEND_URL  = process.env.FRONTEND_URL || "https://smartprice.be";
// Vercel proxies /auth/* → Railway, so Tesla must redirect to smartprice.be/auth/tesla/callback
const REDIRECT_URI  = `${FRONTEND_URL}/auth/tesla/callback`;
const TESLA_AUTH    = "https://auth.tesla.com/oauth2/v3";
const TESLA_API     = "https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1";

// Step 1 — redirect user to Tesla consent page
// GET /auth/tesla?userId=<jwt_user_id>  (pass userId in state so callback knows who to save tokens for)
router.get("/", requireAuth, (req, res) => {
  if (!CLIENT_ID) return res.status(500).json({ error: "Tesla integration not configured" });
  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString("base64");
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "vehicle_device_data offline_access",
    state,
  });
  res.redirect(`${TESLA_AUTH}/authorize?${params}`);
});

// Step 2 — Tesla redirects back with code
// GET /auth/tesla/callback?code=...&state=...
router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code) return res.redirect(`${FRONTEND_URL}/?type=ev&tesla_error=cancelled`);

  let userId;
  try {
    userId = JSON.parse(Buffer.from(state, "base64").toString()).userId;
  } catch {
    return res.redirect(`${FRONTEND_URL}/?type=ev&tesla_error=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(`${TESLA_AUTH}/token`, {
      grant_type:    "authorization_code",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri:  REDIRECT_URI,
      audience:      "https://fleet-api.prd.eu.vn.cloud.tesla.com",
    }, { headers: { "Content-Type": "application/json" } });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const expires_at = Date.now() + (expires_in * 1000);

    // Save tokens to user preferences
    await userStore.updatePreferences(userId, {
      tesla_access_token:  access_token,
      tesla_refresh_token: refresh_token,
      tesla_expires_at:    expires_at,
    });

    console.log(`[Tesla] Tokens saved for user ${userId}`);
    res.redirect(`${FRONTEND_URL}/?type=ev&tesla_connected=1`);
  } catch (err) {
    console.error("[Tesla] Token exchange failed:", err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/?type=ev&tesla_error=auth_failed`);
  }
});

// Helper — refresh Tesla token if expired
async function getValidToken(prefs, userId) {
  const { tesla_access_token, tesla_refresh_token, tesla_expires_at } = prefs;
  if (!tesla_access_token) return null;

  // Still valid (with 5 min buffer)
  if (tesla_expires_at && Date.now() < tesla_expires_at - 300000) return tesla_access_token;

  // Refresh
  try {
    const res = await axios.post(`${TESLA_AUTH}/token`, {
      grant_type:    "refresh_token",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: tesla_refresh_token,
    }, { headers: { "Content-Type": "application/json" } });

    const { access_token, refresh_token: new_refresh, expires_in } = res.data;
    await userStore.updatePreferences(userId, {
      tesla_access_token:  access_token,
      tesla_refresh_token: new_refresh,
      tesla_expires_at:    Date.now() + (expires_in * 1000),
    });
    return access_token;
  } catch (err) {
    console.error("[Tesla] Token refresh failed:", err.response?.data || err.message);
    return null;
  }
}

// GET /api/tesla/vehicle — vehicle battery + charging state for logged-in user
router.get("/vehicle", requireAuth, async (req, res) => {
  const prefs = req.user.preferences || {};
  if (!prefs.tesla_access_token) {
    return res.json({ success: false, connected: false });
  }

  const token = await getValidToken(prefs, req.user.id);
  if (!token) return res.json({ success: false, connected: false, error: "Token expired — reconnect Tesla" });

  try {
    // Get vehicle list
    const vehiclesRes = await axios.get(`${TESLA_API}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    const vehicles = vehiclesRes.data?.response || [];
    if (vehicles.length === 0) return res.json({ success: true, connected: true, vehicles: [] });

    // Get charge state for the first vehicle
    const vehicle = vehicles[0];
    let chargeState = null;
    try {
      const dataRes = await axios.get(
        `${TESLA_API}/vehicles/${vehicle.id}/vehicle_data?endpoints=charge_state`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
      );
      chargeState = dataRes.data?.response?.charge_state || null;
    } catch (e) {
      // Vehicle may be asleep — return basic info without charge state
      console.warn(`[Tesla] Vehicle ${vehicle.id} may be asleep:`, e.message);
    }

    res.json({
      success:   true,
      connected: true,
      vehicle: {
        id:           vehicle.id,
        name:         vehicle.display_name || "My Tesla",
        model:        vehicle.vin ? `Model ${vehicle.vin[3]}` : "Tesla",
        state:        vehicle.state, // "online" | "asleep" | "offline"
        battery_level:      chargeState?.battery_level ?? null,
        battery_range_km:   chargeState?.battery_range ? Math.round(chargeState.battery_range * 1.609) : null,
        charging_state:     chargeState?.charging_state ?? null, // "Charging" | "Complete" | "Disconnected"
        charge_limit_soc:   chargeState?.charge_limit_soc ?? 80,
        minutes_to_full:    chargeState?.minutes_to_full_charge ?? null,
      },
    });
  } catch (err) {
    console.error("[Tesla] Vehicle fetch failed:", err.response?.data || err.message);
    res.json({ success: false, connected: true, error: "Could not fetch vehicle data" });
  }
});

// DELETE /api/tesla/disconnect — remove Tesla tokens
router.delete("/disconnect", requireAuth, async (req, res) => {
  await userStore.updatePreferences(req.user.id, {
    tesla_access_token:  null,
    tesla_refresh_token: null,
    tesla_expires_at:    null,
  });
  res.json({ success: true });
});

module.exports = router;
