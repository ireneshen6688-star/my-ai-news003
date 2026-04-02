/**
 * app/api/cron/digest/route.ts
 *
 * Cloudflare Cron Trigger handler.
 *
 * This endpoint is called automatically by Cloudflare Cron at the schedule
 * defined in wrangler.toml. It:
 *   1. Fetches all confirmed subscriptions whose next_run_at <= now
 *   2. For each: computes the time window, generates the digest, sends the email
 *   3. On success: updates last_successful_run_at + next_run_at
 *   4. On failure: increments consecutive_failures (does NOT update last_successful_run_at)
 *
 * Security: only accepts requests from Cloudflare Cron (CF-Worker) or a
 * secret CRON_SECRET header for manual testing.
 *
 * Manual trigger (dev/test):
 *   curl -X POST https://your-site.pages.dev/api/cron/digest \
 *        -H "x-cron-secret: <CRON_SECRET>"
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { mockNews } from '@/lib/mockNews';
import { filterVerifiedArticles } from '@/lib/verifyLinks';
import { generateEmailHtml } from '@/lib/emailTemplate';
import { sendDigestEmail } from '@/lib/mailer';
import { computeNextRunAt, computeTimeWindow } from '@/lib/scheduleUtils';
import type { Frequency } from '@/lib/scheduleUtils';

interface Subscription {
  id: string;
  user_id: string | null;
  email: string;
  keywords: string;
  categories: string;
  frequency: string;
  weekday: number | null;
  month_date: number | null;
  send_hour: number;
  send_minute: number;
  unsubscribe_token: string;
  last_successful_run_at: number | null;
  next_run_at: number | null;
  consecutive_failures?: number;
}

export async function POST(req: NextRequest) {
  // ── Auth: Cloudflare Cron sends a CF-specific header, or allow secret header ─
  const cronSecret = process.env.CRON_SECRET;
  const incomingSecret = req.headers.get('x-cron-secret');
  const isCfCron = req.headers.get('x-cloudflare-scheduled') === 'true';

  if (!isCfCron && (!cronSecret || incomingSecret !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowEpoch = Math.floor(Date.now() / 1000);

  try {
    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://my-ai-news003.pages.dev';

    // ── 1. Find all due subscriptions ──────────────────────────────────────
    // next_run_at <= now, confirmed = 1
    const result = await db
      .prepare(`
        SELECT * FROM subscriptions
        WHERE confirmed = 1
          AND (next_run_at IS NULL OR next_run_at <= ?)
        ORDER BY next_run_at ASC
        LIMIT 100
      `)
      .bind(nowEpoch)
      .all<Subscription>();

    const subs = result.results;

    if (subs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No subscriptions due.' });
    }

    const results: Array<{
      id: string;
      email: string;
      frequency: string;
      window_start: number;
      window_end: number;
      articles: number;
      status: 'sent' | 'failed';
      error?: string;
    }> = [];

    // ── 2. Process each due subscription ───────────────────────────────────
    for (const sub of subs) {
      const freq = (sub.frequency || 'daily') as Frequency;

      // Compute the actual news time window for this digest
      const window = computeTimeWindow(freq, sub.last_successful_run_at, nowEpoch);

      try {
        // ── TODO (Phase 2): replace mockNews with real RSS-based news fetch
        // using window.start and window.end + sub.keywords + sub.categories
        const allArticles = await filterVerifiedArticles(mockNews);

        // Limit article count per frequency
        const limits: Record<Frequency, number> = { daily: 10, weekly: 15, monthly: 12 };
        const articles = allArticles.slice(0, limits[freq]);

        const keywords = sub.keywords || (() => {
          try { return (JSON.parse(sub.categories) as string[]).join(', '); } catch { return ''; }
        })();

        const html = generateEmailHtml({
          keywords,
          articles,
          unsubscribeToken: sub.unsubscribe_token,
          baseUrl,
        });

        await sendDigestEmail({ to: sub.email, html, keywords });

        // ── Success: update last_successful_run_at and next_run_at ──────────
        const nextRunAt = computeNextRunAt({
          frequency: freq,
          weekday: sub.weekday,
          month_date: sub.month_date,
          send_hour: sub.send_hour ?? 8,
          send_minute: sub.send_minute ?? 0,
        }, nowEpoch);

        await db
          .prepare(`
            UPDATE subscriptions
            SET last_successful_run_at = ?,
                next_run_at = ?,
                consecutive_failures = 0
            WHERE id = ?
          `)
          .bind(nowEpoch, nextRunAt, sub.id)
          .run();

        results.push({
          id: sub.id,
          email: sub.email,
          frequency: freq,
          window_start: window.start,
          window_end: window.end,
          articles: articles.length,
          status: 'sent',
        });
      } catch (e) {
        console.error(`[cron/digest] Failed for ${sub.email}:`, e);

        // ── Failure: increment consecutive_failures, do NOT update last_successful_run_at
        // Reschedule for a short retry (1 hour), not the full next period
        const retryAt = nowEpoch + 3600;
        await db
          .prepare(`
            UPDATE subscriptions
            SET consecutive_failures = COALESCE(consecutive_failures, 0) + 1,
                next_run_at = ?
            WHERE id = ?
          `)
          .bind(retryAt, sub.id)
          .run();

        results.push({
          id: sub.id,
          email: sub.email,
          frequency: freq,
          window_start: window.start,
          window_end: window.end,
          articles: 0,
          status: 'failed',
          error: String(e),
        });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      processed: subs.length,
      sent,
      failed,
      results,
    });
  } catch (e) {
    console.error('[cron/digest] Fatal error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Cloudflare Cron Triggers call via scheduled event, not HTTP POST.
// The Pages Functions runtime re-routes scheduled events to this handler.
// We also export GET for a simple health check.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const incomingSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || incomingSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: 'Cron digest endpoint is live.' });
}
