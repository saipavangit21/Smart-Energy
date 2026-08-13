/**
 * db.js — PostgreSQL Database Layer (Supabase)
 */

const { Pool }   = require("pg");
const crypto     = require("crypto");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Prevent idle client ETIMEDOUT from crashing Node.js
pool.on("error", (err) => {
  console.error("❌ Database pool error (idle client):", err.message);
});

pool.query("SELECT 1").then(() => {
  console.log("✅ Connected to Supabase PostgreSQL");
}).catch(err => {
  console.error("❌ Database connection failed:", err.message);
  // Don't exit — Railway will provide a healthy DB connection shortly
});

const userStore = {

  // ── Create (OAuth) ───────────────────────────────────────────
  async createOAuth({ email, name, provider, googleId }) {
    const providers = JSON.stringify({
      email: false, google: provider === "google",
      apple: false, itsme: false, googleId: googleId || null,
    });
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, providers) VALUES ($1, $2, $3::jsonb) RETURNING *`,
      [email ? email.toLowerCase().trim() : null, name || "", providers]
    );
    return rows[0];
  },

  // ── Create (email/password — email now optional) ─────────────
  async create({ email, passwordHash, name }) {
    const providers = JSON.stringify({ email: true, google: false, apple: false, itsme: false });
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, providers)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [email ? email.toLowerCase().trim() : null, passwordHash, name || "", providers]
    );
    return rows[0];
  },

  // ── Find by ID ───────────────────────────────────────────────
  async findById(id) {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1", [id]
    );
    return rows[0] || null;
  },

  // ── Find by email ────────────────────────────────────────────
  async findByEmail(email) {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  // ── Find by alert email (stored in preferences JSON) ────────
  async findByAlertEmail(email) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE preferences->>'alertEmail' = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  // ── Find by name (for email-free login) ──────────────────────
  async findByName(name) {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [name.trim()]
    );
    return rows[0] || null;
  },

  // ── Update ───────────────────────────────────────────────────
  async update(id, changes) {
    const fields = [];
    const values = [];
    let i = 1;

    if (changes.name          !== undefined) { fields.push(`name = $${i++}`);          values.push(changes.name); }
    if (changes.email         !== undefined) { fields.push(`email = $${i++}`);         values.push(changes.email ? changes.email.toLowerCase().trim() : null); }
    if (changes.password_hash !== undefined) { fields.push(`password_hash = $${i++}`); values.push(changes.password_hash); }
    if (changes.passwordHash  !== undefined) { fields.push(`password_hash = $${i++}`); values.push(changes.passwordHash); }

    if (!fields.length) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  // ── Update preferences ───────────────────────────────────────
  async updatePreferences(id, prefs) {
    const { rows } = await pool.query(
      `UPDATE users SET preferences = COALESCE(preferences, '{}') || $1::jsonb WHERE id = $2 RETURNING *`,
      [JSON.stringify(prefs), id]
    );
    return rows[0] || null;
  },

  // ── Refresh tokens ───────────────────────────────────────────
  async saveRefreshToken(token, userId) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [token, userId, expiresAt]
    );
  },

  async isValidRefreshToken(token) {
    const { rows } = await pool.query(
      "SELECT 1 FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()", [token]
    );
    return rows.length > 0;
  },

  async deleteRefreshToken(token) {
    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
  },

  async deleteAllRefreshTokensForUser(userId) {
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  },

  // ── Password reset tokens ─────────────────────────────────────
  // Raw token is emailed to the user; only its SHA-256 hash is stored,
  // so a DB leak alone can't be used to reset anyone's password.
  async createPasswordResetToken(userId) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash TEXT NOT NULL PRIMARY KEY,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    // Invalidate any earlier outstanding reset links for this user
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);

    const rawToken  = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [tokenHash, userId, expiresAt]
    );
    return rawToken;
  },

  // Validates + single-use consumes a reset token, returning the user_id (or null)
  async consumePasswordResetToken(rawToken) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const { rows } = await pool.query(
      "DELETE FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id",
      [tokenHash]
    );
    return rows[0]?.user_id || null;
  },

  // ── Safe user (never expose password_hash) ───────────────────
  safeUser(user) {
    if (!user) return null;
    const { password_hash, passwordHash, ...safe } = user;
    return {
      id:          safe.id,
      email:       safe.email || null,
      name:        safe.name,
      createdAt:   safe.created_at || safe.createdAt,
      preferences: safe.preferences || {},
      fluvius:     safe.fluvius    || {},
      providers:   safe.providers  || {},
    };
  },

  async count() {
    const { rows } = await pool.query("SELECT COUNT(*) FROM users");
    return parseInt(rows[0].count);
  },
};

module.exports = userStore;
module.exports.pool = pool;