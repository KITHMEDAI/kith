import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';
import { rateHit, LIMITS } from '@/lib/workspace/rate';
import { setPasswordOnThisSession } from '@/lib/workspace/auth';

// Sign-up step 2: check the emailed code, set the password chosen by the
// person who holds it, and sign them in on this browser (session cookie).
export async function POST(req: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });

  const body = await req.json().catch(() => ({})) as { email?: string; code?: string; password?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const code = String(body.code ?? '').replace(/\s/g, '');
  const password = String(body.password ?? '');
  if (!email || !/^\d{6,10}$/.test(code)) return NextResponse.json({ error: 'Enter the code from the email' }, { status: 422 });
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Use a password of at least 8 characters' }, { status: 422 });
  }
  if (await rateHit(`ws-verify:${email}`, LIMITS.verifyEmail)) {
    return NextResponse.json({ error: 'Too many tries. Request a new code in a little while.' }, { status: 429 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
  if (error || !data.user) {
    return NextResponse.json({ error: 'That code is wrong or has expired. If you already have an account, sign in instead.' }, { status: 400 });
  }
  return setPasswordOnThisSession(supabase, password);
}
