/**
 * app/api/auth/callback/google/route.ts
 * Step 2: Handle Google OAuth callback, create session cookie
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import {
  getGoogleClient,
  getGoogleUser,
  makeSessionToken,
  upsertUser,
} from '@/lib/auth';

function isSecure(req: NextRequest): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto === 'https';
  return req.url.startsWith('https://');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const storedState = req.cookies.get('google_oauth_state')?.value;
  const codeVerifier = req.cookies.get('google_code_verifier')?.value;

  // Validate state + verifier
  if (!code || !state || !storedState || !codeVerifier) {
    console.error('[OAuth] Missing params:', { code: !!code, state: !!state, storedState: !!storedState, codeVerifier: !!codeVerifier });
    return NextResponse.redirect(new URL('/login?error=oauth_missing_params', req.url));
  }

  if (state !== storedState) {
    console.error('[OAuth] State mismatch:', { state, storedState });
    return NextResponse.redirect(new URL('/login?error=oauth_state_mismatch', req.url));
  }

  try {
    // Exchange code for tokens
    const google = getGoogleClient();
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch Google user info
    const googleUser = await getGoogleUser(accessToken);

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', req.url));
    }

    // Upsert user in D1 (inline — no self-fetch needed)
    const { env } = getRequestContext();
    const db = (env as unknown as { DB: D1Database }).DB;

    const userId = await upsertUser({
      db,
      provider: 'google',
      providerId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
    });

    // Create signed session token
    const sessionToken = await makeSessionToken(userId);

    const secure = isSecure(req);
    const response = NextResponse.redirect(new URL('/', req.url));

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Clear OAuth cookies
    response.cookies.delete('google_oauth_state');
    response.cookies.delete('google_code_verifier');

    return response;
  } catch (e) {
    console.error('[OAuth] Callback error:', e);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url));
  }
}
