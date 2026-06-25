'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import PatientFormPanel from './PatientFormPanel';
import type { Patient } from '@/types';

// Client-side "Edit details" entry point for the (server-rendered, read-only)
// patient profile page. Opens the shared add/edit panel pre-filled, then
// refreshes the server component so the saved changes show immediately.
export default function EditPatientButton({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <PatientFormPanel
          patient={patient}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-input bg-white/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/80 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit details
      </button>
    </>
  );
}
