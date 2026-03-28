import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mockNews } from '@/lib/mockNews';
import { filterVerifiedArticles } from '@/lib/verifyLinks';
import { generateEmailHtml } from '@/lib/emailTemplate';
import { sendDigestEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const subs = db.prepare('SELECT * FROM subscriptions WHERE confirmed = 1').all() as Array<{
      id: string; email: string; keywords: string; categories: string;
      unsubscribe_token: string;
    }>;

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

        const html = generateEmailHtml({
          keywords,
          articles,
          unsubscribeToken: sub.unsubscribe_token,
          baseUrl,
        });

        await sendDigestEmail({ to: sub.email, html, keywords });
        console.log(`[Resend] Digest sent to ${sub.email}`);
        details.push({ email: sub.email, articles: articles.length, status: 'sent' });
      } catch (e) {
        console.error(`[Resend] Failed for ${sub.email}:`, e);
        details.push({ email: sub.email, articles: 0, status: 'failed', error: String(e) });
      }
    }

    return NextResponse.json({ success: true, sent: details.filter(d => d.status === 'sent').length, details });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
