'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import BookingDialog from '@/components/appointments/BookingDialog';
import type { Patient } from '@/types';

// Inline "Schedule session" trigger for the dashboard. Opens the booking modal
// in place instead of navigating to the Appointments page, then refreshes the
// dashboard data once a booking succeeds — no page jump.
export default function BookAppointmentButton({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-input bg-white/60 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-white/80 transition-colors"
      >
        <Calendar className="h-3.5 w-3.5" /> Schedule session
      </button>

      {open && (
        <BookingDialog
          patients={patients}
          onClose={() => setOpen(false)}
          onBooked={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </>
  );
}
