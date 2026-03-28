import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/check
 *
 * Checks whether an email already has an account (session).
 * In production this would check NextAuth session or DB.
 * Returns { needsSignIn: boolean }.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // TODO: Replace with real session / DB lookup
    // e.g. check NextAuth session cookie, or query users table
    // For now: treat every request as unauthenticated so they go through Google OAuth
    const isRegistered = false; // await db.users.findByEmail(email)

    return NextResponse.json({ needsSignIn: !isRegistered });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
