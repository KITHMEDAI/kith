'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, Users, FileText, BarChart2, Settings, LogOut } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import KithLockup from '@/components/brand/KithLockup';
import type { Therapist } from '@/types';

const nav = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/appointments', label: 'Appointments',  icon: Calendar },
  { href: '/patients',     label: 'Patients',      icon: Users },
  { href: '/notes',        label: 'Notes',         icon: FileText },
  { href: '/insights',     label: 'Insights',      icon: BarChart2 },
];

export default function Sidebar({ therapist }: { therapist: Therapist | null }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const name      = therapist?.display_name || 'Doctor';
  const initials  = getInitials(name);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-[22rem] flex-col"
      style={{ background: 'linear-gradient(180deg, #1e0d4e 0%, #16083a 100%)', borderRight: '1px solid #2d1760' }}
    >
      {/* Brand */}
      <div className="flex items-center px-5 py-[18px]" style={{ borderBottom: '1px solid #2d1760' }}>
        <KithLockup markSize={30} className="text-[19px] tracking-[0.04em] text-white" />
      </div>

      {/* Doctor card → links to /settings/profile */}
      <Link href="/settings"
        className="group px-4 py-3.5 hover:bg-white/5 transition-colors"
        style={{ borderBottom: '1px solid #2d1760' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-purple-800 text-[11px] font-semibold text-white group-hover:bg-purple-500 transition-colors overflow-hidden">
            {therapist?.avatar_url
              ? <img src={therapist.avatar_url} alt={name} className="h-full w-full object-cover"/>
              : initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-purple-50 leading-tight">{name}</p>
            {therapist?.designation && (
              <p className="truncate text-[11px] text-purple-300/60 leading-tight mt-0.5">{therapist.designation}</p>
            )}
          </div>
          <Settings className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-none" />
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-200/70 hover:text-white hover:bg-white/8'
              )}>
              <Icon className="h-[15px] w-[15px] flex-none" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings + logout */}
      <div className="px-3 pb-4 space-y-0.5" style={{ borderTop: '1px solid #2d1760' }}>
        <Link href="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors mt-2',
            pathname.startsWith('/settings')
              ? 'bg-purple-600 text-white'
              : 'text-purple-200/70 hover:text-white hover:bg-white/8'
          )}>
          <Settings className="h-[15px] w-[15px] flex-none" />
          Settings
        </Link>
        <button onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-purple-300/50 hover:text-red-400 hover:bg-white/8 transition-colors">
          <LogOut className="h-[15px] w-[15px] flex-none" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
