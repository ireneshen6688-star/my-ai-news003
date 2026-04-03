/**
 * app/api/paypal/subscribe/route.ts
 *
 * POST /api/paypal/subscribe
 * Creates a PayPal subscription and returns the approval URL.
 * User must be logged in.
 */
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { parseSessionToken } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getOrCreateProPlanId, createSubscription } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get('session')?.value;
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await parseSessionToken(sessionToken);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  const user = await db
    .prepare('SELECT id, email, plan FROM users WHERE id = ?')
    .bind(session.userId)
    .first<{ id: string; email: string; plan: string }>();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.plan === 'pro') return NextResponse.json({ error: 'Already on Pro plan' }, { status: 400 });

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://myainews.club';
    const planId = await getOrCreateProPlanId();

    const { subscriptionId, approvalUrl } = await createSubscription({
      planId,
      userId: user.id,
      userEmail: user.email,
      returnUrl: `${baseUrl}/api/paypal/callback?subscription_id={id}`,
      cancelUrl: `${baseUrl}/upgrade?cancelled=1`,
    });

    // Store pending subscription ID so we can verify on callback
    await db
      .prepare('UPDATE users SET paypal_subscription_id = ? WHERE id = ?')
      .bind(subscriptionId, user.id)
      .run().catch(() => {
        // Column might not exist yet — ignore, we verify from PayPal directly
      });

    return NextResponse.json({ approvalUrl, subscriptionId });
  } catch (e) {
    console.error('[paypal/subscribe]', e);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
