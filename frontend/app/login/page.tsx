'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'oauth_state_mismatch')  setError('Login session expired. Please try again.');
    else if (err === 'oauth_missing_params') setError('OAuth params missing. Please try again.');
    else if (err === 'oauth_failed')     setError('Google login failed. Please try again.');
    else if (err === 'no_email')         setError('Could not retrieve email from Google.');
    else if (err)                        setError(`Login error: ${err}`);
  }, []);

  const handleGoogleLogin = () => { setLoading(true); window.location.href = '/api/auth/google'; };

  return (
    <div className="min-h-screen hero-gradient-animated flex flex-col">
      <header className="bg-white/70 backdrop-blur-md border-b border-white/60">
        <div className="max-w-5xl mx-auto px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 w-fit">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-soft">N</div>
            <span className="text-lg font-bold text-gray-900">My AI News</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass-card p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl mx-auto mb-5 shadow-glow">
            📰
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-6">
            No account?{' '}
            <Link href="/register" className="text-primary-600 hover:underline font-medium">Sign up free</Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 mb-4 text-left">
              {error}
            </div>
          )}

          <button onClick={handleGoogleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-3.5 text-sm font-medium text-gray-700 bg-white hover:bg-muted hover:border-primary-200 disabled:opacity-60 transition-all shadow-soft">
            {loading
              ? <span className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
              : <GoogleIcon />}
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p className="text-xs text-gray-300 mt-5">
            We only use Google to verify your identity.
          </p>
        </div>
      </div>

      <footer className="py-6 text-center">
        <p className="text-sm text-gray-300 italic">Hope something good finds you today ✨</p>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
