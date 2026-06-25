'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import type { Therapist } from '@/types';

export default function Topbar({ therapist }: { therapist: Therapist | null }) {
  const router = useRouter();
  const supabase = createClient();
  const name = therapist?.display_name || '';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header
      className="sticky top-0 z-30 flex h-12 items-center justify-between px-6"
      style={{ background: '#1e0d4e', borderBottom: '1px solid #2d1760' }}
    >
      <p className="text-[13px] text-purple-200/70">{today}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={handleLogout}
          className="flex h-7 w-7 items-center justify-center rounded-md text-purple-200/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-purple-800 text-[10px] font-semibold text-white overflow-hidden">
          {therapist?.avatar_url
            ? <img src={therapist.avatar_url} alt={name} className="h-full w-full object-cover"/>
            : getInitials(name)}
        </div>
      </div>
    </header>
  );
}
