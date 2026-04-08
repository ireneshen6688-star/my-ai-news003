/**
 * app/api/paypal/webhook/route.ts
 *
 * POST /api/paypal/webhook
 * PayPal 主动推送订阅事件到此端点。
 *
 * 处理的事件：
 *   BILLING.SUBSCRIPTION.ACTIVATED   — 首次订阅激活 → 升级为 Pro
 *   BILLING.SUBSCRIPTION.RENEWED     — 按月续费成功 → 延长到期时间
 *   BILLING.SUBSCRIPTION.CANCELLED   — 用户取消    → 等到期后降级
 *   BILLING.SUBSCRIPTION.SUSPENDED   — 扣款失败    → 标记暂停
 *   PAYMENT.SALE.COMPLETED           — 单笔支付成功（可选记录）
 *
 * Cloudflare Pages 中注册方式：
 *   PayPal Dashboard → Webhooks → Add Webhook
 *   URL: https://myainews.club/api/paypal/webhook
 *   Events: 勾选以上全部
 */
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// ── PayPal 签名验证 ────────────────────────────────────────────────────────

async function verifyPayPalSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // 沙箱阶段允许跳过，生产必须配置
    console.warn('[PayPal Webhook] PAYPAL_WEBHOOK_ID not set — skipping signature check (sandbox only!)');
    return true;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base = process.env.PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  try {
    // 1. 获取 access token
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = await tokenRes.json() as { access_token: string };

    // 2. 调用 PayPal 验签 API
    const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: req.headers.get('paypal-auth-algo'),
        cert_url: req.headers.get('paypal-cert-url'),
        transmission_id: req.headers.get('paypal-transmission-id'),
        transmission_sig: req.headers.get('paypal-transmission-sig'),
        transmission_time: req.headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });

    const { verification_status } = await verifyRes.json() as { verification_status: string };
    return verification_status === 'SUCCESS';
  } catch (e) {
    console.error('[PayPal Webhook] Signature verification error:', e);
    return false;
  }
}

// ── 事件处理 ───────────────────────────────────────────────────────────────

interface PayPalWebhookEvent {
  event_type: string;
  resource: {
    id: string;                    // subscription ID
    custom_id?: string;            // 我们存的 user_id
    status?: string;
    billing_info?: {
      next_billing_time?: string;
    };
  };
}

async function handleActivated(db: D1Database, event: PayPalWebhookEvent) {
  const userId = event.resource.custom_id;
  const subscriptionId = event.resource.id;
  if (!userId) return;

  const expiresAt = Math.floor(Date.now() / 1000) + 32 * 86400; // 1 month + 1 day grace

  await db.prepare(`
    UPDATE users
    SET plan = 'pro',
        plan_expires_at = ?,
        paypal_subscription_id = ?
    WHERE id = ?
  `).bind(expiresAt, subscriptionId, userId).run();

  console.log(`[PayPal Webhook] User ${userId} activated Pro (sub: ${subscriptionId})`);
}

async function handleRenewed(db: D1Database, event: PayPalWebhookEvent) {
  const userId = event.resource.custom_id;
  const subscriptionId = event.resource.id;
  if (!userId) return;

  // 续费成功：再延长一个月
  const expiresAt = Math.floor(Date.now() / 1000) + 32 * 86400;

  await db.prepare(`
    UPDATE users
    SET plan = 'pro',
        plan_expires_at = ?,
        paypal_subscription_id = ?
    WHERE id = ?
  `).bind(expiresAt, subscriptionId, userId).run();

  console.log(`[PayPal Webhook] User ${userId} renewed Pro (sub: ${subscriptionId})`);
}

async function handleCancelled(db: D1Database, event: PayPalWebhookEvent) {
  const userId = event.resource.custom_id;
  if (!userId) return;

  // 取消后不立即降级，等 plan_expires_at 到期自然降级
  // 仅清除 subscription ID，保留 plan 和 expires_at
  await db.prepare(`
    UPDATE users
    SET paypal_subscription_id = NULL
    WHERE id = ?
  `).bind(userId).run();

  console.log(`[PayPal Webhook] User ${userId} cancelled Pro — will expire at plan_expires_at`);
}

async function handleSuspended(db: D1Database, event: PayPalWebhookEvent) {
  const userId = event.resource.custom_id;
  if (!userId) return;

  // 扣款失败暂停：立即降为 free
  await db.prepare(`
    UPDATE users
    SET plan = 'free',
        plan_expires_at = NULL,
        paypal_subscription_id = NULL
    WHERE id = ?
  `).bind(userId).run();

  console.log(`[PayPal Webhook] User ${userId} suspended — downgraded to free`);
}

// ── 主路由 ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 验证签名
  const valid = await verifyPayPalSignature(req, rawBody);
  if (!valid) {
    console.error('[PayPal Webhook] Invalid signature — rejected');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  console.log(`[PayPal Webhook] Received: ${event.event_type} — sub: ${event.resource?.id}`);

  try {
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleActivated(db, event);
        break;
      case 'BILLING.SUBSCRIPTION.RENEWED':
        await handleRenewed(db, event);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleCancelled(db, event);
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handleSuspended(db, event);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        console.log(`[PayPal Webhook] Payment completed: ${event.resource?.id}`);
        break;
      default:
        console.log(`[PayPal Webhook] Unhandled event: ${event.event_type}`);
    }
  } catch (e) {
    console.error(`[PayPal Webhook] Handler error for ${event.event_type}:`, e);
    // 仍然返回 200，避免 PayPal 无限重试
  }

  // 必须返回 200，否则 PayPal 会重试最多 3 次
  return NextResponse.json({ received: true });
}
