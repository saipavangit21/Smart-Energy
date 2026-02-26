# StroomSlim - Diagnose and Fix
# Run from stroomslim folder:
#   powershell -ExecutionPolicy Bypass -File fix.ps1

Write-Host ""
Write-Host "=== DIAGNOSIS ===" -ForegroundColor Yellow

# Check what server.js contains
Write-Host ""
Write-Host "server.js first 5 lines:" -ForegroundColor Cyan
Get-Content "backend\server.js" | Select-Object -First 5

Write-Host ""
Write-Host "Does server.js have auth routes?" -ForegroundColor Cyan
$hasAuth = Select-String -Path "backend\server.js" -Pattern "authRoutes" -Quiet
if ($hasAuth) { Write-Host "  YES - auth routes found" -ForegroundColor Green }
else          { Write-Host "  NO  - auth routes MISSING - will fix now" -ForegroundColor Red }

Write-Host ""
Write-Host "Files in backend folder:" -ForegroundColor Cyan
Get-ChildItem "backend" -Recurse | Select-Object FullName

Write-Host ""
Write-Host "=== FIXING ===" -ForegroundColor Yellow

# Create folders
New-Item -ItemType Directory -Force -Path "backend\routes"    | Out-Null
New-Item -ItemType Directory -Force -Path "backend\middleware" | Out-Null

# Write backend\middleware\auth.js
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location).Path "backend\middleware\auth.js"),
  @'
const jwt = require("jsonwebtoken");
const userStore = require("../db");

function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer "))
      return res.status(401).json({ success: false, error: "No token provided" });
    const decoded = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET);
    const user = userStore.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, error: "User not found" });
    req.user = userStore.safeUser(user);
    next();
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID";
    return res.status(401).json({ success: false, error: err.message, code });
  }
}
module.exports = { requireAuth };
'@
)
Write-Host "  created: backend\middleware\auth.js" -ForegroundColor Green

# Write backend\db.js
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location).Path "backend\db.js"),
  @'
const { v4: uuidv4 } = require("uuid");
const users = new Map();
const refreshTokens = new Set();

const userStore = {
  create({ email, passwordHash, name }) {
    const id = uuidv4();
    const user = {
      id,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name || "",
      createdAt: new Date().toISOString(),
      preferences: {
        supplier: "Bolt Energy",
        alertThreshold: 80,
        alertEnabled: false,
        alertChannels: ["app"],
        language: "nl",
      },
      fluvius: { linked: false, ean: null, linkedAt: null },
      providers: { email: true, google: false, apple: false, itsme: false },
    };
    users.set(id, user);
    return user;
  },
  findById(id)    { return users.get(id) || null; },
  findByEmail(email) {
    const n = email.toLowerCase().trim();
    for (const u of users.values()) { if (u.email === n) return u; }
    return null;
  },
  update(id, changes) {
    const u = users.get(id);
    if (!u) return null;
    const updated = { ...u, ...changes, id };
    users.set(id, updated);
    return updated;
  },
  updatePreferences(id, prefs) {
    const u = users.get(id);
    if (!u) return null;
    const updated = { ...u, preferences: { ...u.preferences, ...prefs } };
    users.set(id, updated);
    return updated;
  },
  saveRefreshToken(t)    { refreshTokens.add(t); },
  isValidRefreshToken(t) { return refreshTokens.has(t); },
  deleteRefreshToken(t)  { refreshTokens.delete(t); },
  safeUser(u) {
    if (!u) return null;
    const { passwordHash, ...safe } = u;
    return safe;
  },
  count() { return users.size; },
};

module.exports = userStore;
'@
)
Write-Host "  created: backend\db.js" -ForegroundColor Green

# Write backend\routes\auth.js
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location).Path "backend\routes\auth.js"),
  @'
const express    = require("express");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const rateLimit  = require("express-rate-limit");
const userStore  = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

const loginLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20 });
const registerLimiter = rateLimit({ windowMs: 60*60*1000, max: 20 });

function generateTokens(userId) {
  return {
    accessToken:  jwt.sign({ userId }, process.env.JWT_SECRET,         { expiresIn: "15m" }),
    refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d"  }),
  };
}

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "Email and password required" });
    if (password.length < 8)
      return res.status(400).json({ success: false, error: "Password min 8 characters" });
    if (userStore.findByEmail(email))
      return res.status(409).json({ success: false, error: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = userStore.create({ email, passwordHash, name });
    const { accessToken, refreshToken } = generateTokens(user.id);
    userStore.saveRefreshToken(refreshToken);
    res.status(201).json({ success: true, message: "Account created successfully", user: userStore.safeUser(user), accessToken, refreshToken });
  } catch (e) {
    console.error("Register error:", e);
    res.status(500).json({ success: false, error: "Registration failed: " + e.message });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "Email and password required" });
    const user = userStore.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    const { accessToken, refreshToken } = generateTokens(user.id);
    userStore.saveRefreshToken(refreshToken);
    res.json({ success: true, user: userStore.safeUser(user), accessToken, refreshToken });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ success: false, error: "Login failed: " + e.message });
  }
});

router.post("/refresh", (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || !userStore.isValidRefreshToken(refreshToken))
      return res.status(401).json({ success: false, error: "Invalid refresh token" });
    const { userId } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = userStore.findById(userId);
    if (!user) return res.status(401).json({ success: false, error: "User not found" });
    userStore.deleteRefreshToken(refreshToken);
    const tokens = generateTokens(user.id);
    userStore.saveRefreshToken(tokens.refreshToken);
    res.json({ success: true, ...tokens });
  } catch (e) {
    res.status(401).json({ success: false, error: "Invalid refresh token" });
  }
});

router.post("/logout", (req, res) => {
  if (req.body.refreshToken) userStore.deleteRefreshToken(req.body.refreshToken);
  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.put("/preferences", requireAuth, (req, res) => {
  try {
    const allowed = ["supplier","alertThreshold","alertEnabled","alertChannels","language"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const updated = userStore.updatePreferences(req.user.id, updates);
    res.json({ success: true, preferences: updated.preferences });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update preferences" });
  }
});

module.exports = router;
'@
)
Write-Host "  created: backend\routes\auth.js" -ForegroundColor Green

# Write backend\server.js  (THE KEY FIX)
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location).Path "backend\server.js"),
  @'
const express   = require("express");
const cors      = require("cors");
const NodeCache = require("node-cache");
const axios     = require("axios");
require("dotenv").config();

// Validate JWT secrets on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 10) {
  console.error("ERROR: JWT_SECRET missing in backend/.env"); process.exit(1);
}

const authRoutes      = require("./routes/auth");
const { requireAuth } = require("./middleware/auth");

const app   = express();
const PORT  = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: 900 });

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use("/auth", authRoutes);

// ── Helpers ───────────────────────────────────────────────────
function toISODate(d) { return d.toISOString().split("T")[0]; }
function todayAndTomorrow() {
  const t = new Date(), m = new Date(t);
  m.setDate(t.getDate() + 1);
  return { today: toISODate(t), tomorrow: toISODate(m) };
}
function getPriceCategory(v) {
  if (v < 0)   return "negative";
  if (v < 50)  return "very_cheap";
  if (v < 90)  return "cheap";
  if (v < 130) return "moderate";
  if (v < 160) return "expensive";
  return "peak";
}
function computeStats(prices) {
  const calc = arr => {
    if (!arr.length) return null;
    const v = arr.map(p => p.price_eur_mwh);
    return { min: Math.min(...v), max: Math.max(...v), avg: +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2), negative_hours: arr.filter(p=>p.price_eur_mwh<0).length };
  };
  return { today: calc(prices.filter(p=>p.day==="today")), tomorrow: calc(prices.filter(p=>p.day==="tomorrow")) };
}
async function fetchEC(s, e) {
  const k = `ec-${s}-${e}`; if (cache.has(k)) return cache.get(k);
  const { data } = await axios.get(`https://api.energy-charts.info/price?bzn=BE&start=${s}&end=${e}`, { timeout: 10000 });
  const prices = data.unix_seconds.map((ts, i) => ({ timestamp: new Date(ts*1000).toISOString(), price_eur_mwh: data.price[i], price_eur_kwh: +(data.price[i]/1000).toFixed(6), source: "Energy-Charts" }));
  cache.set(k, prices); return prices;
}
async function fetchElia(s, e) {
  const k = `elia-${s}-${e}`; if (cache.has(k)) return cache.get(k);
  const { data } = await axios.get("https://opendata.elia.be/api/explore/v2.1/catalog/datasets/ods003/records", { timeout: 10000, params: { limit: 100, order_by: "datetime", where: `datetime >= "${s}T00:00:00" AND datetime <= "${e}T23:59:59"` } });
  const prices = (data.results||[]).map(r => ({ timestamp: r.datetime, price_eur_mwh: r.price, price_eur_kwh: +(r.price/1000).toFixed(6), source: "Elia Open Data" }));
  cache.set(k, prices); return prices;
}
function enrich(prices) {
  const now = new Date(), ts = toISODate(now);
  return prices.map(p => { const d = new Date(p.timestamp), it = toISODate(d)===ts; return { ...p, day: it?"today":"tomorrow", hour: d.getHours(), hour_label: `${String(d.getHours()).padStart(2,"0")}:00`, is_current: it&&d.getHours()===now.getHours(), is_negative: p.price_eur_mwh<0, price_category: getPriceCategory(p.price_eur_mwh) }; });
}
async function getPrices(s, e) {
  try { return { prices: await fetchEC(s, e), source: "Energy-Charts" }; }
  catch (e1) { try { return { prices: await fetchElia(s, e), source: "Elia" }; } catch (e2) { throw new Error(`Both failed: ${e1.message}`); } }
}

// ── Routes ────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", version: "2.0.0", jwt_configured: !!process.env.JWT_SECRET, timestamp: new Date().toISOString() }));

app.get("/api/prices/today", async (req, res) => {
  try { const {today,tomorrow} = todayAndTomorrow(); const {prices,source} = await getPrices(today,tomorrow); const d = enrich(prices); res.json({ success: true, source, data: d, stats: computeStats(d), fetched_at: new Date().toISOString() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get("/api/current", async (req, res) => {
  try { const {today} = todayAndTomorrow(); const {prices} = await getPrices(today,today); const h = new Date().getHours(); const c = prices.find(p=>new Date(p.timestamp).getHours()===h)||prices[prices.length-1]; res.json({ success: true, current: c, timestamp: new Date().toISOString() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get("/api/cheapest", async (req, res) => {
  try { const n = parseInt(req.query.hours||"5"); const {today,tomorrow} = todayAndTomorrow(); const {prices} = await getPrices(today,tomorrow); const now = new Date(); const c = [...prices.filter(p=>new Date(p.timestamp)>=now)].sort((a,b)=>a.price_eur_mwh-b.price_eur_mwh).slice(0,n); res.json({ success: true, cheapest_hours: c }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get("/api/user/dashboard", requireAuth, async (req, res) => {
  try { const {today,tomorrow} = todayAndTomorrow(); const {prices,source} = await getPrices(today,tomorrow); const d = enrich(prices); const c = prices.find(p=>new Date(p.timestamp).getHours()===new Date().getHours())||null; res.json({ success: true, user: { name: req.user.name, preferences: req.user.preferences }, prices: d, stats: computeStats(d), current: c, source }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`\n⚡ StroomSlim v2 running on http://localhost:${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  console.log(`   Prices:   http://localhost:${PORT}/api/prices/today`);
  console.log(`   Register: POST http://localhost:${PORT}/auth/register\n`);
});
'@
)
Write-Host "  created: backend\server.js" -ForegroundColor Green

# Write backend\.env (preserve ENTSOE key)
$existingEntsoe = ""
if (Test-Path "backend\.env") {
  $envContent = Get-Content "backend\.env" -Raw -ErrorAction SilentlyContinue
  if ($envContent -match "ENTSOE_API_KEY=([^\r\n]+)") { $existingEntsoe = $Matches[1].Trim() }
}

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location).Path "backend\.env"),
  "PORT=3001`nFRONTEND_URL=http://localhost:5173`nJWT_SECRET=stroomslim_jwt_secret_key_belgium_2025`nJWT_REFRESH_SECRET=stroomslim_refresh_secret_belgium_2025`nJWT_EXPIRES_IN=15m`nJWT_REFRESH_EXPIRES_IN=7d`nENTSOE_API_KEY=$existingEntsoe`n"
)
Write-Host "  created: backend\.env (ENTSOE key preserved: $existingEntsoe)" -ForegroundColor Green

# Write frontend\vite.config.js  (THE OTHER KEY FIX - proxy /auth)
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location).Path "frontend\vite.config.js"),
  @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api":  { target: "http://localhost:3001", changeOrigin: true },
      "/auth": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
'@
)
Write-Host "  created: frontend\vite.config.js (added /auth proxy)" -ForegroundColor Green

# Install new backend dependencies
Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Push-Location backend
npm install
Pop-Location

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  DONE! Now:" -ForegroundColor Green
Write-Host ""
Write-Host "  1. Stop BOTH terminals (Ctrl+C)" -ForegroundColor White
Write-Host "  2. Terminal 1: cd backend  && npm run dev" -ForegroundColor Cyan
Write-Host "  3. Terminal 2: cd frontend && npm run dev" -ForegroundColor Cyan
Write-Host "  4. Open: http://localhost:5173" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Green