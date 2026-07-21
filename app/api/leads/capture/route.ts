/**
 * POST /api/leads/capture
 *
 * Opt-in lead capture for the marketing outreach agent — someone requests a
 * lead magnet (e.g. the SOAP note template pack), gets it delivered by
 * email immediately, and is added to the nurture sequence
 * (see /api/cron/send-nurture-emails). Every subsequent email includes an
 * unsubscribe link (/api/leads/unsubscribe) honored instantly.
 *
 * Unauthenticated by design (same as /api/waitlist) — rate-limited by IP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendNotification } from '@/lib/notify';
import { LEAD_MAGNETS } from '@/lib/lead-magnets';
import { unsubscribeFooter } from '@/lib/nurture';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rl = checkRateLimit(`leads:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const { email, source, region } = await req.json().catch(() => ({}));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 422 });
  }

  const magnet = LEAD_MAGNETS[source];
  if (!magnet) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 422 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createServiceRoleClient();

  // nurture_next_at is set 3 days out — the immediate magnet email below
  // covers "now"; the cron-driven sequence (lib/nurture.ts) picks up from
  // there. ignoreDuplicates so re-requesting a magnet never resets an
  // existing subscriber's nurture progress.
  const nurtureStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { error: upsertError } = await supabase.from('leads').upsert(
    { email: normalizedEmail, source, region: typeof region === 'string' ? region : null, nurture_next_at: nurtureStart },
    { onConflict: 'email', ignoreDuplicates: true },
  );
  if (upsertError) {
    // Table may not exist yet if migration 014 hasn't been run — still
    // deliver the magnet so the visitor isn't blocked by our own DB lag.
    console.warn('[leads/capture] upsert failed (migration 014 run yet?):', upsertError.message);
  }

  // Fetch the row's id regardless of insert-vs-duplicate path, so the
  // unsubscribe link always works — degrades gracefully if the table isn't
  // there yet or the select fails for any reason.
  const { data: lead } = await supabase.from('leads').select('id').eq('email', normalizedEmail).maybeSingle();
  const footer = lead?.id ? unsubscribeFooter(lead.id) : '';

  await sendNotification({
    to: { email: normalizedEmail },
    subject: magnet.subject,
    message: magnet.body + footer,
    channels: ['email'],
  }).catch(err => console.error('[leads/capture] delivery email failed:', err));

  return NextResponse.json({ ok: true });
}
