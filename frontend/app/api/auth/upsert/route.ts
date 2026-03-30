export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

interface Env {
  DB: D1Database;
}

interface UpsertBody {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatar: string;
}

export async function POST(req: NextRequest) {
  const db = (req as any).env?.DB || (globalThis as any).DB;

  if (!db) {
    return NextResponse.json({ error: 'DB not available' }, { status: 500 });
  }

  const body = await req.json() as UpsertBody;
  const { provider, providerId, email, name, avatar } = body;

  if (!provider || !providerId || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar TEXT,
      provider TEXT,
      provider_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `);

  const existing = await db
    .prepare('SELECT id FROM users WHERE provider = ? AND provider_id = ?')
    .bind(provider, providerId)
    .first() as { id: string } | null;

  if (existing) {
    await db
      .prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?')
      .bind(name, avatar, existing.id)
      .run();
    return NextResponse.json({ userId: existing.id });
  }

  const byEmail = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first() as { id: string } | null;

  if (byEmail) {
    await db
      .prepare('UPDATE users SET provider = ?, provider_id = ?, avatar = ?, name = ? WHERE id = ?')
      .bind(provider, providerId, avatar, name, byEmail.id)
      .run();
    return NextResponse.json({ userId: byEmail.id });
  }

  const userId = crypto.randomUUID();
  await db
    .prepare('INSERT INTO users (id, email, name, avatar, provider, provider_id) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(userId, email, name, avatar, provider, providerId)
    .run();

  return NextResponse.json({ userId });
}
