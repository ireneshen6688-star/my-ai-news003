export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { parseSessionToken } from '@/lib/auth';
import { sendConfirmEmail } from '@/lib/mailer';
import { computeNextRunAt } from '@/lib/scheduleUtils';
import type { Frequency } from '@/lib/scheduleUtils';
import { checkKeywords } from '@/lib/contentFilter';
import { canAddMoreKeywords } from '@/lib/planLimits';
import type { Plan } from '@/lib/planLimits';

// ── POST /api/subscriptions — create a new subscription ──────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      keywords: string;
      categories: string[];
      frequency: string;
      weekday?: number;
      monthDate?: number;
      sendHour?: number;
      sendMinute?: number;
      email: string;
    };
    const { keywords, categories, frequency, weekday, monthDate, sendHour, sendMinute, email } = body;

    if (!email || (!keywords && (!categories || categories.length === 0))) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Content filter — block inappropriate keywords
    if (keywords) {
      const filterResult = checkKeywords(keywords);
      if (filterResult.blocked) {
        return NextResponse.json({ error: filterResult.message }, { status: 400 });
      }
    }

    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;

    // Resolve logged-in user (optional — anonymous subs allowed at this stage)
    const sessionToken = req.cookies.get('session')?.value;
    let userId: string | null = null;
    let userPlan: Plan = 'free';
    if (sessionToken) {
      const session = await parseSessionToken(sessionToken);
      if (session) {
        userId = session.userId;
        const userRow = await db
          .prepare('SELECT plan FROM users WHERE id = ?')
          .bind(userId)
          .first<{ plan: string }>();
        userPlan = (userRow?.plan || 'free') as Plan;
      }
    }

    // Plan limit check: count existing confirmed subscriptions for this user
    if (userId) {
      const countRow = await db
        .prepare('SELECT COUNT(*) as cnt FROM subscriptions WHERE user_id = ? AND confirmed = 1')
        .bind(userId)
        .first<{ cnt: number }>();
      const currentCount = countRow?.cnt ?? 0;
      if (!canAddMoreKeywords(userPlan, currentCount)) {
        return NextResponse.json({
          error: userPlan === 'free'
            ? 'Free plan allows 1 keyword subscription. Upgrade to Pro for up to 5.'
            : 'You have reached the maximum number of subscriptions for your plan.',
          upgradeTo: 'pro',
        }, { status: 403 });
      }
    }

    const id = crypto.randomUUID();
    const confirmToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    const h = sendHour ?? 8;
    const m = sendMinute ?? 0;
    const freq = (frequency || 'daily') as Frequency;

    // Pre-compute next_run_at (will be "armed" properly on confirmation)
    const nextRunAt = computeNextRunAt({
      frequency: freq,
      weekday: weekday ?? null,
      month_date: monthDate ?? null,
      send_hour: h,
      send_minute: m,
    });

    await db.prepare(`
      INSERT INTO subscriptions
        (id, user_id, email, keywords, categories, frequency, weekday, month_date,
         send_hour, send_minute, confirmed, confirm_token, unsubscribe_token, next_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).bind(
      id,
      userId,
      email,
      keywords || '',
      JSON.stringify(categories || []),
      freq,
      weekday ?? null,
      monthDate ?? null,
      h,
      m,
      confirmToken,
      unsubscribeToken,
      nextRunAt,
    ).run();

    const baseUrl = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/confirm?token=${confirmToken}`;

    try {
      await sendConfirmEmail({ to: email, confirmUrl });
    } catch (mailErr) {
      console.error('[Resend] Failed:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Please check your email to confirm your subscription.',
      dev_confirm_url: process.env.NODE_ENV !== 'production' ? confirmUrl : undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── GET /api/subscriptions — list subscriptions for the current user ──────
//
// Rules:
//   - Must be logged in (401 if not)
//   - Returns ONLY subscriptions belonging to the current user
//   - Falls back to email-match if user_id is null (legacy rows created before login)

export async function GET(req: NextRequest) {
  // Require session
  const sessionToken = req.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await parseSessionToken(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;

    // Fetch the user's email so we can also match legacy rows (user_id = NULL)
    const user = await db
      .prepare('SELECT id, email FROM users WHERE id = ?')
      .bind(session.userId)
      .first<{ id: string; email: string }>();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return rows where user_id matches OR (user_id is null AND email matches)
    const result = await db
      .prepare(`
        SELECT * FROM subscriptions
        WHERE user_id = ?
           OR (user_id IS NULL AND email = ?)
        ORDER BY created_at DESC
      `)
      .bind(user.id, user.email)
      .all();

    return NextResponse.json({ subscriptions: result.results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
