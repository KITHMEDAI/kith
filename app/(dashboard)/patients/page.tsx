import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import PatientListClient from '@/components/patients/PatientListClient';
import type { Patient } from '@/types';

export default async function PatientsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) redirect('/register');

  const service = createServiceRoleClient();
  const { data: patients } = await service
    .from('patients')
    .select('id,display_name,nickname,date_of_birth,gender,phone,email,diagnosis,therapy_modality,status,risk_level,session_count,last_session_at,consent_recording,consent_ai_notes,therapist_id,created_at')
    .eq('therapist_id', therapist.id)
    .order('display_name');

  return <PatientListClient patients={(patients as unknown as Patient[]) || []} />;
}
