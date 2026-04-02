/**
 * app/api/news/route.ts
 *
 * GET /api/news?keyword=AI
 *
 * Returns real RSS-fetched news articles for the given keyword.
 * Respects plan limits: free=5 articles, pro=20 articles.
 * Requires authentication.
 */
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { parseSessionToken } from '@/lib/auth';
import { fetchNewsForKeyword } from '@/lib/newsFetcher';
import { generateSummary } from '@/lib/aiSummarizer';
import { getPlanLimits } from '@/lib/planLimits';
import type { Plan } from '@/lib/planLimits';

export async function GET(req: NextRequest) {
  // Auth required
  const sessionToken = req.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await parseSessionToken(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyword = req.nextUrl.searchParams.get('keyword')?.trim();
  if (!keyword) {
    return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
  }

  try {
    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;

    // Get user plan
    const user = await db
      .prepare('SELECT id, plan FROM users WHERE id = ?')
      .bind(session.userId)
      .first<{ id: string; plan: string }>();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = (user.plan || 'free') as Plan;
    const limits = getPlanLimits(plan);

    // Check that user has a confirmed subscription for this keyword
    const sub = await db
      .prepare(`
        SELECT id FROM subscriptions
        WHERE (user_id = ? OR (user_id IS NULL AND email = (SELECT email FROM users WHERE id = ?)))
          AND confirmed = 1
          AND (keywords LIKE ? OR keywords LIKE ? OR keywords = ?)
        LIMIT 1
      `)
      .bind(
        user.id, user.id,
        `%${keyword}%`, `%${keyword}%`, keyword,
      )
      .first();

    if (!sub) {
      return NextResponse.json({ error: 'No active subscription for this keyword' }, { status: 403 });
    }

    // Fetch real news from RSS
    const articles = await fetchNewsForKeyword({
      keyword,
      limit: limits.articlesPerKeyword,
      sinceEpoch: Math.floor(Date.now() / 1000) - 7 * 86400, // last 7 days
    });

    // Generate AI summaries for each article
    const withSummaries = await Promise.all(
      articles.map(async (a) => {
        const aiResult = await generateSummary({
          title: a.title,
          snippet: a.snippet,
          source: a.source,
          keyword,
        });
        return {
          title: a.title,
          url: a.url,
          source: a.source,
          publishedAt: new Date(a.publishedAt * 1000).toISOString(),
          summary: aiResult.summary,
          relevanceReason: aiResult.relevanceReason,
          keyword,
        };
      })
    );

    return NextResponse.json({
      keyword,
      plan,
      limit: limits.articlesPerKeyword,
      articles: withSummaries,
    });
  } catch (e) {
    console.error('[/api/news]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
