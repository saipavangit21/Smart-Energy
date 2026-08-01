-- SmartPrice database schema (structure only, no data).
-- Extracted from production on 2026-08-01 — no schema.sql existed before
-- this, the DB had been built up manually + via scattered
-- `CREATE TABLE IF NOT EXISTS` calls in route files over time.
-- Run this against a fresh Postgres database (e.g. a dev/staging instance)
-- to get a matching structure.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT,
  password_hash TEXT,
  name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  preferences JSONB DEFAULT '{"language": "nl", "supplier": "Bolt Energy", "alertEnabled": false, "alertChannels": ["app"], "alertThreshold": 80}'::jsonb,
  fluvius JSONB DEFAULT '{"ean": null, "linked": false, "linkedAt": null}'::jsonb,
  providers JSONB DEFAULT '{"apple": false, "email": true, "itsme": false, "google": false}'::jsonb,
  PRIMARY KEY (id),
  UNIQUE (email)
);
CREATE INDEX idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (token)
);
CREATE INDEX idx_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_tokens_expiry ON refresh_tokens (expires_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  method TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  path TEXT,
  ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  properties JSONB
);
CREATE INDEX idx_analytics_event ON analytics_events (event);
CREATE INDEX idx_analytics_created ON analytics_events (created_at);
CREATE INDEX idx_analytics_session ON analytics_events (session_id);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS b2b_leads (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  audit_data JSONB,
  source TEXT DEFAULT 'fleet-audit',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fluvius_readings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_id TEXT,
  power_w NUMERIC,
  solar_w NUMERIC,
  energy_kwh NUMERIC,
  gas_m3 NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX fluvius_readings_user_ts ON fluvius_readings (user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS ha_integration_pings (
  ip_hash TEXT NOT NULL,
  ping_date DATE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  request_count INTEGER DEFAULT 1,
  PRIMARY KEY (ip_hash, ping_date)
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  language TEXT DEFAULT 'nl',
  unsubscribe_token TEXT NOT NULL DEFAULT gen_random_uuid()::text UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT true
);
