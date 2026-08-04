import { RAILWAY_ORIGIN } from "../../_proxy.js";

// Tesla fleet API requires this exact path to serve the public key.
export async function onRequest() {
  const resp = await fetch(`${RAILWAY_ORIGIN}/api/tesla/public-key.pem`);
  return new Response(resp.body, resp);
}
