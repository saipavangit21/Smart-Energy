const express      = require("express");
const cookieParser = require("cookie-parser");
const cors      = require("cors");
const NodeCache = require("node-cache");
const axios     = require("axios");
const { sendMail } = require("./mailer");
require("dotenv").config();

const required = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];
for (const key of required) {
  if (!process.env[key]) { console.error(`Missing env var: ${key}`); process.exit(1); }
}

const authRoutes      = require("./routes/auth");
const googleRoutes    = require("./routes/google");
const teslaRoutes     = require("./routes/tesla");
const attachAnalytics = require("./analytics");
const { checkAndSendAlerts, checkAndSendGasAlerts, sendWeeklyDigest } = require("./email-alerts");
const { startUptimeMonitor } = require("./uptime-monitor");
const { router: gasRoutes } = require("./routes/gas");
const { router: suppliersRoutes, runWeeklyScrape } = require("./routes/suppliers");
const outreachRoutes   = require("./routes/outreach-send");
const dailyPostsRoutes = require("./routes/daily-posts");
const fluviusRoutes    = require("./routes/fluvius");
const pool = require("./db").pool;
const { requireAuth } = require("./middleware/auth");
const { trackHaPing, getHaStats } = require("./ha-tracking");

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
app.use(trackHaPing(pool)); // no-op unless X-SmartPrice-Client: homeassistant header present

app.use("/auth", authRoutes);
app.use("/auth/google", googleRoutes);
app.use("/auth/tesla", teslaRoutes);
app.use("/api/tesla", teslaRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/admin/send-outreach", outreachRoutes);
app.use("/api/admin/daily-posts",  dailyPostsRoutes);
app.use("/api/fluvius",            fluviusRoutes);

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
  const { email, source = "landing", company, name, phone, fleet_size, payroll_provider, reimb_method, metadata } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email" });
  }
  const isB2B = source === "business-audit-form";
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

    // Also persist full B2B data in b2b_leads when submitted from business page
    if (isB2B) {
      const auditData = { name, phone, fleet_size, payroll_provider, reimb_method, ...metadata };
      pool.query(`
        CREATE TABLE IF NOT EXISTS b2b_leads (
          id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, company TEXT,
          audit_data JSONB, source TEXT DEFAULT 'business-page',
          created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `).then(() => pool.query(
        `INSERT INTO b2b_leads (email, company, audit_data, source, created_at)
         VALUES ($1, $2, $3::jsonb, 'business-page', NOW())
         ON CONFLICT (email) DO UPDATE
           SET company = COALESCE($2, b2b_leads.company),
               audit_data = b2b_leads.audit_data || $3::jsonb, updated_at = NOW()`,
        [email.toLowerCase().trim(), company || null, JSON.stringify(auditData)]
      )).catch(e => console.warn("[leads] b2b upsert failed:", e.message));
    }

    const firstName = name ? name.split(" ")[0] : null;
    if (isB2B) {
      sendMail({
        from: "SmartPrice.be <info@smartprice.be>",
        to: email,
        subject: "⚡ SmartPrice — Audit request received",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#F7FEF9;color:#0F1A0F;border-radius:16px;border:1px solid #DCFCE7">
            <div style="font-size:28px;margin-bottom:8px">✅</div>
            <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#16A34A">Audit request received${firstName ? `, ${firstName}` : ""}.</h1>
            <p style="color:#52635A;font-size:15px;line-height:1.7;margin:0 0 20px">
              We're preparing your personalised fleet cost report for <strong>${company || "your company"}</strong>.<br>
              We'll be in touch within <strong>one business day</strong> with a PDF ready to share with your CFO or HR team.
            </p>
            <a href="https://smartprice.be/business" style="display:inline-block;padding:12px 28px;border-radius:50px;background:linear-gradient(135deg,#16A34A,#22C55E);color:#fff;font-weight:800;font-size:14px;text-decoration:none">
              View SmartPrice for Business →
            </a>
            <p style="margin-top:28px;font-size:11px;color:#9DB3A3">
              SmartPrice.be · <a href="https://smartprice.be/privacy" style="color:#9DB3A3">Privacy</a> · GDPR compliant · EU hosted
            </p>
          </div>
        `,
      }).catch(e => console.warn("[leads] B2B email failed:", e.message));
      sendMail({
        from: "SmartPrice.be <info@smartprice.be>",
        to: "info@smartprice.be",
        subject: `🏢 New business audit request — ${company || email}`,
        html: `<p><b>Email:</b> ${email}</p><p><b>Company:</b> ${company||"—"}</p><p><b>Name:</b> ${name||"—"}</p><p><b>Phone:</b> ${phone||"—"}</p><p><b>Fleet size:</b> ${fleet_size||"—"}</p><p><b>Payroll:</b> ${payroll_provider||"—"}</p><p><b>Reimbursement:</b> ${reimb_method||"—"}</p>${metadata?.annual_saving_estimate?`<p><b>Est. saving:</b> €${Number(metadata.annual_saving_estimate).toLocaleString()}/yr</p>`:""}`,
      }).catch(() => {});
    } else if (isNew) {
      sendMail({
        from: process.env.FROM_EMAIL || "alerts@smartprice.be",
        to: email,
        subject: "⚡ SmartPrice — you're on the list",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#060B14;color:#E8EDF5;border-radius:16px">
            <div style="font-size:28px;margin-bottom:8px">⚡</div>
            <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#10B981">You're in.</h1>
            <p style="color:#6B8099;font-size:15px;line-height:1.7;margin:0 0 20px">
              Every day at <strong style="color:#E8EDF5">13:00 CET</strong> we publish tomorrow's prices.<br>
              We'll alert you when the <strong style="color:#10B981">cheapest energy window</strong> opens for Belgium — EV charging, heat pumps &amp; appliances.
            </p>
            <a href="https://smartprice.be" style="display:inline-block;padding:12px 28px;border-radius:50px;background:linear-gradient(135deg,#10B981,#0D9488);color:#fff;font-weight:800;font-size:14px;text-decoration:none">
              View live prices →
            </a>
            <p style="margin-top:28px;font-size:11px;color:#334455">
              SmartPrice.be · <a href="https://smartprice.be/privacy" style="color:#334455">Privacy</a> · You can unsubscribe anytime by replying "unsubscribe"
            </p>
          </div>
        `,
      }).catch(e => console.warn("[leads] welcome email failed:", e.message));
    }
    res.json({ success: true, is_new: isNew });
  } catch (e) {
    console.error("[leads]", e.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
app.get("/api/prices/today",async(req,res)=>{ try{const{today,tomorrow}=todayAndTomorrow();const{prices,source}=await getPrices(today,tomorrow);const d=enrich(prices);res.json({success:true,source,data:d,stats:computeStats(d),fetched_at:new Date().toISOString()});}catch(e){res.status(500).json({success:false,error:e.message});} });
app.get("/api/current",async(req,res)=>{ try{const{today,tomorrow}=todayAndTomorrow();const{prices}=await getPrices(today,tomorrow);const enriched=enrich(prices);const c=enriched.find(p=>p.is_current)||enriched.filter(p=>p.day==="today").slice(-1)[0];res.json({success:true,current:c,timestamp:new Date().toISOString()});}catch(e){res.status(500).json({success:false,error:e.message});} });
app.get("/api/cheapest",async(req,res)=>{ try{const n=parseInt(req.query.hours||"5");const{today,tomorrow}=todayAndTomorrow();const{prices}=await getPrices(today,tomorrow);const enriched=enrich(prices);const now=new Date();const c=[...enriched.filter(p=>new Date(p.timestamp)>=now)].sort((a,b)=>a.price_eur_mwh-b.price_eur_mwh).slice(0,n);res.json({success:true,cheapest_hours:c});}catch(e){res.status(500).json({success:false,error:e.message});} });

app.get("/api/prices/history",async(req,res)=>{
  try {
    const days = Math.min(parseInt(req.query.days||7), 30);
    const now = new Date();
    const slots = Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (days - i) * 86400000);
      return { d, dateStr: toLocalISODate(d) };
    });
    const settled = await Promise.allSettled(slots.map(({ dateStr }) => getPrices(dateStr, dateStr)));
    const results = [];
    settled.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      const { d, dateStr } = slots[i];
      const dayPrices = r.value.prices.map(p => { const pd = new Date(p.timestamp); const localHour = getLocalHour(pd); return { ...p, hour: localHour, hour_label: `${String(localHour).padStart(2,"0")}:00` }; });
      const vals = dayPrices.map(p => p.price_eur_mwh);
      results.push({ date: dateStr, label: d.toLocaleDateString("nl-BE", { weekday:"short", day:"numeric", month:"short", timeZone:"Europe/Brussels" }), prices: dayPrices, avg: +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2), min: +Math.min(...vals).toFixed(2), max: +Math.max(...vals).toFixed(2), negative_hours: dayPrices.filter(p=>p.price_eur_mwh<0).length });
    });
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

// Daily social posts + Facebook auto-post — every day at 08:00 Brussels time
(function scheduleDailyPosts() {
  async function fire() {
    try {
      await axiosHttp.post(`http://localhost:${PORT}/api/admin/daily-posts`, {},
        { headers: { "x-admin-secret": process.env.ADMIN_SECRET }, timeout: 30000 });
      console.log("[daily-posts] ✅ Auto-posted at 08:00 Brussels");
    } catch (e) {
      console.warn("[daily-posts] Auto-post failed:", e.message);
    }
    setTimeout(fire, 24 * 60 * 60 * 1000);
  }

  const brussels = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
  const h = brussels.getHours();

  // If server restarts during the 08:xx window, catch up immediately
  if (h === 8) {
    console.log("[daily-posts] 🔄 Catch-up: server started during 08:xx — posting now");
    setTimeout(fire, 5000);
    return;
  }

  const next = new Date(brussels);
  next.setHours(8, 0, 0, 0);
  if (h >= 9) next.setDate(next.getDate() + 1);
  const msUntil8am = next - brussels;
  setTimeout(fire, msUntil8am);
  console.log(`   Daily posts: ⏰ Next auto-post in ${Math.round(msUntil8am / 60000)} min`);
})();

// Weekly digest email — checked hourly, sends once the DB guard allows it on
// Monday at/after 08:00 Brussels time. Hourly self-check (rather than a single
// setTimeout aimed at the exact next Monday 8am) means a redeploy can never
// push the schedule a full week out — worst case it's caught within the hour.
if (process.env.RESEND_API_KEY) {
  function checkWeeklyDigest() {
    const brussels = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels", weekday: "short", hour: "numeric", hour12: false,
    }).formatToParts(new Date()).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    if (brussels.weekday === "Mon" && parseInt(brussels.hour) >= 8) {
      sendWeeklyDigest(pool).catch(e => console.error("[weekly-digest] Error:", e.message));
    }
  }
  checkWeeklyDigest();
  setInterval(checkWeeklyDigest, 60 * 60 * 1000);
  console.log("   Weekly digest: ⏰ Hourly check — sends Monday 08:00+ Brussels (DB dedup guard)");
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
  try {
    await sendMail({ from: "SmartPrice.be <info@smartprice.be>", to, subject: subject || "SmartPrice.be", html });
    console.log(`[Admin] Email sent to ${to}`);
    res.json({ success: true });
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    console.error(`[Admin] send-template failed:`, msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// Public stats for landing page social proof (no auth needed)
app.get("/api/stats", async (req, res) => {
  try {
    const today = new Date();
    const tzDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(today);
    const [users, evToday] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM users"),
      pool.query(`SELECT COUNT(*) AS count FROM analytics_events WHERE event = 'ev_page_view' AND created_at::date = $1`, [tzDate]),
    ]);
    res.set("Cache-Control", "public, max-age=300");
    res.json({
      success: true,
      registered_users: parseInt(users.rows[0].total),
      ev_views_today: parseInt(evToday.rows[0].count),
    });
  } catch (e) {
    res.json({ success: false, registered_users: 60, ev_views_today: 120 });
  }
});

// GET /api/referral-source?source=facebook&email=... — tracks how users found SmartPrice
app.get("/api/referral-source", async (req, res) => {
  const { source, email } = req.query;
  if (source) {
    console.log(`[referral] source=${source} email=${email || "unknown"}`);
    try {
      if (email) {
        await pool.query(
          `UPDATE users SET preferences = COALESCE(preferences, '{}') || $1::jsonb WHERE email = $2`,
          [JSON.stringify({ referral_source: source }), email.toLowerCase().trim()]
        );
      }
    } catch (e) { /* non-critical */ }
  }
  // Redirect to dashboard so clicking the link logs them in
  res.redirect("https://smartprice.be/?ref_tracked=1");
});

// POST /api/newsletter/subscribe
app.post("/api/newsletter/subscribe", async (req, res) => {
  const { email, name, language = "nl" } = req.body || {};
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email" });
  }
  const crypto = require("crypto");
  const token  = crypto.randomBytes(32).toString("hex");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        language TEXT DEFAULT 'nl',
        unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        subscribed_at TIMESTAMPTZ DEFAULT NOW(),
        active BOOLEAN DEFAULT TRUE
      )
    `);
    const { rows } = await pool.query(
      `INSERT INTO newsletter_subscribers (email, name, language, unsubscribe_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET active = true,
         name = COALESCE(EXCLUDED.name, newsletter_subscribers.name)
       RETURNING id, unsubscribe_token, (xmax = 0) AS is_new`,
      [email.toLowerCase().trim(), name || null, language, token]
    );
    const savedToken = rows[0].unsubscribe_token;
    const unsubUrl   = `${APP_URL}/api/newsletter/unsubscribe?token=${savedToken}`;
    sendMail({
      from: "SmartPrice.be <info@smartprice.be>",
      to: email,
      subject: "⚡ Weekly EPEX digest confirmed — SmartPrice.be",
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060B14;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:36px;">⚡🇧🇪</div>
    <h1 style="color:#fff;font-size:20px;font-weight:900;margin:10px 0 4px;">You're on the list!</h1>
    <p style="color:#64748B;font-size:13px;margin:0;">Weekly EPEX digest · Every Monday 08:00 Brussels</p>
  </div>
  <div style="background:#0A1220;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:24px;margin-bottom:20px;color:#94A3B8;font-size:14px;line-height:1.8;">
    Every Monday morning you'll receive:<br>
    <strong style="color:#E2E8F0;">📊 Last week's EPEX Belgium stats</strong> — avg, min, max, negative hours<br>
    <strong style="color:#E2E8F0;">💡 Insight</strong> — what it means for EV charging & home appliances<br>
    <strong style="color:#E2E8F0;">⚡ Live link</strong> — to today's cheapest hours at smartprice.be
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="https://smartprice.be" style="display:inline-block;background:linear-gradient(135deg,#0D9488,#1A56A4);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:30px;">See live prices →</a>
  </div>
  <div style="text-align:center;color:#334155;font-size:11px;">
    SmartPrice.be · <a href="${unsubUrl}" style="color:#475569;">Unsubscribe</a>
  </div>
</div></body></html>`,
    }).catch(e => console.warn("[newsletter] welcome email failed:", e.message));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/newsletter/unsubscribe?token=... — one-click unsubscribe
app.get("/api/newsletter/unsubscribe", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Missing token");
  try {
    const { rows } = await pool.query(
      "UPDATE newsletter_subscribers SET active = false WHERE unsubscribe_token = $1 RETURNING email",
      [token]
    );
    const html = rows.length
      ? `<html><head><meta charset="utf-8"></head><body style="font-family:system-ui;text-align:center;padding:80px 24px;background:#F0FDF4;"><h2 style="color:#16A34A">✅ Unsubscribed</h2><p style="color:#475569">${rows[0].email} has been removed from the SmartPrice weekly digest.</p><a href="https://smartprice.be" style="color:#16A34A;font-weight:700;">← Back to SmartPrice</a></body></html>`
      : `<html><head><meta charset="utf-8"></head><body style="font-family:system-ui;text-align:center;padding:80px 24px;"><h2>Already unsubscribed or link not found.</h2><a href="https://smartprice.be">← Back</a></body></html>`;
    res.send(html);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// GET /api/user/unsubscribe-digest?email=... — one-click unsubscribe for registered users
app.get("/api/user/unsubscribe-digest", async (req, res) => {
  const email = req.query.email ? Buffer.from(req.query.email, "base64").toString() : null;
  if (!email) return res.status(400).send("Missing email");
  try {
    await pool.query(
      `UPDATE users SET preferences = COALESCE(preferences, '{}') || '{"email_opt_out":true}'::jsonb WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    res.send(`<html><head><meta charset="utf-8"></head><body style="font-family:system-ui;text-align:center;padding:80px 24px;background:#F0FDF4;"><h2 style="color:#16A34A">✅ Unsubscribed</h2><p style="color:#475569">${email} will no longer receive the weekly digest.</p><a href="https://smartprice.be" style="color:#16A34A;font-weight:700;">← Back to SmartPrice</a></body></html>`);
  } catch (e) {
    res.status(500).send("Error");
  }
});

// GET /api/admin/newsletter-stats — subscriber count for admin dashboard
app.get("/api/admin/newsletter-stats", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, language TEXT DEFAULT 'nl',
      unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
      subscribed_at TIMESTAMPTZ DEFAULT NOW(), active BOOLEAN DEFAULT TRUE
    )`);
    const { rows } = await pool.query(
      "SELECT COUNT(*) FILTER (WHERE active) AS active, COUNT(*) AS total FROM newsletter_subscribers"
    );
    res.json({ success: true, active: parseInt(rows[0].active), total: parseInt(rows[0].total) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/admin/unsubscribe-user { secret, email } — GDPR: opt a user out of all email communication
app.post("/api/admin/unsubscribe-user", async (req, res) => {
  const { secret, email } = req.body || {};
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (!email) return res.status(400).json({ success: false, error: "email required" });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET preferences = COALESCE(preferences, '{}') || $1::jsonb WHERE email = $2 RETURNING id, email`,
      [JSON.stringify({ email_opt_out: true, alertEnabled: false, gasAlertEnabled: false }), email.toLowerCase().trim()]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, message: `${rows[0].email} unsubscribed from all email communication` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/ha-integration-stats — distinct Home Assistant integration installs (by hashed IP)
app.get("/api/admin/ha-integration-stats", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    const stats = await getHaStats(pool);
    res.json({ success: true, ...stats });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/weekly-digest-preview — check what data the next digest would send WITHOUT sending
app.get("/api/admin/weekly-digest-preview", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    const selfUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://smart-energy-production-aef3.up.railway.app";

    const [rUsers, rNl, rHistory] = await Promise.all([
      pool.query("SELECT COUNT(*) AS c FROM users WHERE email IS NOT NULL AND email != '' AND COALESCE((preferences->>'email_opt_out')::boolean, false) = false"),
      pool.query("SELECT COUNT(*) AS c FROM newsletter_subscribers WHERE active = true").catch(() => ({ rows: [{ c: 0 }] })),
      axios.get(`${selfUrl}/api/prices/history?days=7`, { timeout: 15000 }).catch(e => ({ error: e.message })),
    ]);

    const historyOk = !rHistory.error;
    const days = rHistory.data?.days || [];
    const allPrices = days.flatMap(d => (d.prices || []).map(h => h.price_eur_mwh)).filter(p => p != null && !isNaN(p));
    const weekStats = allPrices.length > 0 ? {
      avg: (allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(1),
      min: Math.min(...allPrices).toFixed(1),
      max: Math.max(...allPrices).toFixed(1),
      negative: allPrices.filter(p => p < 0).length,
      price_points: allPrices.length,
      days: days.length,
    } : null;

    res.json({
      success: true,
      recipients: { registered: parseInt(rUsers.rows[0].c), newsletter: parseInt(rNl.rows[0].c) },
      history_fetch: historyOk ? "ok" : `FAILED: ${rHistory.error}`,
      week_stats: weekStats,
      ready_to_send: historyOk && weekStats !== null,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Manual trigger: POST /api/admin/send-weekly-digest { secret, force? }
// Add "force": true to bypass the once-per-day guard
app.post("/api/admin/send-weekly-digest", async (req, res) => {
  const { secret, force = false } = req.body || {};
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  res.json({ success: true, message: force ? "Weekly digest sending (forced)…" : "Weekly digest sending in background… (blocked if already sent today)" });
  sendWeeklyDigest(pool, force).catch(e => console.error("[weekly-digest] Manual trigger error:", e.message));
});

// GET /api/admin/search-console — Google Search Console data (last 28 days)
// Requires GOOGLE_SERVICE_ACCOUNT_JSON env var (service account with Search Console access)
app.get("/api/admin/search-console", async (req, res) => {
  if (!process.env.ADMIN_SECRET || req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const gscJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!gscJson) {
    return res.json({ success: false, configured: false, error: "GOOGLE_SERVICE_ACCOUNT_JSON not set" });
  }
  try {
    const jwt  = require("jsonwebtoken");
    const creds = JSON.parse(gscJson);
    const now   = Math.floor(Date.now() / 1000);
    const assertion = jwt.sign(
      { iss: creds.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
        aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 },
      creds.private_key, { algorithm: "RS256" }
    );
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token",
      new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const accessToken = tokenRes.data.access_token;
    const siteUrl  = "https://www.smartprice.be/";
    const encoded  = encodeURIComponent(siteUrl);
    const endDate  = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];
    const hdrs = { Authorization: `Bearer ${accessToken}` };
    const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`;

    const [ov, qRes, pRes] = await Promise.allSettled([
      axios.post(base, { startDate, endDate, rowLimit: 1 }, { headers: hdrs }),
      axios.post(base, { startDate, endDate, dimensions: ["query"], rowLimit: 10 }, { headers: hdrs }),
      axios.post(base, { startDate, endDate, dimensions: ["page"],  rowLimit: 10 }, { headers: hdrs }),
    ]);

    const ovRows = ov.status    === "fulfilled" ? (ov.value.data.rows    || []) : [];
    const qRows  = qRes.status  === "fulfilled" ? (qRes.value.data.rows  || []) : [];
    const pRows  = pRes.status  === "fulfilled" ? (pRes.value.data.rows  || []) : [];

    res.json({
      success: true, configured: true, period: { startDate, endDate },
      overview: ovRows[0]
        ? { clicks: ovRows[0].clicks, impressions: ovRows[0].impressions, ctr: ovRows[0].ctr, position: ovRows[0].position }
        : null,
      topQueries: qRows.map(r => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      topPages:   pRows.map(r => ({ page: r.keys[0].replace("https://www.smartprice.be", ""), clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    });
  } catch (e) {
    res.json({ success: false, configured: true, error: e.response?.data?.error?.message || e.message });
  }
});

// POST /api/admin/broadcast { secret, subject, html } — send one-off email to ALL email users
app.post("/api/admin/broadcast", async (req, res) => {
  const { secret, subject, html } = req.body || {};
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  res.json({ success: true, message: "Broadcasting in background…" });
  (async () => {
    try {
      const { rows: users } = await pool.query("SELECT name, email FROM users WHERE email IS NOT NULL AND email != '' AND COALESCE((preferences->>'email_opt_out')::boolean, false) = false ORDER BY created_at");
      let sent = 0;
      for (const u of users) {
        try {
          await sendMail({
            from: "SmartPrice.be <info@smartprice.be>",
            to: u.email,
            subject,
            html: html.replace(/\{\{name\}\}/g, u.name || "there"),
          });
          sent++;
          await new Promise(r => setTimeout(r, 200));
        } catch (e) { console.error(`[broadcast] Failed to ${u.email}:`, e.message); }
      }
      console.log(`[broadcast] Done — sent to ${sent}/${users.length}`);
    } catch (e) { console.error("[broadcast] Fatal:", e.message); }
  })();
});

// POST /api/fleet-audit-lead — saves B2B fleet audit lead with full audit data
app.post("/api/fleet-audit-lead", async (req, res) => {
  const { email, company, audit } = req.body || {};
  if (!email || !email.includes("@")) return res.status(400).json({ success: false, error: "Valid email required" });
  try {
    await pool.query(
      `INSERT INTO b2b_leads (email, company, audit_data, source, created_at)
       VALUES ($1, $2, $3::jsonb, 'fleet-audit', NOW())
       ON CONFLICT (email) DO UPDATE SET audit_data = $3::jsonb, company = COALESCE($2, b2b_leads.company), updated_at = NOW()`,
      [email.toLowerCase().trim(), company || null, JSON.stringify(audit || {})]
    );
    console.log(`[fleet-audit] New B2B lead: ${email} — fleet ${audit?.fleetSize} cars, overpayment €${audit?.overpayment?.toFixed(0)}`);

    // Notify admin
    sendMail({
      from: "SmartPrice.be <info@smartprice.be>",
      to: "info@smartprice.be",
      subject: `🚗 New B2B fleet audit lead — ${company || email}`,
      html: `<p><strong>Email:</strong> ${email}</p><p><strong>Company:</strong> ${company || "—"}</p><p><strong>Fleet size:</strong> ${audit?.fleetSize} EVs</p><p><strong>Est. overpayment:</strong> €${audit?.overpayment?.toFixed(0)}/year</p>`,
    }).catch(() => {});
    res.json({ success: true });
  } catch (e) {
    // If table doesn't exist yet, create it and retry
    if (e.code === "42P01") {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS b2b_leads (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            company TEXT,
            audit_data JSONB,
            source TEXT DEFAULT 'fleet-audit',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await pool.query(
          `INSERT INTO b2b_leads (email, company, audit_data, source) VALUES ($1, $2, $3::jsonb, 'fleet-audit')`,
          [email.toLowerCase().trim(), company || null, JSON.stringify(audit || {})]
        );
        res.json({ success: true });
      } catch (e2) { res.status(500).json({ success: false, error: e2.message }); }
    } else {
      res.status(500).json({ success: false, error: e.message });
    }
  }
});

// POST /api/business-leads — saves B2B audit request with full contact + fleet details
app.post("/api/business-leads", async (req, res) => {
  const { email, company, name, phone, fleet_size, payroll_provider, reimb_method, metadata } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Valid email required" });
  }
  try {
    // Ensure table exists with all business fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS b2b_leads (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        company TEXT,
        audit_data JSONB,
        source TEXT DEFAULT 'business-page',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const auditData = { name, phone, fleet_size, payroll_provider, reimb_method, ...metadata };
    await pool.query(
      `INSERT INTO b2b_leads (email, company, audit_data, source, created_at)
       VALUES ($1, $2, $3::jsonb, 'business-page', NOW())
       ON CONFLICT (email) DO UPDATE
         SET company    = COALESCE($2, b2b_leads.company),
             audit_data = b2b_leads.audit_data || $3::jsonb,
             updated_at = NOW()`,
      [email.toLowerCase().trim(), company || null, JSON.stringify(auditData)]
    );
    console.log(`[business-leads] New B2B audit request: ${email} — ${company || "no company"}, fleet ${fleet_size}`);

    sendMail({
      from: "SmartPrice.be <info@smartprice.be>",
      to: email,
      subject: "⚡ SmartPrice — Audit request received",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#F7FEF9;color:#0F1A0F;border-radius:16px;border:1px solid #DCFCE7">
          <div style="font-size:28px;margin-bottom:8px">✅</div>
          <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#16A34A">Audit request received${name ? `, ${name.split(" ")[0]}` : ""}.</h1>
          <p style="color:#52635A;font-size:15px;line-height:1.7;margin:0 0 20px">
            We're preparing your personalised fleet cost report for <strong>${company || "your company"}</strong>.<br>
            We'll be in touch within <strong>one business day</strong> with a PDF ready to share with your CFO or HR team.
          </p>
          <p style="color:#52635A;font-size:13px;line-height:1.7;margin:0 0 24px">
            In the meantime, explore the live EPEX Spot data and fleet tools at SmartPrice.be.
          </p>
          <a href="https://smartprice.be/business" style="display:inline-block;padding:12px 28px;border-radius:50px;background:linear-gradient(135deg,#16A34A,#22C55E);color:#fff;font-weight:800;font-size:14px;text-decoration:none">
            View SmartPrice for Business →
          </a>
          <p style="margin-top:28px;font-size:11px;color:#9DB3A3">
            SmartPrice.be · <a href="https://smartprice.be/privacy" style="color:#9DB3A3">Privacy</a> · GDPR compliant · EU hosted
          </p>
        </div>
      `,
    }).catch(e => console.warn("[business-leads] prospect email failed:", e.message));
    sendMail({
      from: "SmartPrice.be <info@smartprice.be>",
      to: "info@smartprice.be",
      subject: `🏢 New business audit request — ${company || email}`,
      html: `
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || "—"}</p>
        <p><strong>Name:</strong> ${name || "—"}</p>
        <p><strong>Phone:</strong> ${phone || "—"}</p>
        <p><strong>Fleet size:</strong> ${fleet_size || "—"}</p>
        <p><strong>Payroll provider:</strong> ${payroll_provider || "—"}</p>
        <p><strong>Reimbursement method:</strong> ${reimb_method || "—"}</p>
        ${metadata?.annual_saving_estimate ? `<p><strong>Est. annual saving:</strong> €${metadata.annual_saving_estimate.toLocaleString()}</p>` : ""}
      `,
    }).catch(e => console.warn("[business-leads] admin email failed:", e.message));
    res.json({ success: true });
  } catch (e) {
    console.error("[business-leads]", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT,()=>{
  console.log(`\n⚡ SmartPrice v2 on port ${PORT}`);
  console.log(`   DB: ${process.env.DATABASE_URL?"✅ Supabase":"❌ No DATABASE_URL"}\n`);
  startUptimeMonitor();
});