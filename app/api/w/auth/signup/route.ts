import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';
import { rateHit, clientIp, LIMITS } from '@/lib/workspace/rate';

// Email + password sign-up, step 1: email a one-time code that proves the
// person owns the address. The account stays unconfirmed (and can't sign in)
// until /api/w/auth/verify checks the code — that is also where the password
// is set, so nobody can pre-register someone else's email with a password
// they know. The response is the same whether or not the email already has
// an account (no account enumeration); existing users get a "sign in" email.
const SENT = { ok: true, message: 'Check your email for a code.' };

export async function POST(req: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });

  const body = await req.json().catch(() => ({})) as { email?: string };
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

  const mail = code ? codeEmail(code) : existingEmail(origin);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: mailError } = await resend.emails.send({
    from: `Kith <${process.env.RESEND_FROM_EMAIL || 'noreply@kith.space'}>`,
    to: email,
    ...mail,
  });
  if (mailError) return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 502 });
  return NextResponse.json(SENT);
}

const wrap = (inner: string) => `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#0f172a">
  <p style="font-size:20px;font-weight:700;margin:0 0 24px">Kith</p>${inner}</div>`;

function codeEmail(code: string) {
  return {
    subject: `${code} is your Kith code`,
    text: `Your Kith Workspace code is ${code}\n\nEnter it to finish creating your account. It expires in 1 hour. If you didn't ask for it, ignore this email.`,
    html: wrap(`<p style="font-size:15px;line-height:1.5;margin:0 0 16px">Enter this code to finish creating your Kith Workspace account:</p>
      <p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:0 0 24px">${code}</p>
      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0">It expires in 1 hour. If you didn't ask for it, you can ignore this email.</p>`),
  };
}

function existingEmail(origin: string) {
  return {
    subject: 'You already have a Kith account',
    text: `Someone (hopefully you) tried to create a Kith Workspace account with this email, but you already have one.\n\nSign in here: ${origin}/login\n\nIf you signed up with Google, use "Continue with Google". If this wasn't you, ignore this email: your account is unchanged.`,
    html: wrap(`<p style="font-size:15px;line-height:1.5;margin:0 0 24px">Someone (hopefully you) tried to create a Kith Workspace account with this email, but you already have one.</p>
      <a href="${origin}/login" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Sign in to Kith</a>
      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:24px 0 0">If you signed up with Google, use "Continue with Google". If this wasn't you, ignore this email: your account is unchanged.</p>`),
  };
}
