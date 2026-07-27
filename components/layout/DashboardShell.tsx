'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import type { Therapist } from '@/types';

// Holds the mobile drawer open/close state shared between Sidebar and
// Topbar's hamburger button — the two are siblings, so this small client
// wrapper is simpler than reaching for Context for a single boolean.
export default function DashboardShell({ therapist, children }: { therapist: Therapist | null; children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar therapist={therapist} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 lg:pl-[22rem] flex flex-col min-h-screen">
        <Topbar therapist={therapist} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
