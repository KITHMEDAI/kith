'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Mic, FileText, Sparkles, LogOut, UserRound, LifeBuoy, Loader2 } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'New note', icon: Mic },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/ask', label: 'Ask', icon: Sparkles },
];

const itemCls = 'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:outline-none';

export default function WorkspaceNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Rewritten paths arrive as /w/... on the client router; normalise.
  const path = pathname.replace(/^\/w(?=\/|$)/, '') || '/';
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  // Warm the menu's pages so they open instantly.
  useEffect(() => { router.prefetch('/account'); router.prefetch('/help'); }, [router]);

  // Close on outside click / tap or Escape. (No hover-out closing: that made
  // the menu vanish while moving the pointer onto an item.)
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menu]);

  // Close the menu whenever the page changes.
  useEffect(() => { setMenu(false); }, [pathname]);

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
        <div className="relative" ref={wrapRef}>
          <button
            onClick={() => setMenu(m => !m)}
            className={cn('flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-95',
              menu && 'ring-2 ring-violet-200')}
            aria-label="Account menu"
            aria-expanded={menu}
            aria-haspopup="menu"
          >
            {name.trim().charAt(0).toUpperCase() || <UserRound className="h-4 w-4" />}
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <p className="truncate px-3 py-2 text-xs text-slate-500">{name}</p>
              <Link href="/account" role="menuitem" className={itemCls} onClick={() => setMenu(false)}>
                <UserRound className="h-4 w-4" /> Profile &amp; field
              </Link>
              <Link href="/help" role="menuitem" className={itemCls} onClick={() => setMenu(false)}>
                <LifeBuoy className="h-4 w-4" /> Help &amp; support
              </Link>
              <div className="my-1 h-px bg-slate-100" />
              {/* One request: the server clears the session and redirects to sign-in. */}
              <a
                href="/api/w/auth/signout"
                role="menuitem"
                onClick={() => setSigningOut(true)}
                className={cn(itemCls, 'text-rose-600 hover:bg-rose-50 focus:bg-rose-50')}
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {signingOut ? 'Signing out…' : 'Sign out'}
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
