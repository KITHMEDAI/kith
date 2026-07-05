'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import MessagePatientButton from './MessagePatientButton';
import LockedFeatureButton from '@/components/upgrade/LockedFeatureButton';

interface Props {
  text: string;
  patientId: string;
  patientName: string;
  hasPhone: boolean;
  hasWhatsapp: boolean;
  entitled: boolean;
}

// "Send to patient" on a homework item or AI suggestion — converts the
// clinician-facing text (jargon, ' • ' bullets, **bold**) to a short plain-
// English message via Claude, then hands off to MessagePatientButton so the
// therapist reviews/edits before actually sending. Never sends automatically.
export default function SendToPatientAction({ text, patientId, patientName, hasPhone, hasWhatsapp, entitled }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [plain, setPlain] = useState('');

  if (!entitled) {
    return (
      <LockedFeatureButton requiredPlan="ultra" featureLabel="WhatsApp & SMS messaging to patients" className="ml-2 inline-block">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          <Send className="h-3 w-3" /> Send to patient 🔒
        </span>
      </LockedFeatureButton>
    );
  }

  if (!hasPhone && !hasWhatsapp) return null;

  async function start() {
    setState('loading');
    try {
      const res = await fetch('/api/notes/plain-english', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, patientFirstName: patientName.split(' ')[0] }),
      });
      const data = await res.json();
      setPlain(res.ok ? (data.plain || text) : text);
      setState('ready');
    } catch {
      setPlain(text);
      setState('ready');
    }
  }

  if (state === 'ready') {
    return (
      <MessagePatientButton
        patientId={patientId} patientName={patientName}
        hasPhone={hasPhone} hasWhatsapp={hasWhatsapp} entitled={entitled}
        initialMessage={plain} triggerLabel="Send to patient" autoOpen
        className="ml-2 inline-flex !mt-0 text-[10px]"
      />
    );
  }

  return (
    <button type="button" onClick={start} disabled={state === 'loading'}
      className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors">
      {state === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send to patient
    </button>
  );
}
