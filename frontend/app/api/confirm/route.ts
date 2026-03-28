import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse('<h2>Invalid link.</h2>', { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  const db = getDb();
  const sub = db.prepare('SELECT * FROM subscriptions WHERE confirm_token = ?').get(token);

  if (!sub) {
    return new NextResponse(html('❌ Link not found', 'This confirmation link is invalid or has already been used.', '#e53e3e'), {
      status: 404, headers: { 'Content-Type': 'text/html' },
    });
  }

  db.prepare('UPDATE subscriptions SET confirmed = 1, confirm_token = NULL WHERE confirm_token = ?').run(token);

  return new NextResponse(html('✅ Subscription confirmed!', "You're all set. Your first digest will arrive soon.", '#38a169'), {
    headers: { 'Content-Type': 'text/html' },
  });
}

function html(title: string, body: string, color: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title}</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f7fa;">
  <div style="text-align:center;background:#fff;padding:48px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">${title.split(' ')[0]}</div>
    <h2 style="color:${color};margin-bottom:8px;">${title.replace(/^\S+\s/, '')}</h2>
    <p style="color:#666;">${body}</p>
    <a href="/" style="display:inline-block;margin-top:24px;color:#4A90E2;text-decoration:none;font-size:14px;">← Back to My AI News</a>
  </div>
</body></html>`;
}
