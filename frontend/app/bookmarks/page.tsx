'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BookmarkRow {
  id: string;
  keyword: string;
  title: string;
  url: string;
  source: string;
  published_at: number;
  summary: string | null;
  saved_at: number;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  plan?: string;
}

function timeAgo(epoch: number): string {
  const diff = Math.floor(Date.now() / 1000) - epoch;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [grouped, setGrouped] = useState<Record<string, BookmarkRow[]>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() as Promise<{ user: SessionUser | null }> : { user: null })
      .then(data => {
        if (!data.user) {
          router.replace('/login?redirect=/bookmarks');
          return;
        }
        if (data.user.plan !== 'pro') {
          router.replace('/upgrade');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.replace('/login?redirect=/bookmarks'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  // Load bookmarks
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch('/api/bookmarks')
      .then(r => r.json() as Promise<{ grouped: Record<string, BookmarkRow[]> }>)
      .then(data => setGrouped(data.grouped || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleRemove = async (id: string, keyword: string) => {
    setRemoving(id);
    try {
      await fetch(`/api/bookmarks?id=${id}`, { method: 'DELETE' });
      setGrouped(prev => ({
        ...prev,
        [keyword]: prev[keyword].filter(b => b.id !== id),
      }));
    } finally {
      setRemoving(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!user) return null;

  const keywords = Object.keys(grouped);
  const activeKeyword = keywords[activeTab];
  const activeBookmarks = (grouped[activeKeyword] || []).sort((a, b) => b.saved_at - a.saved_at);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <span className="text-xl">📰</span>
            <span className="text-lg font-bold text-gray-900">My AI News</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/news" className="text-sm text-gray-500 hover:text-primary">News Feed</Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">Subscriptions</Link>
          </div>
        </div>

        {/* Keyword tabs */}
        {keywords.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
            {keywords.map((kw, i) => (
              <button
                key={kw}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === i
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔖 {kw}
                <span className="ml-1 text-xs text-gray-400">
                  ({(grouped[kw] || []).length})
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Bookmarks</h1>
        <p className="text-sm text-gray-400 mb-6">Your saved articles, sorted by most recent.</p>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && keywords.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <div className="text-4xl mb-3">🔖</div>
            <p className="text-gray-400 text-sm mb-4">No bookmarks yet.</p>
            <Link href="/news" className="text-primary text-sm hover:underline">
              Go to News Feed to save articles →
            </Link>
          </div>
        )}

        {!loading && activeBookmarks.length > 0 && (
          <div className="space-y-3">
            {activeBookmarks.map(bookmark => (
              <div key={bookmark.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-gray-500">{bookmark.source}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        Published {timeAgo(bookmark.published_at)}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-300">
                        Saved {timeAgo(bookmark.saved_at)}
                      </span>
                    </div>

                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-semibold text-gray-900 hover:text-primary mb-2 leading-snug"
                    >
                      {bookmark.title} ↗
                    </a>

                    {bookmark.summary && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {bookmark.summary}
                      </p>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(bookmark.id, bookmark.keyword)}
                    disabled={removing === bookmark.id}
                    className="flex-shrink-0 text-xs text-gray-300 hover:text-red-400 transition-colors mt-0.5 disabled:opacity-40"
                    title="Remove bookmark"
                  >
                    {removing === bookmark.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && keywords.length > 0 && activeBookmarks.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No bookmarks for "{activeKeyword}" yet.</p>
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-sm text-gray-300 italic">Hope something good finds you today ✨</p>
      </footer>
    </div>
  );
}
