import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import AppointmentsClient from '@/components/appointments/AppointmentsClient';
import type { Appointment, Patient } from '@/types';

export default async function AppointmentsPage({ searchParams }: { searchParams: { book?: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: therapist } = await supabase
    .from('therapists').select('id, email').eq('user_id', user.id).single();
  if (!therapist) redirect('/register');

  const service = createServiceRoleClient();

  // Fetch appointments: 30 days back through 90 days forward — covers all realistic views
  const from = new Date(Date.now() - 30 * 86400000).toISOString();
  const to   = new Date(Date.now() + 90 * 86400000).toISOString();

  const [{ data: appointments }, { data: patients }] = await Promise.all([
    service
      .from('appointments')
      .select('*, patient:patients(id, display_name, diagnosis, therapy_modality)')
      .eq('therapist_id', therapist.id)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)
      .order('scheduled_at'),
    service
      .from('patients')
      .select('id, display_name, phone, whatsapp_number, email, diagnosis')
      .eq('therapist_id', therapist.id)
      .eq('status', 'active')
      .order('display_name'),
  ]);

  return (
    <AppointmentsClient
      appointments={(appointments as Appointment[]) || []}
      patients={(patients as Patient[]) || []}
      therapistId={therapist.id}
      preselectedPatientId={searchParams.book}
    />
  );
}
