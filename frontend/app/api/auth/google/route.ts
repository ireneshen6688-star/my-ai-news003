/**
 * app/api/auth/google/route.ts
 * Step 1: Redirect user to Google OAuth consent screen
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { generateState, generateCodeVerifier } from 'arctic';
import { getGoogleClient } from '@/lib/auth';

// Detect whether we're running over HTTPS
function isSecure(req: NextRequest): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto === 'https';
  return req.url.startsWith('https://');
}

export async function GET(req: NextRequest) {
  const google = getGoogleClient();
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'profile',
    'email',
  ]);

  const secure = isSecure(req);
  const response = NextResponse.redirect(url.toString());

  // NOTE: secure=false when running over plain HTTP (e.g. dev on IP:port)
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set('google_code_verifier', codeVerifier, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
