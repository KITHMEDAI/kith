import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';
import { checkRateLimit } from '@/lib/rate-limit';

// Email + password sign-up with no confirmation email: the account is
// created already confirmed, and the browser then signs in with the same
// password. Keeps sign-up instant (no inbox round-trip).
export async function POST(req: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });

  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 422 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Use a password of at least 8 characters' }, { status: 422 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(`ws-signup:${ip}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a little while.' }, { status: 429 });
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!error) return NextResponse.json({ ok: true });

  if (!/already|registered|exists/i.test(error.message)) {
    return NextResponse.json({ error: 'Could not create the account. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ error: 'An account with this email already exists. Sign in instead.' }, { status: 409 });
}
