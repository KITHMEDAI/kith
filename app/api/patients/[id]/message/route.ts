import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEntitlements, upgradeMessage } from '@/lib/entitlements';
import { sendNotification } from '@/lib/notify';
import { checkRateLimit } from '@/lib/rate-limit';

// POST /api/patients/[id]/message — manual WhatsApp/SMS send to a patient.
// Ultra/Clinic only (entitlements.patientMessaging) — this is the real
// feature behind the "WhatsApp & SMS to patients" line on the pricing page.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, subscription_plan, subscription_status, trial_ends_at')
    .eq('user_id', user.id)
    .single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  if (!getEntitlements(therapist).patientMessaging) {
    return NextResponse.json({ error: upgradeMessage('patient messaging'), code: 'PLAN_LOCKED' }, { status: 402 });
  }

  // Max 20 manual patient messages per therapist per hour — protects against a
  // compromised/malicious account spamming a patient or burning through the
  // shared Twilio number's reputation.
  const rl = checkRateLimit(`patient-message:${therapist.id}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many messages sent — try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const channel: 'whatsapp' | 'sms' = body.channel;
  const message: string | undefined = body.message;
  if ((channel !== 'whatsapp' && channel !== 'sms') || !message?.trim()) {
    return NextResponse.json({ error: 'Missing or invalid channel/message' }, { status: 422 });
  }

  const service = createServiceRoleClient();
  const { data: patient } = await service
    .from('patients').select('id, phone, whatsapp_number, therapist_id').eq('id', params.id).single();
  if (!patient || patient.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results = await sendNotification({
    to: {
      phone: channel === 'sms' ? patient.phone || undefined : undefined,
      whatsapp: channel === 'whatsapp' ? (patient.whatsapp_number || patient.phone || undefined) : undefined,
    },
    subject: 'Message from your therapist',
    message: message.trim(),
    channels: [channel],
  });

  if (!results[channel]) {
    return NextResponse.json({ error: 'Message failed to send — Twilio may not be configured yet. Contact support.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
