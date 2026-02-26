-- StroomSlim Database Schema
-- Supabase Dashboard → SQL Editor → New Query → Run

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  preferences   JSONB DEFAULT '{"supplier":"Bolt Energy","alertThreshold":80,"alertEnabled":false,"alertChannels":["app"],"language":"nl"}'::jsonb,
  fluvius       JSONB DEFAULT '{"linked":false,"ean":null,"linkedAt":null}'::jsonb,
  providers     JSONB DEFAULT '{"email":true,"google":false,"apple":false,"itsme":false}'::jsonb
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_tokens_user   ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_expiry ON refresh_tokens(expires_at);
