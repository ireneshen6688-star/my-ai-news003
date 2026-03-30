export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { Google } from 'arctic';
import { getGoogleUser, makeSessionToken } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://myainews.club/api/auth/callback/google';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const storedState = req.cookies.get('google_oauth_state')?.value;
  const codeVerifier = req.cookies.get('google_code_verifier')?.value;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url));
  }

  try {
    const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const googleUser = await getGoogleUser(accessToken);

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', req.url));
    }

    const origin = new URL(req.url).origin;
    const upsertRes = await fetch(`${origin}/api/auth/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        providerId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
      }),
    });

    if (!upsertRes.ok) {
      return NextResponse.redirect(new URL('/login?error=db_error', req.url));
    }

    const { userId } = await upsertRes.json() as { userId: string };
    const sessionToken = makeSessionToken(userId);

    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    response.cookies.delete('google_oauth_state');
    response.cookies.delete('google_code_verifier');

    return response;
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url));
  }
}
