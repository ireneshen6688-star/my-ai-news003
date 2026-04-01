/**
 * app/api/auth/check/route.ts
 * Checks whether the current user is logged in.
 * Used by the subscription form before submitting.
 *
 * Returns:
 *   { loggedIn: true,  user: { id, email, name } }  — if session valid
 *   { loggedIn: false }                              — if not logged in
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { parseSessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ loggedIn: false });
  }

  const session = await parseSessionToken(sessionToken);
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }

  return NextResponse.json({ loggedIn: true, userId: session.userId });
}

// Keep POST for backwards compatibility with existing form code
export async function POST(req: NextRequest) {
  return GET(req);
}
