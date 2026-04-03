/**
 * lib/paypal.ts
 *
 * PayPal Subscriptions API helper (sandbox + production).
 * Uses PayPal REST API v1 for subscriptions (recurring billing).
 */

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

// Pro plan: $5/month — set this Plan ID after creating it in PayPal dashboard
// or we create it dynamically on first use
let cachedPlanId: string | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('PayPal credentials not configured');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/**
 * Create or retrieve the PayPal billing plan for Pro ($5/month).
 * Cached in memory — survives for the lifetime of the Worker instance.
 */
export async function getOrCreateProPlanId(): Promise<string> {
  if (cachedPlanId) return cachedPlanId;

  const token = await getAccessToken();

  // Check if we stored it in env
  if (process.env.PAYPAL_PRO_PLAN_ID) {
    cachedPlanId = process.env.PAYPAL_PRO_PLAN_ID;
    return cachedPlanId;
  }

  // Create a product first
  const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'myainews-pro-product-v1',
    },
    body: JSON.stringify({
      name: 'My AI News Pro',
      description: 'Pro subscription: 5 keywords, 20 articles each, bookmarks',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });

  const product = await productRes.json() as { id: string };

  // Create billing plan
  const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'myainews-pro-plan-v1',
    },
    body: JSON.stringify({
      product_id: product.id,
      name: 'My AI News Pro Monthly',
      description: 'Pro plan - $5/month',
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // infinite
          pricing_scheme: {
            fixed_price: { value: '5', currency_code: 'USD' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: '0', currency_code: 'USD' },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });

  const plan = await planRes.json() as { id: string };
  cachedPlanId = plan.id;
  return cachedPlanId;
}

/**
 * Create a PayPal subscription for a user.
 * Returns the approval URL the user must visit to authorize payment.
 */
export async function createSubscription(opts: {
  planId: string;
  userId: string;
  userEmail: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `sub-${opts.userId}-${Date.now()}`,
    },
    body: JSON.stringify({
      plan_id: opts.planId,
      subscriber: {
        email_address: opts.userEmail,
      },
      application_context: {
        brand_name: 'My AI News',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
      custom_id: opts.userId, // we'll use this in webhook to link subscription → user
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal subscription creation failed: ${err}`);
  }

  const data = await res.json() as {
    id: string;
    links: Array<{ href: string; rel: string }>;
  };

  const approvalLink = data.links.find(l => l.rel === 'approve');
  if (!approvalLink) throw new Error('No approval URL in PayPal response');

  return {
    subscriptionId: data.id,
    approvalUrl: approvalLink.href,
  };
}

/**
 * Verify a PayPal subscription is active.
 */
export async function getSubscriptionStatus(subscriptionId: string): Promise<{
  status: string;
  userId: string;
}> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`PayPal subscription fetch failed: ${res.status}`);

  const data = await res.json() as {
    status: string;
    custom_id: string;
  };

  return {
    status: data.status, // ACTIVE, SUSPENDED, CANCELLED, etc.
    userId: data.custom_id,
  };
}

/**
 * Cancel a PayPal subscription.
 */
export async function cancelSubscription(subscriptionId: string, reason = 'User requested cancellation'): Promise<void> {
  const token = await getAccessToken();

  await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
}
