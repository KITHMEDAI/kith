'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2 } from 'lucide-react';

// Starts a session immediately for a patient: creates a "now" appointment, then
// navigates into the live session screen (which is keyed by appointment id).
export default function StartSessionButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startSession() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          scheduled_at: new Date().toISOString(),
          duration_minutes: 50,
          modality: 'in_person',
          session_type: 'individual',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(typeof data.error === 'string' ? data.error : 'Could not start session');
      router.push(`/session/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start session');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={startSession}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-white" />}
        {loading ? 'Starting…' : 'Start session'}
      </button>
      {error && <span className="mt-1 text-[11px] text-red-500">{error}</span>}
    </div>
  );
}
