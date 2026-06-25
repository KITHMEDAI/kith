import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify the user is authenticated
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  // Use service role to fetch — bypasses any RLS edge-cases
  const service = createServiceRoleClient();
  const { data: session, error } = await service
    .from('sessions')
    .select(`
      id, session_number, started_at, ended_at, status,
      soap_note, key_points, session_summary, ai_suggestions,
      homework_assigned, next_session_plan,
      manual_notes, resource_suggestions, therapist_id,
      patient:patients(display_name, diagnosis, date_of_birth)
    `)
    .eq('id', params.id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found', detail: error?.message }, { status: 404 });
  }

  // Security: only the owning therapist can read this session
  if (session.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  const service = createServiceRoleClient();

  // Verify ownership
  const { data: existing } = await service
    .from('sessions').select('therapist_id').eq('id', params.id).single();
  if (!existing || existing.therapist_id !== therapist.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { soap_note, manual_notes } = body;

  // Only update the fields actually provided (SOAP edit from the note page,
  // or the doctor's private-notes autosave during/after a session).
  const updates: Record<string, unknown> = {};
  if (soap_note !== undefined) updates.soap_note = soap_note;
  if (manual_notes !== undefined) updates.manual_notes = manual_notes;
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const { error } = await service.from('sessions').update(updates).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
