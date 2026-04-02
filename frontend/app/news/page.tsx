'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Article {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  relevanceReason: string;
  keyword: string;
}

interface Subscription {
  id: string;
  keywords: string;
  categories: string;
  confirmed: number;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  plan?: string;
  avatar?: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [articles, setArticles] = useState<Article[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [savingBookmark, setSavingBookmark] = useState<string | null>(null);
  const [error, setError] = useState('');

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() as Promise<{ user: SessionUser | null }> : { user: null })
      .then(data => {
        if (!data.user) {
          router.replace('/login?redirect=/news');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.replace('/login?redirect=/news'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  // ── Load subscriptions → extract keyword tabs ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetch('/api/subscriptions')
      .then(r => r.json() as Promise<{ subscriptions: Subscription[] }>)
      .then(data => {
        const confirmed = (data.subscriptions || []).filter(s => s.confirmed === 1);
        const kws: string[] = [];
        for (const sub of confirmed) {
          if (sub.keywords) {
            // Split comma-separated keywords
            sub.keywords.split(',').forEach(k => {
              const trimmed = k.trim();
              if (trimmed && !kws.includes(trimmed)) kws.push(trimmed);
            });
          }
        }
        setKeywords(kws);
      })
      .catch(console.error);
  }, [user]);

  // ── Fetch news for active tab ───────────────────────────────────────────────
  const fetchNews = useCallback(async (keyword: string) => {
    setNewsLoading(true);
    setError('');
    setArticles([]);
    try {
      const res = await fetch(`/api/news?keyword=${encodeURIComponent(keyword)}`);
      if (res.status === 401) { router.replace('/login?redirect=/news'); return; }
      const data = await res.json() as { articles: Article[]; error?: string };
      if (data.error) { setError(data.error); return; }
      setArticles(data.articles || []);
    } catch {
      setError('Failed to load news. Please try again.');
    } finally {
      setNewsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (keywords.length > 0) {
      fetchNews(keywords[activeTab]);
    }
  }, [keywords, activeTab, fetchNews]);

  // ── Bookmark toggle ─────────────────────────────────────────────────────────
  const handleBookmark = async (article: Article) => {
    const key = article.url;
    if (bookmarkedIds.has(key)) return; // already saved

    setSavingBookmark(key);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: article.keyword,
          title: article.title,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt,
          summary: article.summary,
        }),
      });

      if (res.status === 403) {
        // Free user trying to bookmark → redirect to upgrade
        router.push('/upgrade');
        return;
      }

      if (res.ok) {
        setBookmarkedIds(prev => new Set([...prev, key]));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingBookmark(null);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!user) return null;

  const isPro = user.plan === 'pro';

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
            {isPro && (
              <Link href="/bookmarks" className="text-sm text-gray-500 hover:text-primary flex items-center gap-1">
                🔖 Bookmarks
              </Link>
            )}
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">
              My Subscriptions
            </Link>
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
                🔍 {kw}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* No subscriptions state */}
        {keywords.length === 0 && !newsLoading && (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center mt-8">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 mb-4">You have no active subscriptions yet.</p>
            <Link href="/" className="text-primary text-sm hover:underline">
              Create your first digest →
            </Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {newsLoading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Articles */}
        {!newsLoading && articles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">
                {keywords[activeTab]}
                <span className="text-sm font-normal text-gray-400 ml-2">
                  {articles.length} stories
                </span>
              </h2>
              {!isPro && (
                <Link
                  href="/upgrade"
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full hover:bg-amber-100 transition-colors"
                >
                  ✨ Upgrade to Pro for 20 stories
                </Link>
              )}
            </div>

            {articles.map((article, idx) => {
              const isBookmarked = bookmarkedIds.has(article.url);
              const isSaving = savingBookmark === article.url;
              return (
                <div key={idx} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Source + time */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-gray-500">{article.source}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{timeAgo(article.publishedAt)}</span>
                      </div>

                      {/* Title — clicks to original */}
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-semibold text-gray-900 hover:text-primary mb-2 leading-snug"
                      >
                        {article.title} ↗
                      </a>

                      {/* AI Summary */}
                      <p className="text-sm text-gray-600 leading-relaxed mb-2">
                        {article.summary}
                      </p>

                      {/* Relevance reason */}
                      <p className="text-xs text-blue-500 italic">
                        {article.relevanceReason}
                      </p>
                    </div>

                    {/* Bookmark button */}
                    <button
                      onClick={() => handleBookmark(article)}
                      disabled={isSaving || isBookmarked}
                      title={isPro ? (isBookmarked ? 'Saved' : 'Save to bookmarks') : 'Pro feature'}
                      className={`flex-shrink-0 mt-0.5 text-lg transition-all ${
                        isBookmarked
                          ? 'text-amber-400'
                          : isPro
                          ? 'text-gray-300 hover:text-amber-400'
                          : 'text-gray-200 cursor-pointer hover:text-amber-300'
                      } ${isSaving ? 'animate-pulse' : ''}`}
                    >
                      {isBookmarked ? '🔖' : '☆'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty results */}
        {!newsLoading && articles.length === 0 && keywords.length > 0 && !error && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center mt-4">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-gray-400 text-sm">No recent news found for "{keywords[activeTab]}".</p>
            <p className="text-gray-300 text-xs mt-1">Try again later or adjust your keywords.</p>
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-sm text-gray-300 italic">Hope something good finds you today ✨</p>
      </footer>
    </div>
  );
}
