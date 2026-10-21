import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';
import { checkRateLimit } from '@/lib/rate-limit';

// Sends the sign-in email ourselves (Resend) instead of through Supabase's
// mailer, which only delivers to project team members unless custom SMTP is
// configured. The link carries a one-time token hash verified by
// /api/w/auth/confirm (Supabase's recommended server-side pattern).
export async function POST(req: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });

  const { email: raw } = await req.json().catch(() => ({})) as { email?: string };
  const email = String(raw ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 422 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const byIp = checkRateLimit(`ws-magic-ip:${ip}`, 10, 60 * 60 * 1000);
  const byEmail = checkRateLimit(`ws-magic-email:${email}`, 5, 60 * 60 * 1000);
  if (!byIp.allowed || !byEmail.allowed) {
    return NextResponse.json({ error: 'Too many sign-in emails. Try again in a little while.' }, { status: 429 });
  }

  const admin = createServiceRoleClient();
  // Create the account on first sign-in (no-op if it already exists).
  await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => null);
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return NextResponse.json({ error: 'Could not create a sign-in link. Try again.' }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const link = `${origin}/api/w/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: mailError } = await resend.emails.send({
    from: `Kith <${process.env.RESEND_FROM_EMAIL || 'noreply@kith.space'}>`,
    to: email,
    subject: 'Your Kith sign-in link',
    text: `Sign in to Kith Workspace:\n\n${link}\n\nThis link works once and expires in 1 hour. If you didn't ask for it, ignore this email.`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#0f172a">
      <p style="font-size:20px;font-weight:700;margin:0 0 24px">Kith</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 24px">Tap the button to sign in to Kith Workspace.</p>
      <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Sign in to Kith</a>
      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:24px 0 0">This link works once and expires in 1 hour. If you didn't ask for it, you can ignore this email.</p>
    </div>`,
  });
  if (mailError) return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 502 });

  return NextResponse.json({ ok: true });
}
