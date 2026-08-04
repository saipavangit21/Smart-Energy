// Shared proxy helper for Cloudflare Pages Functions.
// Replicates vercel.json/Netlify _redirects' rewrites so the frontend's
// relative /api and /auth fetch calls keep working unchanged on Cloudflare
// Pages, whose _redirects file can't proxy to an external origin.
const RAILWAY_ORIGIN = "https://smart-energy-production-aef3.up.railway.app";

export async function proxyToRailway(request) {
  const url = new URL(request.url);
  const target = RAILWAY_ORIGIN + url.pathname + url.search;
  const init = {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  };
  const resp = await fetch(target, init);
  return new Response(resp.body, resp);
}

export { RAILWAY_ORIGIN };
