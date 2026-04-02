import Database from 'better-sqlite3';

const DB_PATH = '/tmp/my-ai-news.db';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar TEXT,
      provider TEXT,
      provider_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '',
      categories TEXT NOT NULL DEFAULT '[]',
      frequency TEXT NOT NULL DEFAULT 'daily',
      weekday INTEGER,
      month_date INTEGER,
      send_hour INTEGER NOT NULL DEFAULT 8,
      send_minute INTEGER NOT NULL DEFAULT 0,
      confirmed INTEGER NOT NULL DEFAULT 0,
      confirm_token TEXT,
      unsubscribe_token TEXT NOT NULL,
      last_successful_run_at INTEGER,
      next_run_at INTEGER,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_next_run_at ON subscriptions (next_run_at);
  `);
  return _db;
}
