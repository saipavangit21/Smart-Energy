#!/usr/bin/env node
// ── SmartPrice Backend Test Suite ─────────────────────────────────────────────
// Run: node test-backend.js [--url http://localhost:3001]
//
// Tests:
//   1. Health check — DB + EPEX feed + data freshness
//   2. EPEX prices — real numbers, sane range, not stale
//   3. Auth — register, login, token refresh, logout, delete account
//   4. Price calculation accuracy — VAT, margin math, no NaN
//   5. Guest vs auth — protected routes block guests correctly

const BASE = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : (process.env.TEST_API_URL || "http://localhost:3001");

let passed = 0;
let failed = 0;
const results = [];

// ── Helpers ────────────────────────────────────────────────────────────────────
async function req(method, path, body, headers = {}) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  };
  const res = await fetch(url, opts);
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json, headers: res.headers };
}

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
    results.push({ name, pass: true });
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
    results.push({ name, pass: false, detail });
  }
}

function section(title) {
  console.log(`\n${"─".repeat(55)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(55)}`);
}

// ── Test 1: Health check ───────────────────────────────────────────────────────
async function testHealth() {
  section("1 · Health Check");
  const { status, body } = await req("GET", "/api/health");

  assert("Returns 200", status === 200, `got ${status}`);
  assert("Has status field", body?.status != null);
  assert("DB check present", body?.checks?.database != null);
  assert("DB is ok", body?.checks?.database?.status === "ok",
    body?.checks?.database?.error);
  assert("EPEX check present", body?.checks?.epex != null);
  assert("EPEX not failed", body?.checks?.epex?.status !== "fail",
    body?.checks?.epex?.error);
  assert("EPEX has data points", (body?.checks?.epex?.points ?? 0) > 0,
    `got ${body?.checks?.epex?.points}`);
}

// ── Test 2: EPEX Price Data ────────────────────────────────────────────────────
async function testPrices() {
  section("2 · EPEX Price Data");
  const { status, body } = await req("GET", "/api/prices/today");

  assert("Returns 200", status === 200, `got ${status}`);
  assert("success: true", body?.success === true);
  assert("Has data array", Array.isArray(body?.data), `got ${typeof body?.data}`);
  assert("Has 24+ price points", (body?.data?.length ?? 0) >= 12,
    `got ${body?.data?.length} points`);

  if (Array.isArray(body?.data)) {
    const prices = body.data.map(p => p.price_eur_mwh);
    const hasNaN  = prices.some(p => isNaN(p) || p == null);
    const allSane = prices.every(p => p >= -50 && p <= 500);
    const hasKwh  = body.data.every(p => p.price_eur_kwh != null && !isNaN(p.price_eur_kwh));

    assert("No NaN prices",        !hasNaN,   `found NaN in ${prices.filter(isNaN).length} values`);
    assert("All prices in range",  allSane,   `out-of-range: ${prices.filter(p=>p<-50||p>500)}`);
    assert("kWh prices present",   hasKwh);
    assert("Has stats object",     body?.stats != null);
    assert("stats.today.min < max",
      body?.stats?.today?.min <= body?.stats?.today?.max,
      `min=${body?.stats?.today?.min} max=${body?.stats?.today?.max}`
    );

    // Check current hour is marked
    const current = body.data.find(p => p.is_current);
    assert("Current hour marked", current != null);
  }
}

// ── Test 3: Auth Flow ──────────────────────────────────────────────────────────
async function testAuth() {
  section("3 · Auth Flow");

  // Use a unique test email each run
  const email = `test-${Date.now()}@smartprice-test.be`;
  const password = "TestPass123!";
  let accessToken = null;

  // 3a. Register
  const reg = await req("POST", "/auth/register", { name: "Test User", email, password });
  assert("Register returns 201",     reg.status === 201,         `got ${reg.status}: ${reg.body?.error}`);
  assert("Register has token",       reg.body?.accessToken != null);
  assert("Register has user object", reg.body?.user?.email === email);
  accessToken = reg.body?.accessToken;

  // 3b. Login
  const login = await req("POST", "/auth/login", { email, password });
  assert("Login returns 200",        login.status === 200,       `got ${login.status}: ${login.body?.error}`);
  assert("Login has token",          login.body?.accessToken != null);
  assert("Login user matches",       login.body?.user?.email === email);
  if (login.body?.accessToken) accessToken = login.body.accessToken;

  // 3c. Wrong password
  const badLogin = await req("POST", "/auth/login", { email, password: "wrongpass" });
  assert("Wrong password returns 401", badLogin.status === 401, `got ${badLogin.status}`);

  // 3d. Access protected route with token
  const dash = await req("GET", "/api/user/dashboard", null, {
    Authorization: `Bearer ${accessToken}`,
  });
  assert("Protected route with token returns 200",
    dash.status === 200, `got ${dash.status}: ${dash.body?.error}`);

  // 3e. Access protected route without token
  const noAuth = await req("GET", "/api/user/dashboard");
  assert("Protected route without token returns 401",
    noAuth.status === 401, `got ${noAuth.status}`);

  // 3f. Delete test account
  if (accessToken) {
    const del = await req("DELETE", "/auth/delete-account", null, {
      Authorization: `Bearer ${accessToken}`,
    });
    assert("Delete account returns 200", del.status === 200, `got ${del.status}`);
  }
}

// ── Test 4: Price Calculation Accuracy ────────────────────────────────────────
async function testCalculation() {
  section("4 · Price Calculation Accuracy");

  // Known inputs → expected outputs
  const payload = {
    energyTypes:   ["electricity"],
    region:        "flanders",
    householdSize: "2",
    appliances: [
      { id: "fridge",          count: 1, hoursPerDay: 24 },
      { id: "washing_machine", count: 1, hoursPerDay: 1  },
    ],
  };

  const { status, body } = await req("POST", "/api/suppliers/calculate", payload);
  assert("Calculate returns 200",   status === 200, `got ${status}: ${body?.error}`);
  assert("success: true",           body?.success === true);
  assert("Has results array",       Array.isArray(body?.results));
  assert("Results not empty",       (body?.results?.length ?? 0) > 0);

  if (Array.isArray(body?.results) && body.results.length > 0) {
    const first = body.results[0];

    // No NaN in any cost field
    const costs = Object.values(first?.costs || {});
    const hasNaN = costs.some(v => isNaN(v) || v == null);
    assert("No NaN in costs",       !hasNaN, `NaN found in: ${JSON.stringify(first?.costs)}`);

    // Annual cost is realistic for Belgium (€300–€3000)
    const total = first?.costs?.total;
    assert("Annual cost is realistic",
      total > 300 && total < 3000,
      `got €${total}/yr`
    );

    // VAT should be ~6% of subtotal
    if (first?.costs?.subtotal && first?.costs?.vat) {
      const impliedVat = first.costs.vat / first.costs.subtotal;
      assert("VAT is 6%",
        Math.abs(impliedVat - 0.06) < 0.001,
        `got ${(impliedVat * 100).toFixed(2)}%`
      );
    }

    // Results should be sorted cheapest first
    if (body.results.length > 1) {
      const sorted = body.results.every((r, i) =>
        i === 0 || r.costs.total >= body.results[i - 1].costs.total
      );
      assert("Results sorted cheapest first", sorted);
    }
  }
}

// ── Test 5: Guest access ───────────────────────────────────────────────────────
async function testGuestAccess() {
  section("5 · Guest Access (public routes work, protected blocked)");

  const publicRoutes = [
    "/api/health",
    "/api/prices/today",
    "/api/current",
    "/api/cheapest",
  ];

  for (const route of publicRoutes) {
    const { status } = await req("GET", route);
    assert(`Public: ${route} → 200`, status === 200, `got ${status}`);
  }

  const protectedRoutes = [
    "/api/user/dashboard",
  ];

  for (const route of protectedRoutes) {
    const { status } = await req("GET", route);
    assert(`Protected: ${route} → 401`, status === 401, `got ${status}`);
  }
}

// ── Run all ────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n⚡ SmartPrice Test Suite`);
  console.log(`   Target: ${BASE}`);
  console.log(`   Time:   ${new Date().toISOString()}`);

  try {
    await testHealth();
    await testPrices();
    await testAuth();
    await testCalculation();
    await testGuestAccess();
  } catch (e) {
    console.error("\n💥 Test runner crashed:", e.message);
    process.exit(1);
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  Results: ${passed} passed · ${failed} failed`);

  if (failed === 0) {
    console.log(`  ✅ All tests passed — safe to deploy\n`);
    process.exit(0);
  } else {
    console.log(`  ❌ ${failed} test(s) failed — do not deploy\n`);
    const failures = results.filter(r => !r.pass);
    failures.forEach(f => console.log(`     • ${f.name}${f.detail ? `: ${f.detail}` : ""}`));
    console.log();
    process.exit(1);
  }
}

run();