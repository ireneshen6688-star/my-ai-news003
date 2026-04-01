/**
 * app/api/auth/logout/route.ts
 * Clear session cookie and redirect to login
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url));
  response.cookies.delete('session');
  return response;
}

// Support GET logout links (e.g. from email footers)
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url));
  response.cookies.delete('session');
  return response;
}
