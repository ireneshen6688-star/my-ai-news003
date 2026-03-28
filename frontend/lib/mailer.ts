import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

export async function sendConfirmEmail({
  to,
  confirmUrl,
}: {
  to: string;
  confirmUrl: string;
}) {
  return resend.emails.send({
    from: `My AI News <${FROM}>`,
    to,
    subject: 'Confirm your My AI News subscription',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:sans-serif;background:#f5f7fa;margin:0;padding:32px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <div style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">📰 My AI News</div>
          <h2 style="color:#1a1a1a;margin-bottom:12px;">Confirm your subscription</h2>
          <p style="color:#555;line-height:1.6;">You're one click away from receiving your personalized AI news digest. Click the button below to confirm.</p>
          <a href="${confirmUrl}"
             style="display:inline-block;margin:24px 0;background:#4A90E2;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
            ✅ Confirm Subscription
          </a>
          <p style="color:#999;font-size:13px;">Or copy this link: <a href="${confirmUrl}" style="color:#4A90E2;">${confirmUrl}</a></p>
          <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;"/>
          <p style="color:#bbb;font-size:12px;font-style:italic;">Hope something good finds you today ✨</p>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendDigestEmail({
  to,
  html,
  keywords,
}: {
  to: string;
  html: string;
  keywords: string;
}) {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return resend.emails.send({
    from: `My AI News <${FROM}>`,
    to,
    subject: `📰 Your AI News Digest — ${keywords} (${date})`,
    html,
  });
}
