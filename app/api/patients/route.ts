import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreatePatientSchema = z.object({
  display_name: z.string().min(1).max(120),
  nickname: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  gender: z.string().optional().nullable(),
  pronouns: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp_number: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  diagnosis: z.array(z.string()).default([]),
  therapy_modality: z.string().optional().nullable(),
  session_frequency: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  presenting_concerns: z.string().optional().nullable(),
  therapy_goals: z.array(z.string()).default([]),
  consent_recording: z.boolean().default(false),
  consent_ai_notes: z.boolean().default(false),
  consent_date: z.string().optional().nullable(),
  source: z.enum(['manual', 'import']).default('manual'),
});

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreatePatientSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // Strip only fields that aren't real `patients` columns:
  //   - `source` is request metadata (manual vs import)
  //   - `pronouns` has no column in the schema
  // Everything else (emergency contact, modality, frequency, medications,
  // therapy goals, consent_date, …) maps to a real column and must persist —
  // previously these were all dropped, silently losing the doctor's input.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source: _source, pronouns: _pronouns, ...insertData } = parsed.data;

  const { data, error } = await supabase
    .from('patients')
    .insert({
      therapist_id: therapist.id,
      ...insertData,
      risk_level: 'low',
      status: 'active',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patient: { id: data.id } }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const risk = url.searchParams.get('risk');
  const status = url.searchParams.get('status') || 'active';

  let query = supabase
    .from('patients')
    .select('id, display_name, date_of_birth, gender, phone, email, diagnosis, risk_level, status, therapy_modality, created_at')
    .eq('therapist_id', therapist.id)
    .eq('status', status)
    .order('display_name');

  if (risk) query = query.eq('risk_level', risk);
  if (q) query = query.ilike('display_name', `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
