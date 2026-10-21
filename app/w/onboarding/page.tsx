import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/workspace/server';
import ProfileForm from '@/components/workspace/ProfileForm';
import KithLockup from '@/components/brand/KithLockup';

export const metadata = { title: 'Welcome' };

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (await getProfile(user.id)) redirect('/');

  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <KithLockup markSize={30} className="text-[22px] text-slate-900" gradientId="ws-onb-grad" />
          <h1 className="mt-4 text-xl font-semibold">Welcome. Let&apos;s set you up</h1>
          <p className="mt-1 text-sm text-slate-500">30 seconds. Your field shapes how every note is written.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ProfileForm
            mode="onboarding"
            initial={{
              name: meta.full_name || meta.name || '',
              email: user.email ?? '',
              phone: '',
              field: 'general',
              field_custom: '',
              note_preferences: '',
            }}
          />
        </div>
      </div>
    </div>
  );
}
