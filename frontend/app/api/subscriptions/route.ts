import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendConfirmEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keywords, categories, frequency, weekday, monthDate, email } = body;

    if (!email || (!keywords && (!categories || categories.length === 0))) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const confirmToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    db.prepare(`
      INSERT INTO subscriptions
        (id, email, keywords, categories, frequency, weekday, month_date, confirmed, confirm_token, unsubscribe_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id, email, keywords || '',
      JSON.stringify(categories || []),
      frequency || 'daily',
      weekday ?? null, monthDate ?? null,
      confirmToken, unsubscribeToken,
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/confirm?token=${confirmToken}`;

    // Send real confirmation email via Resend
    try {
      await sendConfirmEmail({ to: email, confirmUrl });
      console.log(`[Resend] Confirmation email sent to ${email}`);
    } catch (mailErr) {
      console.error('[Resend] Failed to send confirmation email:', mailErr);
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

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
    return NextResponse.json({ subscriptions: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
