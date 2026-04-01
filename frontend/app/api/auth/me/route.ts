/**
 * app/api/auth/me/route.ts
 * Returns the currently logged-in user (from session cookie).
 * Returns 401 if not logged in or session expired.
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { parseSessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const session = await parseSessionToken(sessionToken);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;

    const user = await db
      .prepare('SELECT id, email, name, avatar FROM users WHERE id = ?')
      .bind(session.userId)
      .first<{ id: string; email: string; name: string; avatar: string }>();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error('[/api/auth/me]', e);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
