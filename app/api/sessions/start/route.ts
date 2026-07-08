import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getRealtimeToken } from '@/lib/deepgram';
import { getEntitlements } from '@/lib/entitlements';
import { NextResponse } from 'next/server';

// ── In-memory rate limiter ──────────────────────────────────────────────────
// Maps therapistId → { count, windowStart }
// Allows max 5 token requests per therapist per 60-minute window.
// For multi-instance deployments, replace with Redis/Upstash.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(therapistId: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(therapistId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(therapistId, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { appointmentId, patientId } = body;

    const { data: therapist } = await supabase
      .from('therapists')
      .select('id, subscription_plan, subscription_status, trial_ends_at')
      .eq('user_id', user.id)
      .single();
    if (!therapist) return NextResponse.json({ error: 'No therapist profile found' }, { status: 404 });

    // ── Rate limit: max 5 new session tokens per hour ───────────────────────
    const { allowed, retryAfterSec } = checkRateLimit(therapist.id);
    if (!allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSec) },
        }
      );
    }

    // ── Effective plan for THIS request ─────────────────────────────────────
    // Never a hard lockout — a doctor with an expired trial, a cancelled
    // subscription, or a failed renewal just falls back to Free-tier limits,
    // so patient care is never interrupted by a billing problem.
    const { plan: effectivePlan, sessionCap: cap } = getEntitlements(therapist);

    // ── Monthly session cap ───────────────────────────────────────────────
    if (cap !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('therapist_id', therapist.id)
        .gte('started_at', startOfMonth.toISOString());

      if ((count ?? 0) >= cap) {
        // Pro raises the cap to 60/month but is still capped — only Ultra is
        // truly unlimited, so the upgrade suggestion must match reality.
        const upgradeHint = effectivePlan === 'free'
          ? 'Upgrade to Pro for 60 sessions/month, or Ultra for unlimited.'
          : 'Upgrade to Ultra for unlimited sessions.';
        return NextResponse.json(
          {
            error: `Monthly session limit reached (${cap} sessions on your ${effectivePlan} plan). ${upgradeHint}`,
          },
          { status: 402 }
        );
      }
    }

    // ── Patient consent check (soft — warn in logs, don't block) ──────────────
    // Therapist is responsible for confirming verbal or written consent before
    // clicking Start. Hard-blocking here creates a UX deadlock in cases where
    // the consent flag wasn't set during registration.
    if (patientId) {
      const { data: patient } = await supabase
        .from('patients')
        .select('consent_recording, display_name')
        .eq('id', patientId)
        .single();

      if (!patient?.consent_recording) {
        console.warn(`[Kith] Session started without recorded consent for patient ${patientId}. Therapist must have verbal consent.`);
      }
    }

    // ── Create session record ───────────────────────────────────────────────
    // Service-role insert: `sessions` RLS only grants SELECT to authenticated
    // users (009_lock_down_sessions_table.sql) — otherwise a doctor could
    // insert session rows directly via the client SDK, bypassing the cap
    // check above entirely.
    const service = createServiceRoleClient();
    const { data: session, error: sessionError } = await service
      .from('sessions')
      .insert({
        therapist_id: therapist.id,
        patient_id: patientId,
        appointment_id: appointmentId || null,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // ── Update appointment to in_session ────────────────────────────────────
    if (appointmentId) {
      await service
        .from('appointments')
        .update({ status: 'in_session', session_id: session.id })
        .eq('id', appointmentId);
    }

    // ── Get Deepgram real-time token (expires in 1 hour) ──────────────────
    const token = await getRealtimeToken();

    return NextResponse.json({ session, token });
  } catch (error) {
    console.error('[Kith] /api/sessions/start error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}
