import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', params.id)
    .eq('therapist_id', therapist!.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  const body = await req.json().catch(() => ({}));

  // Strip read-only fields
  const { id: _id, therapist_id: _tid, created_at: _ca, ...updates } = body;
  void _id; void _tid; void _ca;

  const { error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', params.id)
    .eq('therapist_id', therapist!.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase.from('therapists').select('id').eq('user_id', user.id).single();
  // Soft delete — mark as discharged
  const { error } = await supabase
    .from('patients')
    .update({ status: 'discharged' })
    .eq('id', params.id)
    .eq('therapist_id', therapist!.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
