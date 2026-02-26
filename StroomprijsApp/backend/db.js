/**
 * db.js — PostgreSQL Database Layer (Supabase)
 * Drop-in replacement for the in-memory store.
 * Same API surface — nothing else in the app changes.
 */

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

// Test connection on startup
pool.query("SELECT 1").then(() => {
  console.log("✅ Connected to Supabase PostgreSQL");
}).catch(err => {
  console.error("❌ Database connection failed:", err.message);
  process.exit(1);
});

const userStore = {

  // ── Create ──────────────────────────────────────────────────
  async create({ email, passwordHash, name }) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email.toLowerCase().trim(), passwordHash, name || ""]
    );
    return rows[0];
  },

  // ── Find by ID ───────────────────────────────────────────────
  async findById(id) {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
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

  // ── Update ───────────────────────────────────────────────────
  async update(id, changes) {
    const fields = [];
    const values = [];
    let i = 1;

    if (changes.name          !== undefined) { fields.push(`name = $${i++}`);          values.push(changes.name); }
    if (changes.email         !== undefined) { fields.push(`email = $${i++}`);         values.push(changes.email.toLowerCase().trim()); }
    if (changes.password_hash !== undefined) { fields.push(`password_hash = $${i++}`); values.push(changes.password_hash); }
    // Accept both camelCase and snake_case for passwordHash
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
      `UPDATE users
       SET preferences = preferences || $1::jsonb
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(prefs), id]
    );
    return rows[0] || null;
  },

  // ── Refresh tokens ───────────────────────────────────────────
  async saveRefreshToken(token, userId) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query(
      "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [token, userId, expiresAt]
    );
  },

  async isValidRefreshToken(token) {
    const { rows } = await pool.query(
      "SELECT 1 FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    return rows.length > 0;
  },

  async deleteRefreshToken(token) {
    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
  },

  // ── Safe user (never expose password_hash) ───────────────────
  safeUser(user) {
    if (!user) return null;
    const { password_hash, passwordHash, ...safe } = user;

    // Normalize DB column names to camelCase for frontend
    return {
      id:          safe.id,
      email:       safe.email,
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