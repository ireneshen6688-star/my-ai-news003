-- Migration 002: Add plan field to users, create bookmarks and news_cache tables

-- Users: add plan field (free / pro)
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_expires_at INTEGER; -- epoch seconds, null = never expires

-- News cache: store fetched RSS articles to avoid repeated fetches
CREATE TABLE IF NOT EXISTS news_cache (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at INTEGER NOT NULL, -- epoch seconds
  summary TEXT,                  -- AI-generated summary (nullable until processed)
  category TEXT,
  fetched_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(normalized_url)
);

CREATE INDEX IF NOT EXISTS idx_news_cache_keyword ON news_cache (keyword);
CREATE INDEX IF NOT EXISTS idx_news_cache_published_at ON news_cache (published_at DESC);

-- Bookmarks: user saved articles
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,         -- which keyword/subscription this belongs to
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  summary TEXT,
  saved_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_keyword ON bookmarks (user_id, keyword);
CREATE INDEX IF NOT EXISTS idx_bookmarks_saved_at ON bookmarks (user_id, saved_at DESC);
