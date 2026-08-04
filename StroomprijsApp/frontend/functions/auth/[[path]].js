import { proxyToRailway } from "../_proxy.js";

export async function onRequest(context) {
  return proxyToRailway(context.request);
}
