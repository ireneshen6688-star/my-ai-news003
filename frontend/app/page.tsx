'use client';

import { useState } from 'react';

const CATEGORIES = [
  { label: 'AI & Tech', value: 'ai-tech', emoji: '🤖' },
  { label: 'Finance', value: 'finance', emoji: '💰' },
  { label: 'Startups', value: 'startups', emoji: '🚀' },
  { label: 'Science', value: 'science', emoji: '🔬' },
  { label: 'World News', value: 'world', emoji: '🌍' },
  { label: 'Crypto', value: 'crypto', emoji: '₿' },
];

const FREQUENCIES = [
  { label: 'Daily', value: 'daily', desc: 'Every morning' },
  { label: 'Weekly', value: 'weekly', desc: 'Pick a weekday' },
  { label: 'Monthly', value: 'monthly', desc: 'Pick a date' },
];

const WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

// Month dates 1–28 (safe for all months)
const MONTH_DATES = Array.from({ length: 28 }, (_, i) => i + 1);

// Mock session — replace with real NextAuth useSession() once auth is wired up
function useMockSession() {
  // TODO: replace with:
  //   import { useSession, signIn, signOut } from 'next-auth/react';
  //   return useSession();
  return { user: null as null | { name: string; email: string; image?: string } };
}

export default function Home() {
  const { user } = useMockSession();

  const [keywords, setKeywords] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('daily');
  const [weekday, setWeekday] = useState(1);       // 1 = Monday
  const [monthDate, setMonthDate] = useState(1);   // 1st of month
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [devConfirmUrl, setDevConfirmUrl] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleCategory = (value: string) => {
    setSelectedCategories(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  };

  const handleSignIn = () => {
    window.location.href = '/login';
  };

  const handleSignUp = () => {
    window.location.href = '/register';
  };

  const handleSignOut = () => {
    // TODO: signOut()
    window.location.href = '/api/auth/signout';
  };

  const handleConfirm = async () => {
    setError('');

    if (!keywords.trim() && selectedCategories.length === 0) {
      setError('Please enter at least one keyword or select a category.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.needsSignIn) {
        sessionStorage.setItem('pendingSubscription', JSON.stringify({
          keywords: keywords.trim(),
          categories: selectedCategories,
          frequency,
          email,
        }));
        window.location.href = '/api/auth/signin?provider=google&callbackUrl=/subscribe/confirm';
        return;
      }

      const subRes = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.trim(),
          categories: selectedCategories,
          frequency,
          weekday: frequency === 'weekly' ? weekday : undefined,
          monthDate: frequency === 'monthly' ? monthDate : undefined,
          email,
        }),
      });

      if (!subRes.ok) throw new Error('Failed to create subscription');
      const subData = await subRes.json();
      if (subData.dev_confirm_url) setDevConfirmUrl(subData.dev_confirm_url);
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header
          user={user}
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onSignOut={handleSignOut}
        />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost there!</h2>
            <p className="text-gray-600 mb-1">We sent a confirmation email to:</p>
            <p className="font-medium text-gray-800 mb-4">{email}</p>
            <p className="text-gray-500 text-sm mb-4">Click the link in the email to activate your digest.</p>

            {/* Dev-only: show confirm link directly so you don't need to check console */}
            {devConfirmUrl && (
              <div className="mt-2 mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-yellow-700 mb-2">🧪 Local dev — click to confirm directly:</p>
                <a
                  href={devConfirmUrl}
                  className="text-xs text-blue-600 break-all underline hover:text-blue-800"
                >
                  {devConfirmUrl}
                </a>
              </div>
            )}

            <button
              onClick={() => { setSuccess(false); setDevConfirmUrl(''); }}
              className="mt-2 text-primary text-sm hover:underline"
            >
              ← Edit preferences
            </button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        user={user}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Build your personal news feed
          </h1>
          <p className="text-gray-500">
            Tell us what you care about — we&apos;ll deliver an AI-curated digest with verified sources.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          {/* Step 1: Keywords */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              1. Keywords <span className="text-gray-400 font-normal">(comma separated)</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. ChatGPT, NVIDIA, climate change"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Step 2: Categories */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              2. Quick-pick categories <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedCategories.includes(cat.value)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Frequency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              3. Delivery frequency
            </label>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    frequency === f.value
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-sm font-semibold ${frequency === f.value ? 'text-primary' : 'text-gray-800'}`}>
                    {f.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>

            {/* Weekly: pick weekday */}
            {frequency === 'weekly' && (
              <div className="mt-1">
                <p className="text-xs text-gray-500 mb-2">Which day of the week?</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEKDAYS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setWeekday(d.value)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${
                        weekday === d.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly: pick date */}
            {frequency === 'monthly' && (
              <div className="mt-1">
                <p className="text-xs text-gray-500 mb-2">Which day of the month?</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {MONTH_DATES.map(d => (
                    <button
                      key={d}
                      onClick={() => setMonthDate(d)}
                      className={`h-9 rounded-lg text-sm font-medium border transition-colors ${
                        monthDate === d
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {monthDate > 28 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Note: delivery skipped in months with fewer days.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Step 4: Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              4. Delivery email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-base"
          >
            {loading ? 'Checking…' : '✅ Confirm — Start My Digest'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            By confirming, we&apos;ll check if you have an account. Each news item includes a verified source link.
          </p>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-gray-400">
          <span>✓ Verified source links</span>
          <span>✓ AI-powered summaries</span>
          <span>✓ Free to start</span>
        </div>
      </main>

      <PageFooter />
    </div>
  );
}

/* ─── Header Component ─────────────────────────────────────────── */

interface HeaderProps {
  user: { name: string; email: string; image?: string } | null;
  showUserMenu: boolean;
  setShowUserMenu: (v: boolean) => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
}

function Header({ user, showUserMenu, setShowUserMenu, onSignIn, onSignUp, onSignOut }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">📰</span>
          <span className="text-xl font-bold text-gray-900">My AI News</span>
        </div>

        {/* Right side: auth */}
        <div className="relative">
          {user ? (
            <>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-gray-700 font-medium max-w-[140px] truncate">
                  {user.name}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <a
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My Subscriptions
                  </a>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </a>
                  <button
                    onClick={onSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onSignIn}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={onSignUp}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Footer Component ─────────────────────────────────────────── */

function PageFooter() {
  return (
    <footer className="py-8 text-center">
      <p className="text-sm text-gray-400 italic">
        Hope something good finds you today ✨
      </p>
      <p className="text-xs text-gray-300 mt-2">
        © {new Date().getFullYear()} My AI News · Privacy · Terms
      </p>
    </footer>
  );
}
