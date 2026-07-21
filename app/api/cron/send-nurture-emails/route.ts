/**
 * GET /api/cron/send-nurture-emails
 *
 * Runs the opt-in nurture sequence (lib/nurture.ts) for leads captured via
 * /api/leads/capture. Only ever touches leads with unsubscribed_at IS NULL
 * and a due nurture_next_at — never sends to someone who's opted out, and
 * every email carries an unsubscribe link.
 *
 * Protected by CRON_SECRET — fails closed if unset (see the cron routes
 * this pattern was fixed on earlier: keepalive, retry-stuck-sessions).
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';
import { NURTURE_SEQUENCE, unsubscribeFooter } from '@/lib/nurture';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 50;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const { data: due, error } = await service
    .from('leads')
    .select('id, email, nurture_step')
    .is('unsubscribed_at', null)
    .not('nurture_next_at', 'is', null)
    .lte('nurture_next_at', new Date().toISOString())
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('[Kith] send-nurture-emails query failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0, completed = 0, skipped = 0;

  for (const lead of due ?? []) {
    const step = NURTURE_SEQUENCE[lead.nurture_step];
    if (!step) {
      // Sequence already exhausted (shouldn't normally happen since we null
      // out nurture_next_at at the end) — clear it so this row stops
      // showing up as "due" and skip.
      await service.from('leads').update({ nurture_next_at: null }).eq('id', lead.id);
      skipped++;
      continue;
    }

    const result = await sendNotification({
      to: { email: lead.email },
      subject: step.subject,
      message: step.body + unsubscribeFooter(lead.id),
      channels: ['email'],
    }).catch(err => {
      console.error(`[Kith] send-nurture-emails: lead ${lead.id} send failed:`, err);
      return null;
    });

    if (!result?.email) { skipped++; continue; }

    const nextStep = lead.nurture_step + 1;
    const nextAt = step.nextDelayDays != null
      ? new Date(Date.now() + step.nextDelayDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await service.from('leads').update({ nurture_step: nextStep, nurture_next_at: nextAt }).eq('id', lead.id);
    sent++;
    if (nextAt === null) completed++;
  }

  return NextResponse.json({ ok: true, checked: due?.length ?? 0, sent, completed, skipped });
}
