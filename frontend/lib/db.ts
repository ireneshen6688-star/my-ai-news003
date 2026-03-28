import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = '/tmp/my-ai-news.db';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      keywords TEXT NOT NULL,
      categories TEXT NOT NULL DEFAULT '[]',
      frequency TEXT NOT NULL DEFAULT 'daily',
      weekday INTEGER,
      month_date INTEGER,
      confirmed INTEGER NOT NULL DEFAULT 0,
      confirm_token TEXT,
      unsubscribe_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return _db;
}
