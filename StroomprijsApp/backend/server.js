const express      = require("express");
const cookieParser = require("cookie-parser");
const cors      = require("cors");
const NodeCache = require("node-cache");
const axios     = require("axios");
require("dotenv").config();

const required = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];
for (const key of required) {
  if (!process.env[key]) { console.error(`Missing env var: ${key}`); process.exit(1); }
}

const authRoutes      = require("./routes/auth");
const googleRoutes    = require("./routes/google");
const attachAnalytics = require("./analytics");
const { checkAndSendAlerts, checkAndSendGasAlerts, sendWeeklyDigest } = require("./email-alerts");
const { startUptimeMonitor } = require("./uptime-monitor");
const { router: gasRoutes } = require("./routes/gas");
const { router: suppliersRoutes, runWeeklyScrape } = require("./routes/suppliers");
const pool = require("./db").pool;
const { requireAuth } = require("./middleware/auth");

const app   = express();
app.set("trust proxy", 1);
const PORT  = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: 900 });

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://smartprice.be",
  "https://www.smartprice.be",
  "https://smart-energy-six.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    // Allow all Vercel preview deployments for this project
    if (origin.endsWith(".vercel.app")) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
// ── Analytics middleware — must be BEFORE route mounts ──────
attachAnalytics(app, pool);

app.use("/auth", authRoutes);
app.use("/auth/google", googleRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/suppliers", suppliersRoutes);

const TZ = "Europe/Brussels";
function toLocalISODate(d) { return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d); }
function getLocalHour(d) { return parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false }).format(d)); }
function toISODate(d) { return toLocalISODate(d); }
function todayAndTomorrow() { const t = new Date(); return { today: toLocalISODate(t), tomorrow: toLocalISODate(new Date(t.getTime() + 86400000)) }; }
function getPriceCategory(v) { if(v<0) return "negative"; if(v<50) return "very_cheap"; if(v<90) return "cheap"; if(v<130) return "moderate"; if(v<160) return "expensive"; return "peak"; }
function computeStats(prices) {
  const calc = arr => {
    if(!arr.length) return null;
    // Deduplicate to one entry per hour before computing stats
    const hourly = Object.values(arr.reduce((acc, p) => {
      const key = p.hour_label || p.hour;
      if (!acc[key]) acc[key] = p;
      return acc;
    }, {}));
    const v = hourly.map(p=>p.price_eur_mwh).filter(x => x != null && !isNaN(x));
    return { min:Math.min(...v), max:Math.max(...v), avg:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2), negative_hours:hourly.filter(p=>p.price_eur_mwh<0).length };
  };
  return { today:calc(prices.filter(p=>p.day==="today")), tomorrow:calc(prices.filter(p=>p.day==="tomorrow")) };
}
async function fetchEC(s,e) { const k=`ec-${s}-${e}`; if(cache.has(k)) return cache.get(k); const {data} = await axios.get(`https://api.energy-charts.info/price?bzn=BE&start=${s}&end=${e}`,{timeout:10000}); const prices = data.unix_seconds.map((ts,i)=>({timestamp:new Date(ts*1000).toISOString(),price_eur_mwh:data.price[i],price_eur_kwh:+(data.price[i]/1000).toFixed(6),source:"Energy-Charts"})); if(!prices.length) throw new Error("Energy-Charts returned empty data"); cache.set(k,prices); return prices; }

async function fetchENTSOE(s,e) {
  if(!process.env.ENTSOE_API_KEY) throw new Error("ENTSOE_API_KEY not configured");
  const k=`entsoe-${s}-${e}`; if(cache.has(k)) return cache.get(k);
  // Start from previous day 21:00 UTC to capture full Brussels midnight (CET=UTC+1, CEST=UTC+2)
  const startDate=new Date(s+"T00:00:00Z"); startDate.setUTCDate(startDate.getUTCDate()-1);
  const start=startDate.toISOString().slice(0,10).replace(/-/g,"")+"2100";
  const end=e.replace(/-/g,"")+`2300`;
  const {data:xml} = await axios.get("https://web-api.tp.entsoe.eu/api",{
    params:{securityToken:process.env.ENTSOE_API_KEY,documentType:"A44",in_Domain:"10YBE----------2",out_Domain:"10YBE----------2",periodStart:start,periodEnd:end},
    timeout:15000, responseType:"text",
  });
  const prices=[];
  const periodRe=/<Period>([\s\S]*?)<\/Period>/g; let pm;
  while((pm=periodRe.exec(xml))!==null){
    const per=pm[1];
    const sm=per.match(/<start>(.*?)<\/start>/); if(!sm) continue;
    const pStart=new Date(sm[1]);
    const pointRe=/<Point>([\s\S]*?)<\/Point>/g; let pp;
    while((pp=pointRe.exec(per))!==null){
      const posM=pp[1].match(/<position>(\d+)<\/position>/);
      const prM=pp[1].match(/<price\.amount>([\d.]+)<\/price\.amount>/);
      if(!posM||!prM) continue;
      const ts=new Date(pStart.getTime()+(parseInt(posM[1])-1)*3600000);
      const mwh=parseFloat(prM[1]);
      prices.push({timestamp:ts.toISOString(),price_eur_mwh:mwh,price_eur_kwh:+(mwh/1000).toFixed(6),source:"ENTSO-E"});
    }
  }
  if(!prices.length) throw new Error("ENTSO-E returned no prices");
  cache.set(k,prices); return prices;
}

function enrich(prices) { const now=new Date(),ts=toISODate(now); return prices.map(p=>{ const d=new Date(p.timestamp); const localDate=toLocalISODate(d); const localHour=getLocalHour(d); const nowHour=getLocalHour(now); const it=localDate===ts; return{...p,day:it?"today":"tomorrow",hour:localHour,hour_label:`${String(localHour).padStart(2,"0")}:00`,is_current:it&&localHour===nowHour,is_negative:p.price_eur_mwh<0,price_category:getPriceCategory(p.price_eur_mwh)}; }); }
async function getPrices(s,e) {
  try{return{prices:await fetchEC(s,e),source:"Energy-Charts"};}catch(e1){
    console.warn("[prices] Energy-Charts failed:",e1.message);
    try{return{prices:await fetchENTSOE(s,e),source:"ENTSO-E"};}catch(e2){
      console.warn("[prices] ENTSO-E failed:",e2.message);
      throw new Error("Price data temporarily unavailable. Energy-Charts is down"+(process.env.ENTSOE_API_KEY?"":" — add ENTSOE_API_KEY env var for a reliable fallback")+". Please retry in a few minutes.");
    }
  }
}

// ── Generation mix + Cross-border flows (ENTSO-E) ──────────
const PSR_MAP = {
  B01:"Biomass", B02:"Lignite", B04:"Fossil Gas", B05:"Coal",
  B09:"Geothermal", B10:"Hydro Pump", B11:"Hydro ROR",
  B14:"Nuclear", B15:"Other RE", B16:"Solar",
  B17:"Waste", B18:"Wind Offshore", B19:"Wind Onshore", B20:"Other",
};
const BELGIUM_EIC = "10YBE----------2";
const BORDERS = [
  { code:"FR", eic:"10YFR-RTE------C", name:"France" },
  { code:"NL", eic:"10YNL----------L", name:"Netherlands" },
  { code:"GB", eic:"10YGB----------A", name:"UK" },
  { code:"LU", eic:"10YLU-CEGEDEL-NQ", name:"Luxembourg" },
];

function entsoeRange(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1);
  return { start: d.toISOString().slice(0,10).replace(/-/g,"") + "2100", end: dateStr.replace(/-/g,"") + "2300" };
}

function parseHourlyPoints(xml, targetDate) {
  const out = {};
  const perRe = /<Period>([\s\S]*?)<\/Period>/g; let pm;
  while ((pm = perRe.exec(xml)) !== null) {
    const per = pm[1];
    const sm = per.match(/<start>(.*?)<\/start>/); if (!sm) continue;
    const pStart = new Date(sm[1]);
    const ptRe = /<Point>([\s\S]*?)<\/Point>/g; let pp;
    while ((pp = ptRe.exec(per)) !== null) {
      const posM = pp[1].match(/<position>(\d+)<\/position>/);
      const qtyM = pp[1].match(/<quantity>([\d.]+)<\/quantity>/);
      if (!posM || !qtyM) continue;
      const d = new Date(pStart.getTime() + (parseInt(posM[1]) - 1) * 3600000);
      if (toLocalISODate(d) !== targetDate) continue;
      const h = getLocalHour(d);
      const lbl = String(h).padStart(2,"0") + ":00";
      out[lbl] = (out[lbl] || 0) + parseFloat(qtyM[1]);
    }
  }
  return out;
}

async function fetchGenerationMix(today) {
  if (!process.env.ENTSOE_API_KEY) throw new Error("ENTSOE_API_KEY not configured");
  const k = `gen-${today}`; if (cache.has(k)) return cache.get(k);
  const { start, end } = entsoeRange(today);
  let xml;
  try {
    // A75 processType A16 = Realised (actual generation, available with ~1h delay)
    const r = await axios.get("https://web-api.tp.entsoe.eu/api", {
      params: { securityToken: process.env.ENTSOE_API_KEY, documentType: "A75", processType: "A16", in_Domain: BELGIUM_EIC, periodStart: start, periodEnd: end },
      timeout: 25000, responseType: "text",
    });
    xml = r.data;
  } catch(e) {
    console.error("[gen] ENTSO-E A75 error:", e.response?.data?.slice?.(0,300) || e.message);
    throw new Error("Generation data unavailable: " + (e.response?.status || e.message));
  }
  if (xml.includes("No matching data found") || xml.includes("<code>999</code>")) {
    throw new Error("No generation data published yet for today (ENTSO-E A75 ~1h delay)");
  }
  const byHour = {};
  const tsRe = /<TimeSeries>([\s\S]*?)<\/TimeSeries>/g; let tm;
  while ((tm = tsRe.exec(xml)) !== null) {
    const ts = tm[1];
    const psrM = ts.match(/<psrType>(B\d+)<\/psrType>/); if (!psrM) continue;
    const name = PSR_MAP[psrM[1]] || psrM[1];
    const pts = parseHourlyPoints(ts, today);
    for (const [lbl, qty] of Object.entries(pts)) {
      const h = parseInt(lbl);
      if (!byHour[lbl]) byHour[lbl] = { hour: h, hour_label: lbl };
      byHour[lbl][name] = (byHour[lbl][name] || 0) + qty;
    }
  }
  const result = Object.values(byHour).sort((a, b) => a.hour - b.hour);
  if (!result.length) throw new Error("No generation data parsed — ENTSO-E A75 may not yet be published");
  cache.set(k, result); return result;
}

async function fetchOneFlow(outEic, inEic, start, end, today) {
  const k = `flow-${outEic}-${inEic}-${today}`;
  if (cache.has(k)) return cache.get(k);
  try {
    const { data: xml } = await axios.get("https://web-api.tp.entsoe.eu/api", {
      params: { securityToken: process.env.ENTSOE_API_KEY, documentType: "A11", out_Domain: outEic, in_Domain: inEic, periodStart: start, periodEnd: end },
      timeout: 20000, responseType: "text",
    });
    const result = parseHourlyPoints(xml, today);
    cache.set(k, result); return result;
  } catch { return {}; }
}

async function fetchFlows(today) {
  if (!process.env.ENTSOE_API_KEY) throw new Error("ENTSOE_API_KEY not configured");
  const { start, end } = entsoeRange(today);
  // For each border fetch export (BE→neighbor) and import (neighbor→BE) in parallel
  const results = await Promise.all(
    BORDERS.flatMap(b => [
      fetchOneFlow(BELGIUM_EIC, b.eic, start, end, today).then(r => ({ border: b, dir: "export", data: r })),
      fetchOneFlow(b.eic, BELGIUM_EIC, start, end, today).then(r => ({ border: b, dir: "import", data: r })),
    ])
  );
  // Build net flows per hour per border (positive = net export)
  const byBorder = {};
  for (const { border, dir, data } of results) {
    if (!byBorder[border.code]) byBorder[border.code] = { code: border.code, name: border.name, net: {} };
    for (const [lbl, mw] of Object.entries(data)) {
      byBorder[border.code].net[lbl] = (byBorder[border.code].net[lbl] || 0) + (dir === "export" ? mw : -mw);
    }
  }
  // Flatten to hourly array
  const allLabels = [...new Set(Object.values(byBorder).flatMap(b => Object.keys(b.net)))].sort();
  const hourly = allLabels.map(lbl => {
    const row = { hour: parseInt(lbl), hour_label: lbl };
    let totalNet = 0;
    for (const b of Object.values(byBorder)) {
      row[b.code] = Math.round(b.net[lbl] || 0);
      totalNet += row[b.code];
    }
    row.total_net = Math.round(totalNet);
    return row;
  });
  return { hourly, borders: BORDERS.map(b => b.code) };
}

app.get("/api/generation/today", async (req, res) => {
  try {
    const { today } = todayAndTomorrow();
    const data = await fetchGenerationMix(today);
    // Compute renewable share and CO2 for each hour
    const CO2 = { Nuclear:12, "Wind Offshore":12, "Wind Onshore":11, Solar:45, "Hydro ROR":24, "Hydro Pump":24, Biomass:230, Lignite:820, Coal:820, "Fossil Gas":490, Waste:300, "Other RE":50, Other:200 };
    const RENEWABLES = new Set(["Solar","Wind Onshore","Wind Offshore","Hydro ROR","Hydro Pump","Biomass","Other RE","Geothermal"]);
    const enriched = data.map(h => {
      let total = 0, renew = 0, co2sum = 0;
      for (const [k, v] of Object.entries(h)) {
        if (typeof v !== "number" || k === "hour") continue;
        total += v;
        if (RENEWABLES.has(k)) renew += v;
        co2sum += v * (CO2[k] || 200);
      }
      return { ...h, total_mw: Math.round(total), renewable_mw: Math.round(renew), renewable_pct: total > 0 ? Math.round(renew / total * 100) : 0, co2_g_kwh: total > 0 ? Math.round(co2sum / total) : 0 };
    });
    res.json({ success: true, data: enriched, fetched_at: new Date().toISOString() });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get("/api/flows/today", async (req, res) => {
  try {
    const { today } = todayAndTomorrow();
    const data = await fetchFlows(today);
    res.json({ success: true, ...data, fetched_at: new Date().toISOString() });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Health check (DB + EPEX + data freshness) ──────────────
require("./health-route")(app, pool);
app.get("/api/status-banner", (req, res) => res.json({ active: false }));

// ── Email lead capture ────────────────────────────────────────
app.post("/api/leads", async (req, res) => {
  const { email, source = "landing" } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email" });
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id         SERIAL PRIMARY KEY,
        email      TEXT UNIQUE NOT NULL,
        source     TEXT DEFAULT 'landing',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const { rows } = await pool.query(
      `INSERT INTO leads (email, source) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET source = EXCLUDED.source
       RETURNING id, created_at, (xmax = 0) AS is_new`,
      [email.toLowerCase().trim(), source]
    );
    const isNew = rows[0].is_new;
    // Send welcome email via Resend if API key present and it's a new lead
    if (isNew && process.env.RESEND_API_KEY) {
      await axios.post("https://api.resend.com/emails", {
        from: process.env.FROM_EMAIL || "alerts@smartprice.be",
        to: email,
        subject: "⚡ SmartPrice — you're on the list",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#060B14;color:#E8EDF5;border-radius:16px">
            <div style="font-size:28px;margin-bottom:8px">⚡</div>
            <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#10B981">You're in.</h1>
            <p style="color:#6B8099;font-size:15px;line-height:1.7;margin:0 0 20px">
              Every day at <strong style="color:#E8EDF5">13:00 CET</strong> we publish tomorrow's prices.<br>
              We'll alert you when the <strong style="color:#10B981">cheapest charging window</strong> opens for Belgium.
            </p>
            <a href="https://smartprice.be" style="display:inline-block;padding:12px 28px;border-radius:50px;background:linear-gradient(135deg,#10B981,#0D9488);color:#fff;font-weight:800;font-size:14px;text-decoration:none">
              View live prices →
            </a>
            <p style="margin-top:28px;font-size:11px;color:#334455">
              SmartPrice.be · <a href="https://smartprice.be/privacy" style="color:#334455">Privacy</a> · You can unsubscribe anytime by replying "unsubscribe"
            </p>
          </div>
        `,
      }, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        timeout: 8000,
      }).catch(e => console.warn("[leads] Resend failed:", e.message));
    }
    res.json({ success: true, is_new: isNew });
  } catch (e) {
    console.error("[leads]", e.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
app.get("/api/prices/today",async(req,res)=>{ try{const{today,tomorrow}=todayAndTomorrow();const{prices,source}=await getPrices(today,tomorrow);const d=enrich(prices);res.json({success:true,source,data:d,stats:computeStats(d),fetched_at:new Date().toISOString()});}catch(e){res.status(500).json({success:false,error:e.message});} });
app.get("/api/current",async(req,res)=>{ try{const{today,tomorrow}=todayAndTomorrow();const{prices}=await getPrices(today,tomorrow);const enriched=enrich(prices);const c=enriched.find(p=>p.is_current)||enriched.filter(p=>p.day==="today").slice(-1)[0];res.json({success:true,current:c,timestamp:new Date().toISOString()});}catch(e){res.status(500).json({success:false,error:e.message});} });
app.get("/api/cheapest",async(req,res)=>{ try{const n=parseInt(req.query.hours||"5");const{today,tomorrow}=todayAndTomorrow();const{prices}=await getPrices(today,tomorrow);const now=new Date();const c=[...prices.filter(p=>new Date(p.timestamp)>=now)].sort((a,b)=>a.price_eur_mwh-b.price_eur_mwh).slice(0,n);res.json({success:true,cheapest_hours:c});}catch(e){res.status(500).json({success:false,error:e.message});} });

app.get("/api/prices/history",async(req,res)=>{
  try {
    const days = Math.min(parseInt(req.query.days||7), 30);
    const now = new Date(); const results = [];
    for (let i = days; i >= 1; i--) {
      const d = new Date(now.getTime() - i * 86400000); const dateStr = toLocalISODate(d);
      try {
        const {prices} = await getPrices(dateStr, dateStr);
        const dayPrices = prices.map(p => { const pd = new Date(p.timestamp); const localHour = getLocalHour(pd); return { ...p, hour: localHour, hour_label: `${String(localHour).padStart(2,"0")}:00` }; });
        const vals = dayPrices.map(p => p.price_eur_mwh);
        results.push({ date: dateStr, label: d.toLocaleDateString("nl-BE", { weekday:"short", day:"numeric", month:"short", timeZone:"Europe/Brussels" }), prices: dayPrices, avg: +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2), min: +Math.min(...vals).toFixed(2), max: +Math.max(...vals).toFixed(2), negative_hours: dayPrices.filter(p=>p.price_eur_mwh<0).length });
      } catch(e2) {}
    }
    res.json({ success:true, days: results });
  } catch(e){res.status(500).json({success:false,error:e.message});}
});

app.get("/api/user/dashboard",requireAuth,async(req,res)=>{ try{const{today,tomorrow}=todayAndTomorrow();const{prices,source}=await getPrices(today,tomorrow);const d=enrich(prices);const c=prices.find(p=>new Date(p.timestamp).getHours()===new Date().getHours())||null;res.json({success:true,user:{name:req.user.name,preferences:req.user.preferences},prices:d,stats:computeStats(d),current:c,source});}catch(e){res.status(500).json({success:false,error:e.message});} });

app.delete("/auth/delete-account", requireAuth, async (req, res) => {
  try { const userId = req.user.id; await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]); await pool.query("DELETE FROM users WHERE id = $1", [userId]); console.log(`Account deleted: ${req.user.email}`); res.json({ success: true, message: "Account deleted" }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

function scheduleCron() {
  const now = new Date(); const msUntilNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000;
  setTimeout(() => { checkAndSendAlerts(pool); checkAndSendGasAlerts(pool); setInterval(() => { checkAndSendAlerts(pool); checkAndSendGasAlerts(pool); }, 60 * 60 * 1000); }, msUntilNextHour);
  console.log(`   Alerts: ⏰ Next check in ${Math.round(msUntilNextHour/60000)} min`);
}
if (process.env.RESEND_API_KEY) {
  scheduleCron();
} else {
  console.log("   Alerts: ⚠ RESEND_API_KEY not set — email alerts disabled");
}

// Weekly tariff scrape — runs at startup then every 7 days
runWeeklyScrape().catch(e => console.warn("[startup] Initial scrape failed:", e.message));
setInterval(() => { runWeeklyScrape().catch(e => console.warn("[weekly] Scrape failed:", e.message)); }, 7 * 24 * 3600 * 1000);

// Weekly digest email — every Monday at 08:00 Brussels time
if (process.env.RESEND_API_KEY) {
  function scheduleWeeklyDigest() {
    const now = new Date();
    const brussels = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels", weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
    }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const dayNum = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(brussels.weekday);
    const daysUntilMon = dayNum === 1 ? (parseInt(brussels.hour) < 8 ? 0 : 7) : (8 - dayNum) % 7 || 7;
    const hoursUntil8am = daysUntilMon === 0 ? (8 - parseInt(brussels.hour)) : (daysUntilMon * 24 + 8 - parseInt(brussels.hour));
    const msUntil = (hoursUntil8am * 60 - parseInt(brussels.minute)) * 60 * 1000;
    setTimeout(() => {
      sendWeeklyDigest(pool).catch(e => console.error("[weekly-digest] Error:", e.message));
      setInterval(() => sendWeeklyDigest(pool).catch(e => console.error("[weekly-digest] Error:", e.message)), 7 * 24 * 3600 * 1000);
    }, msUntil);
    console.log(`   Weekly digest: ⏰ Next send in ~${Math.round(msUntil/3600000)}h (Monday 08:00 Brussels)`);
  }
  scheduleWeeklyDigest();
}


// ── SmartPrice AI Agent proxy ─────────────────────────────────
app.post("/api/agent/chat", async (req, res) => {
  const { messages, systemPrompt } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: "messages required" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ success: false, unavailable: true, error: "AI assistant not configured" });
  }
  try {
    const response = await axios.post("https://api.anthropic.com/v1/messages", {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: systemPrompt || "You are a helpful SmartPrice.be assistant for Belgian energy prices.",
      messages: messages.slice(-10),
    }, {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
    const reply = response.data?.content?.[0]?.text || "Sorry, no response.";
    res.json({ success: true, reply });
  } catch (e) {
    const apiErr = e.response?.data?.error;
    console.error("[agent] error:", apiErr || e.message);
    if (apiErr?.message?.includes("credit balance")) {
      return res.status(402).json({ success: false, unavailable: true, error: "credits_depleted" });
    }
    if (e.response?.status === 401) {
      return res.status(503).json({ success: false, unavailable: true, error: "invalid_api_key" });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/admin/send-template ─────────────────────────────
// Send a one-off admin email via Resend
// Body: { secret, to, subject, html }  OR  { secret, to, template_id, data }
app.post("/api/admin/send-template", async (req, res) => {
  const { secret, to, subject, html, template_id, data = {} } = req.body || {};

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (!to) {
    return res.status(400).json({ success: false, error: "to is required" });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
  }

  const payload = { from: "SmartPrice.be <hello@smartprice.be>", to };
  if (template_id) {
    payload.template_id = template_id;
    payload.data = data;
  } else {
    payload.subject = subject || "SmartPrice.be";
    payload.html    = html;
  }

  try {
    const { data: result } = await axios.post("https://api.resend.com/emails", payload, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      timeout: 10000,
    });
    console.log(`[Admin] Email sent to ${to} — id: ${result?.id}`);
    res.json({ success: true, id: result?.id });
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    console.error(`[Admin] send-template failed:`, msg);
    res.status(500).json({ success: false, error: msg });
  }
});

app.listen(PORT,()=>{
  console.log(`\n⚡ SmartPrice v2 on port ${PORT}`);
  console.log(`   DB: ${process.env.DATABASE_URL?"✅ Supabase":"❌ No DATABASE_URL"}\n`);
  startUptimeMonitor();
});