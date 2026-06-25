import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AppointmentReminder from '@/components/notifications/AppointmentReminder';
import type { Therapist } from '@/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const MOCK_THERAPIST: Therapist = {
  id: 'mock-therapist-id',
  user_id: 'mock-user-id',
  display_name: 'Dr. Priya Sharma',
  designation: 'Clinical Psychologist',
  license_number: 'RCI/2021/04523',
  license_council: 'Rehabilitation Council of India',
  clinic_name: 'MindBridge Wellness',
  phone: '+91 98765 43210',
  email: 'priya@mindbridge.in',
  specializations: ['CBT', 'Trauma-focused', 'Anxiety', 'Depression'],
  bio: '',
  timezone: 'Asia/Kolkata',
  subscription_plan: 'pro',
  subscription_status: 'active',
  trial_ends_at: null,
  google_calendar_vault_secret_id: null,
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
} as unknown as Therapist;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let therapist: Therapist | null = MOCK_THERAPIST;

  // x-pathname is injected by the middleware (lib/supabase/middleware.ts) on every request
  // so layouts can detect the active route and avoid redirect loops.
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const isOnboardingPath = pathname === '/onboarding' || pathname.startsWith('/onboarding/');

  if (!USE_MOCK) {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('therapists').select('*').eq('user_id', user.id).single();
      therapist = data as Therapist | null;
    } else {
      therapist = null;
    }

    // Redirect new users through onboarding before they can access the dashboard
    if (
      therapist &&
      !isOnboardingPath &&
      (therapist as unknown as Record<string, unknown>).onboarding_completed === false
    ) {
      redirect('/onboarding');
    }
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar therapist={therapist} />
      <div className="flex-1 pl-[22rem] flex flex-col min-h-screen">
        <Topbar therapist={therapist} />
        <main className="flex-1">{children}</main>
      </div>
      {!isOnboardingPath && <AppointmentReminder />}
    </div>
  );
}
