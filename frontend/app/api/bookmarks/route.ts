/**
 * app/api/bookmarks/route.ts
 *
 * GET    /api/bookmarks?keyword=AI   — list bookmarks (optionally filtered by keyword)
 * POST   /api/bookmarks              — save a bookmark
 * DELETE /api/bookmarks?id=xxx       — remove a bookmark
 *
 * Pro plan only for saving. Free users get 403.
 */
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { parseSessionToken } from '@/lib/auth';
import { canUseBookmarks } from '@/lib/planLimits';
import type { Plan } from '@/lib/planLimits';

interface BookmarkRow {
  id: string;
  user_id: string;
  keyword: string;
  title: string;
  url: string;
  source: string;
  published_at: number;
  summary: string | null;
  saved_at: number;
}

async function getUser(req: NextRequest, db: D1Database) {
  const sessionToken = req.cookies.get('session')?.value;
  if (!sessionToken) return null;
  const session = await parseSessionToken(sessionToken);
  if (!session) return null;
  return db
    .prepare('SELECT id, plan FROM users WHERE id = ?')
    .bind(session.userId)
    .first<{ id: string; plan: string }>();
}

// ── GET: list bookmarks ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  const user = await getUser(req, db);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keyword = req.nextUrl.searchParams.get('keyword');

  let result;
  if (keyword) {
    result = await db
      .prepare('SELECT * FROM bookmarks WHERE user_id = ? AND keyword = ? ORDER BY saved_at DESC')
      .bind(user.id, keyword)
      .all<BookmarkRow>();
  } else {
    result = await db
      .prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY saved_at DESC')
      .bind(user.id)
      .all<BookmarkRow>();
  }

  // Group by keyword
  const grouped: Record<string, BookmarkRow[]> = {};
  for (const row of result.results) {
    if (!grouped[row.keyword]) grouped[row.keyword] = [];
    grouped[row.keyword].push(row);
  }

  return NextResponse.json({ bookmarks: result.results, grouped });
}

// ── POST: save a bookmark ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  const user = await getUser(req, db);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Pro plan check
  if (!canUseBookmarks((user.plan || 'free') as Plan)) {
    return NextResponse.json({
      error: 'Bookmarks are available on Pro plan only.',
      upgradeTo: 'pro',
    }, { status: 403 });
  }

  const body = await req.json() as {
    keyword: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    summary?: string;
  };

  if (!body.keyword || !body.title || !body.url) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const publishedAt = body.publishedAt
    ? Math.floor(new Date(body.publishedAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  try {
    await db
      .prepare(`
        INSERT OR IGNORE INTO bookmarks (id, user_id, keyword, title, url, source, published_at, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, user.id, body.keyword, body.title, body.url, body.source, publishedAt, body.summary || null)
      .run();

    return NextResponse.json({ success: true, id });
  } catch (e) {
    console.error('[bookmarks POST]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── DELETE: remove a bookmark ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  const user = await getUser(req, db);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await db
    .prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  return NextResponse.json({ success: true });
}
