import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Same field set/rules as the POST schema (app/api/patients/route.ts), minus
// `source` (create-only metadata) — POST validates every field with Zod,
// but PATCH used to strip only id/therapist_id/created_at and pass
// everything else straight to .update() unvalidated: a direct API call
// could write a gender value that fails the DB CHECK only after a wasted
// round-trip, a malformed email/phone, or any other unvalidated column.
const UpdatePatientSchema = z.object({
  display_name: z.string().min(1).max(120).optional(),
  nickname: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other']).optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp_number: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  diagnosis: z.array(z.string()).optional(),
  therapy_modality: z.string().optional().nullable(),
  session_frequency: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  presenting_concerns: z.string().optional().nullable(),
  therapy_goals: z.array(z.string()).optional(),
  consent_recording: z.boolean().optional(),
  consent_ai_notes: z.boolean().optional(),
  consent_date: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'discharged', 'on_hold']).optional(),
}).strict();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Previously used therapist!.id without checking therapist is non-null —
  // every other patient route explicitly 404s here (e.g. a race mid-onboarding,
  // before the therapists row exists, would otherwise serialize `undefined`
  // into the query and just silently return no rows instead of a clear error).
  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', params.id)
    .eq('therapist_id', therapist.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Strip read-only fields before validating the rest — id/therapist_id/
  // created_at are never client-settable regardless of what the schema allows.
  const { id: _id, therapist_id: _tid, created_at: _ca, ...rest } = body;
  void _id; void _tid; void _ca;

  const parsed = UpdatePatientSchema.safeParse(rest);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { error } = await supabase
    .from('patients')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('therapist_id', therapist.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });

  // Soft delete — mark as discharged
  const { error } = await supabase
    .from('patients')
    .update({ status: 'discharged' })
    .eq('id', params.id)
    .eq('therapist_id', therapist.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
