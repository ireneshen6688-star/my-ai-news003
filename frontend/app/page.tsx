'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkKeywordsZh } from '@/lib/contentFilter';

const CATEGORIES = [
  { label: 'AI & Tech', value: 'ai-tech', emoji: '🤖' },
  { label: 'Finance',   value: 'finance',  emoji: '💰' },
  { label: 'Startups',  value: 'startups', emoji: '🚀' },
  { label: 'Science',   value: 'science',  emoji: '🔬' },
  { label: 'World News',value: 'world',    emoji: '🌍' },
  { label: 'Crypto',    value: 'crypto',   emoji: '₿'  },
];

const FREQUENCIES = [
  { label: 'Daily',   value: 'daily',   desc: 'Every morning' },
  { label: 'Weekly',  value: 'weekly',  desc: 'Pick a weekday' },
  { label: 'Monthly', value: 'monthly', desc: 'Pick a date'   },
];

const WEEKDAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((l,i) => ({ label: l, value: (i+1)%7 }));
const MONTH_DATES = Array.from({ length: 28 }, (_, i) => i + 1);
const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

interface SessionUser { id: string; name: string; email: string; avatar?: string; plan?: string; }

function useSession() {
  const [user, setUser]       = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() as Promise<{ user: SessionUser | null }> : { user: null })
      .then(d => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  return { user, loading };
}

export default function Home() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [keywords,            setKeywords]            = useState('');
  const [keywordWarning,      setKeywordWarning]      = useState('');
  const [selectedCategories,  setSelectedCategories]  = useState<string[]>([]);
  const [frequency,           setFrequency]           = useState('daily');
  const [weekday,             setWeekday]             = useState(1);
  const [monthDate,           setMonthDate]           = useState(1);
  const [sendHour,            setSendHour]            = useState(8);
  const [sendMinute,          setSendMinute]          = useState(0);
  const [email,               setEmail]               = useState('');
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState('');
  const [success,             setSuccess]             = useState(false);
  const [devConfirmUrl,       setDevConfirmUrl]       = useState('');
  const [showUserMenu,        setShowUserMenu]        = useState(false);

  const toggleCategory = (v: string) =>
    setSelectedCategories(p => p.includes(v) ? p.filter(c => c !== v) : [...p, v]);

  const handleKeywordsChange = (v: string) => {
    setKeywords(v);
    if (v.trim()) {
      const r = checkKeywordsZh(v);
      setKeywordWarning(r.blocked ? (r.message ?? '') : '');
    } else setKeywordWarning('');
  };

  const handleConfirm = async () => {
    setError('');
    if (!keywords.trim() && selectedCategories.length === 0) {
      setError('Please enter at least one keyword or select a category.');
      return;
    }
    if (keywords.trim()) {
      const r = checkKeywordsZh(keywords);
      if (r.blocked) { setError(r.message ?? ''); return; }
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.trim(), categories: selectedCategories,
          frequency,
          weekday:   frequency === 'weekly'  ? weekday   : undefined,
          monthDate: frequency === 'monthly' ? monthDate : undefined,
          sendHour, sendMinute, email,
        }),
      });
      if (!res.ok) {
        const errData = await res.json() as { error?: string; upgradeTo?: string };
        if (errData.upgradeTo === 'pro') { router.push('/upgrade'); return; }
        throw new Error(errData.error || 'Failed to create subscription');
      }
      const data = await res.json() as { dev_confirm_url?: string };
      if (data.dev_confirm_url) setDevConfirmUrl(data.dev_confirm_url);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen hero-gradient-animated flex flex-col">
      <Nav user={user} sessionLoading={sessionLoading} showUserMenu={showUserMenu} setShowUserMenu={setShowUserMenu} />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="glass-card p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost there!</h2>
          <p className="text-gray-500 mb-1">We sent a confirmation email to:</p>
          <p className="font-semibold text-gray-800 mb-4">{email}</p>
          <p className="text-gray-400 text-sm mb-4">Click the link to activate your digest.</p>
          {devConfirmUrl && (
            <div className="mt-2 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
              <p className="text-xs font-semibold text-amber-700 mb-2">🧪 Dev — confirm directly:</p>
              <a href={devConfirmUrl} className="text-xs text-primary-600 break-all underline">{devConfirmUrl}</a>
            </div>
          )}
          <button onClick={() => { setSuccess(false); setDevConfirmUrl(''); }}
            className="mt-2 text-primary-600 text-sm hover:underline">← Edit preferences</button>
        </div>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen hero-gradient-animated flex flex-col">
      <Nav user={user} sessionLoading={sessionLoading} showUserMenu={showUserMenu} setShowUserMenu={setShowUserMenu} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/70 border border-primary-100 rounded-full px-4 py-1.5 text-sm text-primary-600 font-medium mb-4 shadow-soft">
            ✨ AI-powered news digest
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 leading-tight tracking-tight">
            Your personal<br className="sm:hidden" /> news, curated by AI
          </h1>
          <p className="text-gray-500 text-lg">
            Tell us what you care about — we'll deliver a beautiful digest with verified sources.
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-7 space-y-7">

          {/* Step 1: Keywords */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              1. What topics interest you?
              <span className="text-gray-400 font-normal ml-1">(comma separated)</span>
            </label>
            <input type="text" value={keywords}
              onChange={e => handleKeywordsChange(e.target.value)}
              placeholder="e.g. ChatGPT, NVIDIA, climate change"
              className="input-field" />
            {keywordWarning && (
              <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1">
                <span>⚠️</span><span>{keywordWarning}</span>
              </p>
            )}
          </div>

          {/* Step 2: Categories */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              2. Quick-pick categories
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => toggleCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selectedCategories.includes(cat.value)
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-transparent shadow-soft'
                      : 'bg-white text-gray-600 border-border hover:border-primary-300 hover:text-primary-600'
                  }`}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Frequency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Delivery frequency</label>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {FREQUENCIES.map(f => (
                <button key={f.value} onClick={() => setFrequency(f.value)}
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    frequency === f.value
                      ? 'border-primary-400 bg-primary-50 shadow-soft'
                      : 'border-border bg-white hover:border-primary-200'
                  }`}>
                  <div className={`text-sm font-semibold ${frequency === f.value ? 'text-primary-600' : 'text-gray-800'}`}>{f.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>

            {frequency === 'weekly' && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-2">Which day?</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEKDAYS.map(d => (
                    <button key={d.value} onClick={() => setWeekday(d.value)}
                      className={`w-10 h-10 rounded-xl text-sm font-medium border transition-all ${
                        weekday === d.value
                          ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white border-transparent shadow-soft'
                          : 'bg-white text-gray-600 border-border hover:border-primary-300'
                      }`}>{d.label}</button>
                  ))}
                </div>
              </div>
            )}

            {frequency === 'monthly' && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-2">Which day of the month?</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {MONTH_DATES.map(d => (
                    <button key={d} onClick={() => setMonthDate(d)}
                      className={`h-9 rounded-xl text-sm font-medium border transition-all ${
                        monthDate === d
                          ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white border-transparent shadow-soft'
                          : 'bg-white text-gray-600 border-border hover:border-primary-300'
                      }`}>{d}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              4. Delivery time <span className="text-gray-400 font-normal">(UTC)</span>
            </label>
            <div className="flex items-center gap-3">
              <select value={sendHour} onChange={e => setSendHour(Number(e.target.value))}
                className="flex-1 input-field">
                {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
              </select>
              <span className="text-gray-300 font-medium">:</span>
              <select value={sendMinute} onChange={e => setSendMinute(Number(e.target.value))}
                className="flex-1 input-field">
                {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
              </select>
              <span className="text-sm text-gray-400 whitespace-nowrap">
                → {String(sendHour).padStart(2,'0')}:{String(sendMinute).padStart(2,'0')} UTC
              </span>
            </div>
          </div>

          {/* Step 5: Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">5. Delivery email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" className="input-field" />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleConfirm} disabled={loading || !!keywordWarning}
            className="btn-primary w-full text-base disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Setting up…' : '✨ Start My AI Digest'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Each news item includes a verified source link. No spam, ever.
          </p>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">✓ Verified sources</span>
          <span className="flex items-center gap-1.5">✓ AI summaries</span>
          <span className="flex items-center gap-1.5">✓ Free to start</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ── Nav ──────────────────────────────────────────────────────── */
function Nav({ user, sessionLoading, showUserMenu, setShowUserMenu }:
  { user: SessionUser | null; sessionLoading?: boolean; showUserMenu: boolean; setShowUserMenu: (v: boolean) => void }) {
  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };
  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-white/60 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex justify-between items-center">
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-soft">N</div>
          <span className="text-lg font-bold text-gray-900">My AI News</span>
        </a>
        <div className="relative">
          {sessionLoading ? (
            <div className="w-24 h-8 bg-gray-100 rounded-2xl animate-pulse" />
          ) : user ? (
            <>
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-border hover:border-primary-200 bg-white/80 transition-all">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                  : <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-xs flex items-center justify-center font-semibold">{user.name.charAt(0).toUpperCase()}</span>}
                <span className="text-sm text-gray-700 font-medium max-w-[120px] truncate">{user.name}</span>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-card border border-border py-1.5 z-20">
                  <div className="px-4 py-2.5 border-b border-border/60">
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    {user.plan === 'pro' && (
                      <span className="badge bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 mt-1">✨ Pro</span>
                    )}
                  </div>
                  {[
                    { href: '/news',      label: '📰 News Feed' },
                    { href: '/dashboard', label: '📋 My Subscriptions' },
                    ...(user.plan === 'pro' ? [{ href: '/bookmarks', label: '🔖 Bookmarks' }] : []),
                    { href: '/upgrade',   label: '✨ Upgrade to Pro' },
                  ].map(item => (
                    <a key={item.href} href={item.href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-muted">{item.label}</a>
                  ))}
                  <div className="border-t border-border/60 mt-1 pt-1">
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">Sign out</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/login" className="btn-ghost text-sm px-4 py-2">Sign in</a>
              <a href="/register" className="btn-primary text-sm px-4 py-2.5">Get started →</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Footer ───────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-8 text-center border-t border-border/40 mt-8">
      <p className="text-sm text-gray-400 italic">Hope something good finds you today ✨</p>
      <p className="text-xs text-gray-300 mt-1">© {new Date().getFullYear()} My AI News · <a href="/upgrade" className="hover:text-primary-500">Pricing</a></p>
    </footer>
  );
}
