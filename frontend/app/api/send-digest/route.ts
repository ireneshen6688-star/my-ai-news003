export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { mockNews } from '@/lib/mockNews';
import { filterVerifiedArticles } from '@/lib/verifyLinks';
import { generateEmailHtml } from '@/lib/emailTemplate';
import { sendDigestEmail } from '@/lib/mailer';

interface Subscription {
  id: string;
  email: string;
  keywords: string;
  categories: string;
  unsubscribe_token: string;
}

export async function POST(req: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db: D1Database = (env as unknown as { DB: D1Database }).DB;

    const result = await db.prepare('SELECT * FROM subscriptions WHERE confirmed = 1').all<Subscription>();
    const subs = result.results;

    if (subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No confirmed subscriptions.' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || 'http://localhost:3000';
    const details: Array<{ email: string; articles: number; status: string; error?: string }> = [];

    for (const sub of subs) {
      try {
        const verified = await filterVerifiedArticles(mockNews);
        const articles = verified.slice(0, 10);
        const keywords = sub.keywords || JSON.parse(sub.categories).join(', ');

        const html = generateEmailHtml({ keywords, articles, unsubscribeToken: sub.unsubscribe_token, baseUrl });
        await sendDigestEmail({ to: sub.email, html, keywords });

        details.push({ email: sub.email, articles: articles.length, status: 'sent' });
      } catch (e) {
        details.push({ email: sub.email, articles: 0, status: 'failed', error: String(e) });
      }
    }

    return NextResponse.json({ success: true, sent: details.filter(d => d.status === 'sent').length, details });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
