'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  plan?: string;
}

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cancelled = searchParams.get('cancelled') === '1';
  const errorParam = searchParams.get('error');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() as Promise<{ user: SessionUser | null }> : { user: null })
      .then(data => setUser(data.user));
  }, []);

  const handleUpgrade = async () => {
    if (!user) {
      router.push('/login?redirect=/upgrade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/paypal/subscribe', { method: 'POST' });
      const data = await res.json() as { approvalUrl?: string; error?: string };

      if (data.approvalUrl) {
        // Redirect to PayPal approval page
        window.location.href = data.approvalUrl;
      } else {
        setError(data.error || 'Failed to start subscription. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const isPro = user?.plan === 'pro';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Header */}
      <Link href="/" className="flex items-center gap-2 mb-10 hover:opacity-80">
        <span className="text-2xl">📰</span>
        <span className="text-xl font-bold text-gray-900">My AI News</span>
      </Link>

      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose your plan</h1>
          <p className="text-gray-500">Upgrade to Pro for more keywords, more stories, and bookmarks.</p>
        </div>

        {/* Alerts */}
        {cancelled && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700 text-center">
            Payment was cancelled. You can try again anytime.
          </div>
        )}
        {errorParam && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 text-center">
            Something went wrong with payment ({errorParam}). Please try again or contact support.
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-gray-200 p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Free</h2>
              <span className="text-2xl font-bold text-gray-900">$0</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 1 keyword subscription
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 5 news stories per keyword
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Daily / weekly / monthly digest
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span>✗</span> Bookmarks
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span>✗</span> Multiple keywords
              </li>
            </ul>
            <Link
              href="/dashboard"
              className="block w-full text-center py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {isPro ? 'Downgrade to Free' : 'Current plan'}
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl border-2 border-primary p-7 relative shadow-card">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                POPULAR
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Pro</h2>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">$5</span>
                <span className="text-sm text-gray-400">/month</span>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> <strong>5</strong> keyword subscriptions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> <strong>20</strong> news stories per keyword
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Daily / weekly / monthly digest
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> <strong>Bookmarks</strong> — save articles
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Priority support
              </li>
            </ul>

            {isPro ? (
              <div className="w-full text-center py-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                ✅ Your current plan
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-soft disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Redirecting to PayPal…
                  </>
                ) : (
                  <>
                    <span>🅿️</span> Subscribe with PayPal
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secure payment via PayPal. Cancel anytime from your dashboard. No hidden fees.
        </p>

        <div className="text-center mt-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-sm text-gray-400">Loading…</div></div>}>
      <UpgradeContent />
    </Suspense>
  );
}
