import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ── GET /api/profile ─────────────────────────────────────────────────────────
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist, error } = await supabase
    .from('therapists')
    .select('id, display_name, designation, license_number, license_council, clinic_name, clinic_address, phone, email, specializations, bio, timezone, avatar_url, created_at, subscription_plan, subscription_status')
    .eq('user_id', user.id)
    .single();

  if (error || !therapist) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Fetch stats in parallel
  const [
    { count: totalSessions },
    { count: totalPatients },
    { data: upcomingAppts },
  ] = await Promise.all([
    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id).eq('status', 'completed'),
    supabase.from('patients').select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id).eq('status', 'active'),
    supabase.from('appointments').select('duration_minutes')
      .eq('therapist_id', therapist.id)
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .lte('scheduled_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()),
  ]);

  const stats = {
    total_sessions:       totalSessions ?? 0,
    total_hours:          Math.round(((totalSessions ?? 0) * 50) / 60),
    total_patients:       totalPatients ?? 0,
    upcoming_this_month:  upcomingAppts?.length ?? 0,
    member_since:         therapist.created_at,
  };

  return NextResponse.json({ profile: therapist, stats });
}

// ── PATCH /api/profile ────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Whitelist editable fields — prevent overwriting sensitive columns
  const allowed = ['display_name','designation','license_number','license_council','clinic_name','clinic_address','phone','email','specializations','bio','timezone','avatar_url','onboarding_completed','booking_source','booking_url','consultation_fee_inr','working_hours','languages_spoken','default_session_duration'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // specializations is a TEXT[] column with no NOT NULL constraint — an
  // unvalidated PATCH could write null or a non-array value, which the
  // client's toggleSpec() then crashes on (calls .includes() on it).
  if ('specializations' in updates) {
    const spec = updates.specializations;
    if (!Array.isArray(spec) || !spec.every(s => typeof s === 'string')) {
      return NextResponse.json({ error: 'specializations must be an array of strings' }, { status: 422 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('therapists')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
