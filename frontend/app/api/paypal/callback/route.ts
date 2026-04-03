/**
 * app/api/paypal/callback/route.ts
 *
 * GET /api/paypal/callback?subscription_id=I-XXXX
 * PayPal redirects here after user approves payment.
 * We verify the subscription is ACTIVE, then upgrade the user to Pro.
 */
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { parseSessionToken } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSubscriptionStatus } from '@/lib/paypal';

export async function GET(req: NextRequest) {
  const subscriptionId = req.nextUrl.searchParams.get('subscription_id');
  if (!subscriptionId) {
    return NextResponse.redirect(new URL('/upgrade?error=missing_subscription', req.url));
  }

  const sessionToken = req.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login?redirect=/upgrade', req.url));
  }

  const session = await parseSessionToken(sessionToken);
  if (!session) {
    return NextResponse.redirect(new URL('/login?redirect=/upgrade', req.url));
  }

  try {
    const { status, userId } = await getSubscriptionStatus(subscriptionId);

    // Verify this subscription belongs to the logged-in user
    if (userId !== session.userId) {
      return NextResponse.redirect(new URL('/upgrade?error=mismatch', req.url));
    }

    if (status !== 'ACTIVE' && status !== 'APPROVAL_PENDING') {
      return NextResponse.redirect(new URL(`/upgrade?error=status_${status}`, req.url));
    }

    // Upgrade user to Pro (expires in 1 month + 1 day grace)
    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;

    const expiresAt = Math.floor(Date.now() / 1000) + 32 * 86400; // ~1 month

    await db
      .prepare(`
        UPDATE users
        SET plan = 'pro',
            plan_expires_at = ?
        WHERE id = ?
      `)
      .bind(expiresAt, session.userId)
      .run();

    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL('/dashboard?upgraded=1', req.url));
  } catch (e) {
    console.error('[paypal/callback]', e);
    return NextResponse.redirect(new URL('/upgrade?error=verify_failed', req.url));
  }
}
