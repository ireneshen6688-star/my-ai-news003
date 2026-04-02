'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() as Promise<{ user: User | null }> : { user: null })
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">📰</span>
            <span className="text-xl font-bold text-gray-900">My AI News</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">My Subscriptions</Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-4">
            {/* Account card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Account</h2>
              <div className="flex items-center gap-4">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Signed in with Google</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between py-2 text-sm text-gray-700 hover:text-primary transition-colors"
                >
                  <span>My Subscriptions</span>
                  <span className="text-gray-300">→</span>
                </Link>
                <div className="border-t border-gray-50" />
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="w-full text-left py-2 text-sm text-red-500 hover:text-red-600 disabled:opacity-40 transition-colors"
                >
                  {logoutLoading ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">You&apos;re not signed in.</p>
            <Link href="/login" className="text-primary text-sm hover:underline">Sign in →</Link>
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-sm text-gray-400 italic">Hope something good finds you today ✨</p>
      </footer>
    </div>
  );
}
