'use client';

import Link from 'next/link';
import { User, CreditCard, Link2 } from 'lucide-react';

const TABS = [
  { key: 'profile',      label: 'Profile',      href: '/settings',              icon: User },
  { key: 'billing',      label: 'Billing',      href: '/settings/billing',      icon: CreditCard },
  { key: 'integrations', label: 'Integrations', href: '/settings/integrations', icon: Link2 },
] as const;

// Settings/Billing/Integrations are three separate pages with no shared shell,
// so without this there was no way to discover Integrations short of guessing
// the URL. Styled as a floating light pill bar so it reads fine whether the
// page underneath it is the dark profile page or the light billing/integrations
// pages, rather than needing a per-page theme variant.
export default function SettingsTabs({ active }: { active: 'profile' | 'billing' | 'integrations' }) {
  return (
    <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-md p-1 shadow-sm">
      {TABS.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
            key === active
              ? 'bg-violet-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Link>
      ))}
    </div>
  );
}
