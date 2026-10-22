import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';
import { rateHit, clientIp, LIMITS } from '@/lib/workspace/rate';
import { verifyCaptcha } from '@/lib/workspace/captcha';
import { sendMail, codeEmail } from '@/lib/workspace/mail';
import { setPasswordOnThisSession } from '@/lib/workspace/auth';

// Password reset, the same shape as sign-up:
//   step 1 { email, captcha }           → email a one-time code (if the account exists)
//   step 2 { email, code, password }    → check the code, set the new password,
//                                         sign in here and sign out every other device.
// Step 1 answers identically whether or not the email has an account.
const SENT = { ok: true, message: 'If that email has an account, we sent it a code.' };

export async function POST(req: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });
  const body = await req.json().catch(() => ({})) as { email?: string; captcha?: string; code?: string; password?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 422 });
  }
  return body.code === undefined ? sendCode(req, email, body.captcha) : confirm(email, body.code, body.password);
}

async function sendCode(req: Request, email: string, captcha: unknown) {
  const ip = clientIp(req);
  const [byIp, byEmail] = await Promise.all([
    rateHit(`ws-reset-ip:${ip}`, LIMITS.signupIp),
    rateHit(`ws-reset-email:${email}`, LIMITS.resetEmail),
  ]);
  if (byIp || byEmail) return NextResponse.json({ error: 'Too many attempts. Try again in a little while.' }, { status: 429 });
  if (!(await verifyCaptcha(captcha, ip))) {
    return NextResponse.json({ error: 'Please complete the security check and try again.' }, { status: 400 });
  }
  const { data, error } = await createServiceRoleClient().auth.admin.generateLink({ type: 'recovery', email });
  const code = data?.properties?.email_otp;
  if (error || !code) return NextResponse.json(SENT); // no such account: same answer, no email
  if (!(await sendMail(email, codeEmail(code, 'reset your Kith Workspace password')))) {
    return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 502 });
  }
  return NextResponse.json(SENT);
}

async function confirm(email: string, rawCode: unknown, rawPassword: unknown) {
  const code = String(rawCode ?? '').replace(/\s/g, '');
  const password = String(rawPassword ?? '');
  if (!/^\d{6,10}$/.test(code)) return NextResponse.json({ error: 'Enter the code from the email' }, { status: 422 });
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Use a password of at least 8 characters' }, { status: 422 });
  }
  if (await rateHit(`ws-reset-verify:${email}`, LIMITS.verifyEmail)) {
    return NextResponse.json({ error: 'Too many tries. Request a new code in a little while.' }, { status: 429 });
  }
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error || !data.user) return NextResponse.json({ error: 'That code is wrong or has expired.' }, { status: 400 });
  // Keeps this browser signed in; whoever had the old password is signed out everywhere else.
  return setPasswordOnThisSession(supabase, password);
}
