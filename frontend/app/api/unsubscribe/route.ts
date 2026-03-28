export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new NextResponse(html('❌ Invalid link', 'No token provided.', '#e53e3e'), { status: 400, headers: { 'Content-Type': 'text/html' } });

  const { env } = getRequestContext();
  const db: D1Database = (env as unknown as { DB: D1Database }).DB;

  const sub = await db.prepare('SELECT * FROM subscriptions WHERE unsubscribe_token = ?').bind(token).first();
  if (!sub) return new NextResponse(html('❌ Not found', 'This unsubscribe link is invalid or already used.', '#e53e3e'), { status: 404, headers: { 'Content-Type': 'text/html' } });

  await db.prepare('DELETE FROM subscriptions WHERE unsubscribe_token = ?').bind(token).run();

  return new NextResponse(html('✅ Unsubscribed', "You've been removed. Sorry to see you go!", '#718096'), { headers: { 'Content-Type': 'text/html' } });
}

function html(title: string, body: string, color: string) {
  const icon = title.split(' ')[0];
  const text = title.replace(/^\S+\s/, '');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${text}</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f7fa;">
  <div style="text-align:center;background:#fff;padding:48px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
    <h2 style="color:${color};margin-bottom:8px;">${text}</h2>
    <p style="color:#666;">${body}</p>
    <a href="/" style="display:inline-block;margin-top:24px;color:#4A90E2;text-decoration:none;font-size:14px;">← Back to My AI News</a>
  </div>
</body></html>`;
}
