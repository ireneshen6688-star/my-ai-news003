-- Migration 001 (safe retry): Add user_id, scheduling fields to subscriptions
-- D1 does not support IF NOT EXISTS on ALTER COLUMN, so we split into separate statements.
-- Statements that fail with "duplicate column name" can be safely ignored.

ALTER TABLE subscriptions ADD COLUMN user_id TEXT;
ALTER TABLE subscriptions ADD COLUMN last_successful_run_at INTEGER;
ALTER TABLE subscriptions ADD COLUMN next_run_at INTEGER;
ALTER TABLE subscriptions ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_run_at
  ON subscriptions (next_run_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);
