'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Subscription {
  id: string;
  email: string;
  keywords: string;
  categories: string;
  frequency: string;
  weekday: number | null;
  month_date: number | null;
  send_hour: number;
  send_minute: number;
  confirmed: number;
  created_at: string;
  unsubscribe_token: string;
  last_successful_run_at: number | null;
  next_run_at: number | null;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatSchedule(sub: Subscription) {
  const time = `${String(sub.send_hour ?? 8).padStart(2, '0')}:${String(sub.send_minute ?? 0).padStart(2, '0')} UTC`;
  if (sub.frequency === 'daily') return `Daily at ${time}`;
  if (sub.frequency === 'weekly' && sub.weekday != null)
    return `Every ${WEEKDAY_LABELS[sub.weekday]} at ${time}`;
  if (sub.frequency === 'monthly' && sub.month_date != null)
    return `Monthly on day ${sub.month_date} at ${time}`;
  return sub.frequency;
}

function formatEpoch(epoch: number | null): string {
  if (!epoch) return '—';
  return new Date(epoch * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() as Promise<{ user: SessionUser | null }> : { user: null })
      .then(data => {
        if (!data.user) {
          // Not logged in → redirect to login
          router.replace('/login?redirect=/dashboard');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.replace('/login?redirect=/dashboard'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  // ── Fetch subscriptions (only after auth confirmed) ─────────────────────
  const fetchSubs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions');
      if (res.status === 401) {
        router.replace('/login?redirect=/dashboard');
        return;
      }
      const data = await res.json() as { subscriptions: Subscription[] };
      setSubs(data.subscriptions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchSubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUnsubscribe = async (token: string, id: string) => {
    if (!confirm('Cancel this subscription?')) return;
    setRemoving(id);
    await fetch(`/api/unsubscribe?token=${token}`);
    setSubs(prev => prev.filter(s => s.id !== id));
    setRemoving(null);
  };

  // ── Loading state (auth check in progress) ──────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-gray-400">Checking session…</div>
      </div>
    );
  }

  // user will be set by the time auth resolves (or we've been redirected)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">📰</span>
            <span className="text-xl font-bold text-gray-900">My AI News</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
            <Link href="/" className="text-sm text-primary hover:underline">+ New subscription</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Subscriptions</h1>
        <p className="text-sm text-gray-400 mb-6">Showing digests for {user.email}</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : subs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">No subscriptions yet.</p>
            <Link href="/" className="text-primary text-sm hover:underline">Create your first digest →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map(sub => {
              const cats = (() => { try { return JSON.parse(sub.categories) as string[]; } catch { return []; } })();
              return (
                <div key={sub.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          sub.confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sub.confirmed ? '✅ Active' : '⏳ Pending confirmation'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 capitalize">
                          {sub.frequency}
                        </span>
                      </div>

                      {/* Keywords */}
                      {sub.keywords && (
                        <p className="text-sm font-medium text-gray-800 truncate mb-1">
                          🔍 {sub.keywords}
                        </p>
                      )}

                      {/* Categories */}
                      {cats.length > 0 && (
                        <p className="text-xs text-gray-500 mb-1">
                          📂 {cats.join(', ')}
                        </p>
                      )}

                      {/* Schedule */}
                      <p className="text-xs text-gray-400 mb-1">
                        🕐 {formatSchedule(sub)}
                      </p>

                      {/* Next run */}
                      {sub.confirmed === 1 && sub.next_run_at && (
                        <p className="text-xs text-gray-400">
                          📅 Next digest: {formatEpoch(sub.next_run_at)}
                        </p>
                      )}

                      {/* Last sent */}
                      {sub.last_successful_run_at && (
                        <p className="text-xs text-gray-300 mt-0.5">
                          Last sent: {formatEpoch(sub.last_successful_run_at)}
                        </p>
                      )}
                    </div>

                    {/* Unsubscribe button */}
                    <button
                      onClick={() => handleUnsubscribe(sub.unsubscribe_token, sub.id)}
                      disabled={removing === sub.id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 whitespace-nowrap mt-1 transition-colors"
                    >
                      {removing === sub.id ? 'Removing…' : 'Cancel'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-sm text-gray-400 italic">Hope something good finds you today ✨</p>
      </footer>
    </div>
  );
}
