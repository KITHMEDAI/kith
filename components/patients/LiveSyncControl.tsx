'use client';

import { useCallback, useState } from 'react';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Manual "pull latest patients from Google Calendar" button for the Patients page.
// New patients flow in automatically from Calendar (see CalendarAutoSync); this
// just lets the doctor force an immediate pull. Existing patients are brought in
// once via the file import, and new ones can be added directly on the website.
export default function LiveSyncControl({ onSynced }: { onSynced: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);

  const runSync = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/google-calendar/sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ text: data.error || `HTTP ${res.status}`, kind: 'err' });
        return;
      }
      const created = data.created ?? data.patientsCreated ?? 0;
      const updated = data.updated ?? data.patientsUpdated ?? 0;
      if (created || updated) {
        setMsg({ text: `${created} new · ${updated} updated`, kind: 'ok' });
        onSynced();
      } else {
        setMsg({ text: 'Everything already up to date', kind: 'ok' });
      }
    } catch {
      setMsg({ text: 'Network error', kind: 'err' });
    } finally {
      setBusy(false);
    }
  }, [onSynced]);

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className={`flex items-center gap-1 text-[12px] ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
          {msg.kind === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {msg.text}
        </span>
      )}

      <button
        onClick={runSync}
        disabled={busy}
        title="Pull latest patients from Google Calendar"
        className="flex items-center gap-1.5 rounded-md border border-violet-200 bg-white px-3 py-2 text-[13px] font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60 transition-colors"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Sync calendar
      </button>
    </div>
  );
}
