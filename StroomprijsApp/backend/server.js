const express   = require("express");
const cors      = require("cors");
const NodeCache = require("node-cache");
const axios     = require("axios");
require("dotenv").config();

const required = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];
for (const key of required) {
  if (!process.env[key]) { console.error(`Missing env var: ${key}`); process.exit(1); }
}

const authRoutes      = require("./routes/auth");
const { requireAuth } = require("./middleware/auth");

const app   = express();
app.set("trust proxy", 1); // Required for Railway/Vercel rate limiting
const PORT  = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: 900 });

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use("/auth", authRoutes);

function toISODate(d) { return d.toISOString().split("T")[0]; }
function todayAndTomorrow() {
  const t = new Date(), m = new Date(t); m.setDate(t.getDate()+1);
  return { today: toISODate(t), tomorrow: toISODate(m) };
}
function getPriceCategory(v) {
  if(v<0) return "negative"; if(v<50) return "very_cheap";
  if(v<90) return "cheap"; if(v<130) return "moderate";
  if(v<160) return "expensive"; return "peak";
}
function computeStats(prices) {
  const calc = arr => {
    if(!arr.length) return null;
    const v = arr.map(p=>p.price_eur_mwh);
    return { min:Math.min(...v), max:Math.max(...v), avg:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2), negative_hours:arr.filter(p=>p.price_eur_mwh<0).length };
  };
  return { today:calc(prices.filter(p=>p.day==="today")), tomorrow:calc(prices.filter(p=>p.day==="tomorrow")) };
}
async function fetchEC(s,e) {
  const k=`ec-${s}-${e}`; if(cache.has(k)) return cache.get(k);
  const {data} = await axios.get(`https://api.energy-charts.info/price?bzn=BE&start=${s}&end=${e}`,{timeout:10000});
  const prices = data.unix_seconds.map((ts,i)=>({timestamp:new Date(ts*1000).toISOString(),price_eur_mwh:data.price[i],price_eur_kwh:+(data.price[i]/1000).toFixed(6),source:"Energy-Charts"}));
  cache.set(k,prices); return prices;
}
async function fetchElia(s,e) {
  const k=`elia-${s}-${e}`; if(cache.has(k)) return cache.get(k);
  const {data} = await axios.get("https://opendata.elia.be/api/explore/v2.1/catalog/datasets/ods003/records",{timeout:10000,params:{limit:100,order_by:"datetime",where:`datetime >= "${s}T00:00:00" AND datetime <= "${e}T23:59:59"`}});
  const prices = (data.results||[]).map(r=>({timestamp:r.datetime,price_eur_mwh:r.price,price_eur_kwh:+(r.price/1000).toFixed(6),source:"Elia Open Data"}));
  cache.set(k,prices); return prices;
}
function enrich(prices) {
  const now=new Date(),ts=toISODate(now);
  return prices.map(p=>{const d=new Date(p.timestamp),it=toISODate(d)===ts;return{...p,day:it?"today":"tomorrow",hour:d.getHours(),hour_label:`${String(d.getHours()).padStart(2,"0")}:00`,is_current:it&&d.getHours()===now.getHours(),is_negative:p.price_eur_mwh<0,price_category:getPriceCategory(p.price_eur_mwh)};});
}
async function getPrices(s,e) {
  try{return{prices:await fetchEC(s,e),source:"Energy-Charts"};}
  catch(e1){try{return{prices:await fetchElia(s,e),source:"Elia Open Data"};}catch(e2){throw new Error(`Both failed`);}}
}

app.get("/api/health",(req,res)=>res.json({status:"ok",version:"2.0.0",timestamp:new Date().toISOString()}));

app.get("/api/prices/today",async(req,res)=>{
  try{const{today,tomorrow}=todayAndTomorrow();const{prices,source}=await getPrices(today,tomorrow);const d=enrich(prices);res.json({success:true,source,data:d,stats:computeStats(d),fetched_at:new Date().toISOString()});}
  catch(e){res.status(500).json({success:false,error:e.message});}
});
app.get("/api/current",async(req,res)=>{
  try{const{today}=todayAndTomorrow();const{prices}=await getPrices(today,today);const h=new Date().getHours();const c=prices.find(p=>new Date(p.timestamp).getHours()===h)||prices[prices.length-1];res.json({success:true,current:c,timestamp:new Date().toISOString()});}
  catch(e){res.status(500).json({success:false,error:e.message});}
});
app.get("/api/cheapest",async(req,res)=>{
  try{const n=parseInt(req.query.hours||"5");const{today,tomorrow}=todayAndTomorrow();const{prices}=await getPrices(today,tomorrow);const now=new Date();const c=[...prices.filter(p=>new Date(p.timestamp)>=now)].sort((a,b)=>a.price_eur_mwh-b.price_eur_mwh).slice(0,n);res.json({success:true,cheapest_hours:c});}
  catch(e){res.status(500).json({success:false,error:e.message});}
});
app.get("/api/user/dashboard",requireAuth,async(req,res)=>{
  try{const{today,tomorrow}=todayAndTomorrow();const{prices,source}=await getPrices(today,tomorrow);const d=enrich(prices);const c=prices.find(p=>new Date(p.timestamp).getHours()===new Date().getHours())||null;res.json({success:true,user:{name:req.user.name,preferences:req.user.preferences},prices:d,stats:computeStats(d),current:c,source});}
  catch(e){res.status(500).json({success:false,error:e.message});}
});

app.listen(PORT,()=>{
  console.log(`\n⚡ StroomSlim v2 on port ${PORT}`);
  console.log(`   DB: ${process.env.DATABASE_URL?"✅ Supabase":"❌ No DATABASE_URL"}\n`);
});