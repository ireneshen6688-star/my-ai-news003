export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string };
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    // No auth system — always proceed to subscription
    return NextResponse.json({ needsSignIn: false });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
