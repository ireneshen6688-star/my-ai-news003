'use client';

import Link from 'next/link';

export default function UpgradePage() {
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
              Current plan
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl border-2 border-primary p-7 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                MOST POPULAR
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
                <span className="text-green-500">✓</span> <strong>5 keyword</strong> subscriptions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> <strong>20 news stories</strong> per keyword
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Daily / weekly / monthly digest
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> <strong>Bookmarks</strong> — save & organize articles
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Priority email delivery
              </li>
            </ul>

            {/* PayPal placeholder — will be wired up later */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-600 font-medium mb-1">💳 PayPal payment coming soon</p>
              <p className="text-xs text-blue-400">
                Pro subscriptions will be available shortly.
                <br />
                <Link href="/dashboard" className="underline">
                  Contact us to upgrade early →
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Cancel anytime · Secure payment via PayPal
        </p>
      </div>
    </div>
  );
}
