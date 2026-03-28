'use client';

import { useEffect, useState } from 'react';

interface Subscription {
  id: string;
  email: string;
  keywords: string;
  categories: string;
  frequency: string;
  weekday: number | null;
  month_date: number | null;
  confirmed: number;
  created_at: string;
  unsubscribe_token: string;
}

export default function TestPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>('');

  const fetchSubs = async () => {
    setLoading(true);
    const res = await fetch('/api/subscriptions');
    const data = await res.json() as { subscriptions: Subscription[] };
    setSubs(data.subscriptions || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const sendDigest = async () => {
    setSending(true);
    setResult('');
    const res = await fetch('/api/send-digest', { method: 'POST' });
    const data = await res.json() as Record<string, unknown>;
    setResult(JSON.stringify(data, null, 2));
    setSending(false);
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🧪 Local Test Dashboard</h1>
        <p className="text-sm text-gray-500 mb-8">Use this page to inspect subscriptions and manually trigger the digest.</p>

        {/* Subscriptions Table */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Subscriptions ({subs.length})</h2>
            <button onClick={fetchSubs} className="text-sm text-blue-500 hover:underline">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-gray-400 text-sm">Loading…</div>
          ) : subs.length === 0 ? (
            <div className="px-6 py-8 text-gray-400 text-sm">
              No subscriptions yet. <a href="/" className="text-blue-500 underline">Go to homepage</a> to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {subs.map(s => (
                <div key={s.id} className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.confirmed ? '✅ Confirmed' : '⏳ Pending'}
                    </span>
                    <span className="font-medium text-gray-900">{s.email}</span>
                  </div>
                  <div className="text-gray-500 space-x-3">
                    <span>Keywords: <span className="text-gray-700">{s.keywords || '—'}</span></span>
                    <span>·</span>
                    <span>Freq: <span className="text-gray-700">
                      {s.frequency === 'weekly' && s.weekday != null
                        ? `Weekly (${WEEKDAYS[s.weekday]})`
                        : s.frequency === 'monthly' && s.month_date != null
                        ? `Monthly (day ${s.month_date})`
                        : s.frequency}
                    </span></span>
                    <span>·</span>
                    <span className="text-gray-400">{new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  {!s.confirmed && (
                    <div className="mt-1">
                      <a
                        href={`/api/confirm?token=${s.id}`}
                        className="text-xs text-blue-500 hover:underline"
                        target="_blank"
                      >
                        (Check server console for confirm URL)
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Digest */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-2">Trigger Digest Send</h2>
          <p className="text-sm text-gray-500 mb-4">
            Sends mock news to all <strong>confirmed</strong> subscriptions. Check server console for email output.
          </p>
          <button
            onClick={sendDigest}
            disabled={sending}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? 'Sending…' : '🚀 Send Digest Now'}
          </button>

          {result && (
            <pre className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-auto">
              {result}
            </pre>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back to homepage</a>
        </div>
      </div>
    </div>
  );
}
