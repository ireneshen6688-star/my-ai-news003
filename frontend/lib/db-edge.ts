// lib/db-edge.ts
// D1 database access for Cloudflare Edge Runtime
// The DB binding is injected by Cloudflare Pages via wrangler.toml

export function getD1(request: Request): D1Database {
  const db = (process.env as unknown as { DB: D1Database }).DB;
  if (!db) throw new Error('D1 DB binding not found. Make sure wrangler.toml is configured.');
  return db;
}

// Helper to run a query and return all rows
export async function dbAll<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).all<T>();
  return result.results;
}

// Helper to run a single row query
export async function dbGet<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).first<T>();
  return result ?? null;
}

// Helper to run a write query
export async function dbRun(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<D1Result> {
  const stmt = db.prepare(query);
  return stmt.bind(...params).run();
}
