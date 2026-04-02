export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { computeNextRunAt } from '@/lib/scheduleUtils';
import type { Frequency } from '@/lib/scheduleUtils';

interface SubscriptionRow {
  id: string;
  frequency: string;
  weekday: number | null;
  month_date: number | null;
  send_hour: number;
  send_minute: number;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse(html('❌ Invalid link', 'No token provided.', '#e53e3e'), {
      status: 400, headers: { 'Content-Type': 'text/html' },
    });
  }

  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  const sub = await db
    .prepare('SELECT id, frequency, weekday, month_date, send_hour, send_minute FROM subscriptions WHERE confirm_token = ?')
    .bind(token)
    .first<SubscriptionRow>();

  if (!sub) {
    return new NextResponse(
      html('❌ Not found', 'This confirmation link is invalid or already used.', '#e53e3e'),
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Compute the first next_run_at now that the subscription is confirmed
  const nextRunAt = computeNextRunAt({
    frequency: (sub.frequency || 'daily') as Frequency,
    weekday: sub.weekday,
    month_date: sub.month_date,
    send_hour: sub.send_hour ?? 8,
    send_minute: sub.send_minute ?? 0,
  });

  await db
    .prepare(`
      UPDATE subscriptions
      SET confirmed = 1,
          confirm_token = NULL,
          next_run_at = ?
      WHERE confirm_token = ?
    `)
    .bind(nextRunAt, token)
    .run();

  const nextDate = new Date(nextRunAt * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });

  return new NextResponse(
    html('✅ Confirmed!', `You're all set. Your first digest will arrive on ${nextDate}.`, '#38a169'),
    { headers: { 'Content-Type': 'text/html' } },
  );
}

function html(title: string, body: string, color: string) {
  const icon = title.split(' ')[0];
  const text = title.replace(/^\S+\s/, '');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${text}</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f7fa;">
  <div style="text-align:center;background:#fff;padding:48px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
    <h2 style="color:${color};margin-bottom:8px;">${text}</h2>
    <p style="color:#666;">${body}</p>
    <a href="/" style="display:inline-block;margin-top:24px;color:#4A90E2;text-decoration:none;font-size:14px;">← Back to My AI News</a>
  </div>
</body></html>`;
}
