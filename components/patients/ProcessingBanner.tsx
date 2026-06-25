'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

type BannerStatus = 'processing' | 'failed' | 'done';

interface Props {
  patientId: string;
  initialStatus: BannerStatus;
  /** Latest session id — required for the "Retry" action on a failed note. */
  sessionId?: string;
}

/**
 * Shows on the patient profile after a session ends.
 * Polls /api/sessions/status every 4 s until notes are ready, then reloads.
 */
export function ProcessingBanner({ patientId, initialStatus, sessionId }: Props) {
  const [status, setStatus] = useState<BannerStatus>(initialStatus);
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    if (!sessionId) { window.location.reload(); return; }
    setRetrying(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/retry-notes`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setStatus('processing'); // restarts polling via the effect below
    } catch {
      setRetrying(false);
    }
  }

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/latest-session-status`);
      if (!res.ok) return;
      const { sessionStatus } = await res.json();

      if (sessionStatus === 'completed') {
        setStatus('done');
        window.location.reload();
      } else if (sessionStatus === 'failed') {
        setStatus('failed');
      }
      // keep polling if still 'processing'
    } catch {
      // network blip — keep polling
    }
  }, [patientId]);

  useEffect(() => {
    if (status !== 'processing') return;
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [status, poll]);

  if (status === 'done') return null;

  if (status === 'failed') {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <AlertTriangle className="h-4 w-4 text-red-400 flex-none" />
        <div className="flex-1">
          <span className="font-medium text-red-300">Note generation failed.</span>
          <span className="ml-2 text-red-400/70 text-xs">The session transcript was saved — you can regenerate the notes.</span>
        </div>
        <button
          onClick={retry}
          disabled={retrying}
          className="flex-none flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 transition-colors"
          style={{ background: 'rgba(239,68,68,0.85)' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
      style={{
        background: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(59,130,246,0.1))',
        border: '1px solid rgba(139,92,246,0.25)',
      }}>
      <RefreshCw className="h-4 w-4 text-violet-400 animate-spin flex-none" />
      <div>
        <span className="font-medium text-violet-200">Generating clinical notes…</span>
        <span className="ml-2 text-violet-400/70 text-xs">AI is analysing the session · typically 60–90 s</span>
      </div>
    </div>
  );
}
