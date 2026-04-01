/**
 * lib/auth.ts
 * Google OAuth helpers + session token utilities
 * Compatible with Cloudflare Edge Runtime
 */

import { Google } from 'arctic';

// ── Google OAuth client ────────────────────────────────────────────────────

export function getGoogleClient(): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3000/api/auth/callback/google';
  return new Google(clientId, clientSecret, redirectUri);
}

// ── Google userinfo ────────────────────────────────────────────────────────

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function getGoogleUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json() as Promise<GoogleUser>;
}

// ── Session token (HMAC-SHA256 signed) ────────────────────────────────────
// Uses Web Crypto API — available in Edge Runtime and modern Node.js.

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getHmacKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Create a signed session token: base64url(payload).base64url(sig) */
export async function makeSessionToken(userId: string): Promise<string> {
  const payload = JSON.stringify({ userId, exp: Date.now() + SESSION_TTL_MS });
  const enc = new TextEncoder();
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const b64Payload = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64Payload}.${b64Sig}`;
}

/** Verify and parse a session token. Returns null if invalid or expired. */
export async function parseSessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const [b64Payload, b64Sig] = token.split('.');
    if (!b64Payload || !b64Sig) return null;

    const payload = atob(b64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = Uint8Array.from(
      atob(b64Sig.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0),
    );

    const enc = new TextEncoder();
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
    if (!valid) return null;

    const data = JSON.parse(payload) as { userId: string; exp: number };
    if (data.exp < Date.now()) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

// ── D1 user upsert (inline, avoids self-fetch in edge) ────────────────────

export interface UpsertUserParams {
  db: D1Database;
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatar: string;
}

export async function upsertUser({
  db,
  provider,
  providerId,
  email,
  name,
  avatar,
}: UpsertUserParams): Promise<string> {
  // Ensure table exists
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

  // Check by provider+providerId first
  const byProvider = await db
    .prepare('SELECT id FROM users WHERE provider = ? AND provider_id = ?')
    .bind(provider, providerId)
    .first<{ id: string }>();

  if (byProvider) {
    await db
      .prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?')
      .bind(name, avatar, byProvider.id)
      .run();
    return byProvider.id;
  }

  // Check by email (link accounts)
  const byEmail = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();

  if (byEmail) {
    await db
      .prepare('UPDATE users SET provider = ?, provider_id = ?, name = ?, avatar = ? WHERE id = ?')
      .bind(provider, providerId, name, avatar, byEmail.id)
      .run();
    return byEmail.id;
  }

  // Insert new user
  const userId = crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO users (id, email, name, avatar, provider, provider_id) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(userId, email, name, avatar, provider, providerId)
    .run();

  return userId;
}
