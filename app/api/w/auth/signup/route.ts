import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';
import { rateHit, clientIp, LIMITS } from '@/lib/workspace/rate';
import { verifyCaptcha } from '@/lib/workspace/captcha';
import { sendMail, codeEmail, wrapEmail } from '@/lib/workspace/mail';

// Email + password sign-up, step 1: email a one-time code that proves the
// person owns the address. The account stays unconfirmed (and can't sign in)
// until /api/w/auth/verify checks the code — that is also where the password
// is set, so nobody can pre-register someone else's email with a password
// they know. The response is the same whether or not the email already has
// an account (no account enumeration); existing users get a "sign in" email.
const SENT = { ok: true, message: 'Check your email for a code.' };

export async function POST(req: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });

  const body = await req.json().catch(() => ({})) as { email?: string; captcha?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 422 });
  }

  const ip = clientIp(req);
  const [byIp, byEmail] = await Promise.all([
    rateHit(`ws-signup-ip:${ip}`, LIMITS.signupIp),
    rateHit(`ws-signup-email:${email}`, LIMITS.signupEmail),
  ]);
  if (byIp || byEmail) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a little while.' }, { status: 429 });
  }
  if (!(await verifyCaptcha(body.captcha, ip))) {
    return NextResponse.json({ error: 'Please complete the security check and try again.' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  // Placeholder password nobody knows; the real one is set after verification.
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup', email, password: randomBytes(32).toString('base64url'),
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const code = data?.properties?.email_otp;
  if (error && !/already|registered|exists/i.test(error.message)) {
    return NextResponse.json({ error: 'Could not create the account. Try again.' }, { status: 500 });
  }

  const sent = await sendMail(email, code ? codeEmail(code, 'finish creating your Kith Workspace account') : existingEmail(origin));
  if (!sent) return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 502 });
  return NextResponse.json(SENT);
}

function existingEmail(origin: string) {
  return {
    subject: 'You already have a Kith account',
    text: `Someone (hopefully you) tried to create a Kith Workspace account with this email, but you already have one.\n\nSign in here: ${origin}/login\n\nForgot your password? Choose "Forgot password?" on the sign-in page. If you signed up with Google, use "Continue with Google". If this wasn't you, ignore this email: your account is unchanged.`,
    html: wrapEmail(`<p style="font-size:15px;line-height:1.5;margin:0 0 24px">Someone (hopefully you) tried to create a Kith Workspace account with this email, but you already have one.</p>
      <a href="${origin}/login" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Sign in to Kith</a>
      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:24px 0 0">Forgot your password? Choose "Forgot password?" on the sign-in page. If you signed up with Google, use "Continue with Google". If this wasn't you, ignore this email: your account is unchanged.</p>`),
  };
}
