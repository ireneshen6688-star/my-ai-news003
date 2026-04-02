'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Subscription {
  id: string; email: string; keywords: string; categories: string;
  frequency: string; weekday: number | null; month_date: number | null;
  send_hour: number; send_minute: number; confirmed: number;
  created_at: string; unsubscribe_token: string;
  last_successful_run_at: number | null; next_run_at: number | null;
}
interface SessionUser { id: string; name: string; email: string; avatar?: string; plan?: string; }

const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function formatSchedule(sub: Subscription) {
  const time = `${String(sub.send_hour??8).padStart(2,'0')}:${String(sub.send_minute??0).padStart(2,'0')} UTC`;
  if (sub.frequency === 'daily')   return `Daily at ${time}`;
  if (sub.frequency === 'weekly' && sub.weekday != null) return `Every ${WEEKDAY_LABELS[sub.weekday]} at ${time}`;
  if (sub.frequency === 'monthly' && sub.month_date != null) return `Monthly on day ${sub.month_date} at ${time}`;
  return sub.frequency;
}
function formatEpoch(epoch: number | null): string {
  if (!epoch) return '—';
  return new Date(epoch * 1000).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'});
}
const FREQ_COLORS: Record<string, string> = {
  daily:   'bg-blue-50 text-blue-600 border-blue-100',
  weekly:  'bg-violet-50 text-violet-600 border-violet-100',
  monthly: 'bg-pink-50 text-pink-600 border-pink-100',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user,       setUser]       = useState<SessionUser | null>(null);
  const [authLoading,setAuthLoading]= useState(true);
  const [subs,       setSubs]       = useState<Subscription[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [removing,   setRemoving]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() as Promise<{user:SessionUser|null}> : {user:null})
      .then(d => { if (!d.user) router.replace('/login?redirect=/dashboard'); else setUser(d.user); })
      .catch(() => router.replace('/login?redirect=/dashboard'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions');
      if (res.status === 401) { router.replace('/login?redirect=/dashboard'); return; }
      const data = await res.json() as { subscriptions: Subscription[] };
      setSubs(data.subscriptions || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetchSubs(); }, [user]); // eslint-disable-line

  const handleUnsubscribe = async (token: string, id: string) => {
    if (!confirm('Cancel this subscription?')) return;
    setRemoving(id);
    await fetch(`/api/unsubscribe?token=${token}`);
    setSubs(p => p.filter(s => s.id !== id));
    setRemoving(null);
  };

  if (authLoading) return (
    <div className="min-h-screen hero-gradient-animated flex items-center justify-center">
      <div className="text-sm text-gray-400">Checking session…</div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen hero-gradient-animated flex flex-col">
      <header className="bg-white/70 backdrop-blur-md border-b border-white/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-soft">N</div>
            <span className="text-lg font-bold text-gray-900">My AI News</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/news" className="text-sm text-gray-500 hover:text-primary-600 transition-colors">News Feed</Link>
            <Link href="/" className="btn-primary text-sm px-4 py-2">+ New subscription</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
          <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded-xl w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded-xl w-2/3" />
              </div>
            ))}
          </div>
        ) : subs.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 text-sm mb-4">No subscriptions yet.</p>
            <Link href="/" className="text-primary-600 text-sm hover:underline">Create your first digest →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map(sub => {
              const cats = (() => { try { return JSON.parse(sub.categories) as string[]; } catch { return []; } })();
              return (
                <div key={sub.id} className="glass-card p-5 hover:shadow-card transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`badge border ${sub.confirmed ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {sub.confirmed ? '✅ Active' : '⏳ Pending'}
                        </span>
                        <span className={`badge border ${FREQ_COLORS[sub.frequency] || 'bg-gray-50 text-gray-600 border-gray-100'} capitalize`}>
                          {sub.frequency}
                        </span>
                      </div>
                      {sub.keywords && (
                        <p className="text-sm font-semibold text-gray-800 truncate mb-1">🔍 {sub.keywords}</p>
                      )}
                      {cats.length > 0 && (
                        <p className="text-xs text-gray-400 mb-1">📂 {cats.join(', ')}</p>
                      )}
                      <p className="text-xs text-gray-400 mb-1">🕐 {formatSchedule(sub)}</p>
                      {sub.confirmed === 1 && sub.next_run_at && (
                        <p className="text-xs text-primary-400">📅 Next: {formatEpoch(sub.next_run_at)}</p>
                      )}
                      {sub.last_successful_run_at && (
                        <p className="text-xs text-gray-300 mt-0.5">Last sent: {formatEpoch(sub.last_successful_run_at)}</p>
                      )}
                    </div>
                    <button onClick={() => handleUnsubscribe(sub.unsubscribe_token, sub.id)}
                      disabled={removing === sub.id}
                      className="text-xs text-gray-300 hover:text-red-400 disabled:opacity-40 whitespace-nowrap mt-1 transition-colors">
                      {removing === sub.id ? '…' : 'Cancel'}
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
