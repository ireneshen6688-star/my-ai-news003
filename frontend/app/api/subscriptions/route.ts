export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { sendConfirmEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { keywords: string; categories: string[]; frequency: string; weekday?: number; monthDate?: number; email: string };
    const { keywords, categories, frequency, weekday, monthDate, email } = body;

    if (!email || (!keywords && (!categories || categories.length === 0))) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;

    const id = crypto.randomUUID();
    const confirmToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO subscriptions
        (id, email, keywords, categories, frequency, weekday, month_date, confirmed, confirm_token, unsubscribe_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      id, email, keywords || '',
      JSON.stringify(categories || []),
      frequency || 'daily',
      weekday ?? null, monthDate ?? null,
      confirmToken, unsubscribeToken,
    ).run();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || 'http://localhost:3000';
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

export async function GET(req: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;
    const result = await db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
    return NextResponse.json({ subscriptions: result.results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
