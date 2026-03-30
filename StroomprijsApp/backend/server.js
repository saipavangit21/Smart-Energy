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
const { checkAndSendAlerts, checkAndSendGasAlerts } = require("./email-alerts");
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

// ── Health check (DB + EPEX + data freshness) ──────────────
require("./health-route")(app, pool);
app.get("/api/status-banner", (req, res) => res.json({ active: false }));
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


// ── SmartPrice AI Agent proxy ─────────────────────────────────
app.post("/api/agent/chat", async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: "messages required" });
    }

    const response = await axios.post("https://api.anthropic.com/v1/messages", {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt || "You are a helpful SmartPrice.be assistant for Belgian energy prices.",
      messages: messages.slice(-10), // last 10 messages for context
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
    console.error("[agent] error:", e.response?.data || e.message);
    res.status(500).json({ success: false, error: "Agent error: " + e.message });
  }
});

app.listen(PORT,()=>{
  console.log(`\n⚡ SmartPrice v2 on port ${PORT}`);
  console.log(`   DB: ${process.env.DATABASE_URL?"✅ Supabase":"❌ No DATABASE_URL"}\n`);
});