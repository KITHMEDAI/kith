import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getEntitlements, upgradeMessage } from '@/lib/entitlements';
import { toPlainEnglish } from '@/lib/claude';
import { checkRateLimit } from '@/lib/rate-limit';

// POST /api/notes/plain-english — rewrites a clinical note fragment (homework,
// an AI suggestion) as a short plain-English message, for the therapist to
// review/edit before sending to a patient. Never sends anything itself.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, subscription_plan, subscription_status, trial_ends_at, cancel_at')
    .eq('user_id', user.id)
    .single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  if (!getEntitlements(therapist).patientMessaging) {
    return NextResponse.json({ error: upgradeMessage('patient messaging'), code: 'PLAN_LOCKED' }, { status: 402 });
  }

  const rl = checkRateLimit(`plain-english:${therapist.id}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const { text, patientFirstName } = await req.json().catch(() => ({}));
  if (!text?.trim()) return NextResponse.json({ error: 'Missing text' }, { status: 422 });
  if (text.length > 2000) return NextResponse.json({ error: 'Text too long' }, { status: 422 });

  try {
    const plain = await toPlainEnglish(text.trim(), patientFirstName);
    return NextResponse.json({ plain });
  } catch (err) {
    console.error('[plain-english]', err);
    return NextResponse.json({ error: 'Could not rewrite this text — try again.' }, { status: 500 });
  }
}
