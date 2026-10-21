import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/workspace/server';
import WorkspaceNav from '@/components/workspace/WorkspaceNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  const profile = await getProfile(user.id);
  if (!profile) redirect('/onboarding');

  return (
    <>
      <WorkspaceNav name={profile.name} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:pt-10">{children}</main>
    </>
  );
}
