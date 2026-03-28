import { NewsArticle } from './mockNews';

export function generateEmailHtml({
  keywords,
  articles,
  unsubscribeToken,
  baseUrl = 'http://localhost:3000',
}: {
  keywords: string;
  articles: NewsArticle[];
  unsubscribeToken: string;
  baseUrl?: string;
}): string {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const articleRows = articles.map((a, i) => `
    <div style="margin-bottom:28px; padding-bottom:28px; ${i < articles.length - 1 ? 'border-bottom:1px solid #f0f0f0;' : ''}">
      <div style="font-size:11px; color:#999; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">
        ${a.source} &nbsp;·&nbsp; ${new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        &nbsp;·&nbsp; ${a.language === 'zh' ? '中文' : 'EN'}
      </div>
      <div style="font-size:17px; font-weight:600; color:#1a1a1a; margin-bottom:8px; line-height:1.4;">
        ${a.title}
      </div>
      <div style="font-size:14px; color:#555; line-height:1.7; margin-bottom:10px;">
        ${a.summary}
      </div>
      <a href="${a.url}" style="display:inline-block; font-size:13px; color:#4A90E2; font-weight:500; text-decoration:none;">
        Read more →
      </a>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>My AI News Digest</title>
</head>
<body style="margin:0; padding:0; background:#f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width:620px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">

    <!-- Header -->
    <div style="background:#4A90E2; padding:28px 32px;">
      <div style="font-size:22px; font-weight:700; color:#fff; margin-bottom:4px;">
        📰 My AI News
      </div>
      <div style="font-size:14px; color:rgba(255,255,255,0.85);">
        Your digest for: <strong>${keywords}</strong>
      </div>
      <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:4px;">${date}</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <div style="font-size:13px; color:#888; margin-bottom:24px;">
        Here are today's top ${articles.length} articles, curated by AI with verified source links.
      </div>

      ${articleRows}
    </div>

    <!-- Footer -->
    <div style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #f0f0f0; text-align:center;">
      <div style="font-size:13px; color:#999; font-style:italic; margin-bottom:12px;">
        Hope something good finds you today ✨
      </div>
      <div style="font-size:12px; color:#bbb;">
        You're receiving this because you subscribed to <strong>My AI News</strong>.<br/>
        <a href="${baseUrl}/api/unsubscribe?token=${unsubscribeToken}"
           style="color:#bbb; text-decoration:underline;">
          Unsubscribe
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
