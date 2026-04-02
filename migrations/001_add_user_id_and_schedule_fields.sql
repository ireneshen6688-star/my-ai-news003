-- Migration 001: Add user_id, send_hour, send_minute, last_successful_run_at, next_run_at to subscriptions
-- Run via: wrangler d1 execute my-ai-news-db --file=migrations/001_add_user_id_and_schedule_fields.sql

-- Add user_id (nullable for now so existing rows don't break)
ALTER TABLE subscriptions ADD COLUMN user_id TEXT;

-- Add send_hour / send_minute if not already present (may already exist in newer schema)
-- D1 will error if column exists — safe to ignore those errors
ALTER TABLE subscriptions ADD COLUMN send_hour INTEGER NOT NULL DEFAULT 8;
ALTER TABLE subscriptions ADD COLUMN send_minute INTEGER NOT NULL DEFAULT 0;

-- Scheduling tracking fields
ALTER TABLE subscriptions ADD COLUMN last_successful_run_at INTEGER; -- unix epoch seconds
ALTER TABLE subscriptions ADD COLUMN next_run_at INTEGER;            -- unix epoch seconds

-- Index for the cron job: quickly find due subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_run_at
  ON subscriptions (next_run_at, confirmed)
  WHERE confirmed = 1;

-- Index for user dashboard queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);
