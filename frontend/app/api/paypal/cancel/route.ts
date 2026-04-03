/**
 * app/api/paypal/cancel/route.ts
 *
 * POST /api/paypal/cancel
 * Cancel the user's Pro subscription.
 */
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { parseSessionToken } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { cancelSubscription } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get('session')?.value;
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await parseSessionToken(sessionToken);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  const user = await db
    .prepare('SELECT id, plan, paypal_subscription_id FROM users WHERE id = ?')
    .bind(session.userId)
    .first<{ id: string; plan: string; paypal_subscription_id: string | null }>();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.plan !== 'pro') return NextResponse.json({ error: 'Not on Pro plan' }, { status: 400 });

  try {
    if (user.paypal_subscription_id) {
      await cancelSubscription(user.paypal_subscription_id);
    }

    // Downgrade to free
    await db
      .prepare(`UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = ?`)
      .bind(user.id)
      .run();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[paypal/cancel]', e);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
