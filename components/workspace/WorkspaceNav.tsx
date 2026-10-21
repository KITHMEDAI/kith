'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mic, FileText, Sparkles, LogOut, UserRound } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'New note', icon: Mic },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/ask', label: 'Ask', icon: Sparkles },
];

export default function WorkspaceNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  // Rewritten paths arrive as /w/... on the client router; normalise.
  const path = pathname.replace(/^\/w(?=\/|$)/, '') || '/';
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  const signOut = async () => {
    await createClient().auth.signOut({ scope: 'local' }); // this device only; other devices stay signed in
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center" aria-label="Kith Workspace home">
          <KithLockup markSize={24} className="text-[16px] text-slate-900" gradientId="ws-nav-grad" />
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                active(href) ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="relative">
          <button
            onClick={() => setMenu(m => !m)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white hover:bg-violet-700"
            aria-label="Account menu"
          >
            {name.trim().charAt(0).toUpperCase() || <UserRound className="h-4 w-4" />}
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg" onMouseLeave={() => setMenu(false)}>
              <p className="truncate px-3 py-2 text-xs text-slate-500">{name}</p>
              <Link href="/account" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                <UserRound className="h-4 w-4" /> Profile &amp; field
              </Link>
              <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
