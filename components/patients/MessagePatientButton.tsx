'use client';

import { useState } from 'react';
import { MessageSquare, Loader2, Send, X } from 'lucide-react';
import LockedFeatureButton from '@/components/upgrade/LockedFeatureButton';

interface Props {
  patientId: string;
  patientName: string;
  hasPhone: boolean;
  hasWhatsapp: boolean;
  entitled: boolean;
  /** Pre-filled message + trigger label — used by "Send to patient" on homework/suggestions. */
  initialMessage?: string;
  triggerLabel?: string;
  lockedLabel?: string;
  className?: string;
  autoOpen?: boolean;
}

export default function MessagePatientButton({
  patientId, patientName, hasPhone, hasWhatsapp, entitled,
  initialMessage, triggerLabel = 'Message patient', lockedLabel, className = 'mt-3', autoOpen = false,
}: Props) {
  const [open, setOpen] = useState(autoOpen);
  // SMS deprioritized for now — India (the initial market) requires DLT
  // registration for reliable SMS delivery; WhatsApp has no such restriction.
  // Re-enable the SMS option once TWILIO_PHONE_NUMBER + DLT are set up.
  const [channel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [message, setMessage] = useState(initialMessage || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'error' | null>(null);

  if (!entitled) {
    return (
      <LockedFeatureButton requiredPlan="ultra" featureLabel="WhatsApp messaging to patients" className={className}>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" /> {lockedLabel || triggerLabel} 🔒
        </span>
      </LockedFeatureButton>
    );
  }

  async function send() {
    setSending(true); setResult(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, message: message.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to send');
      setResult('sent');
      setTimeout(() => { setOpen(false); setResult(null); setMessage(''); }, 1200);
    } catch {
      setResult('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setMessage(initialMessage || ''); setResult(null); setOpen(true); }}
        className={`${className} flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors`}>
        <MessageSquare className="h-3.5 w-3.5" /> {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-5 space-y-4" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Message {patientName}</p>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-slate-500 hover:text-white transition-colors" /></button>
            </div>

            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
              <span>⚠️</span>
              <span>This can appear on the patient&apos;s lock screen and isn&apos;t a private clinical channel. Avoid diagnosis, medication names, or risk details — keep it to logistics and general encouragement.</span>
            </div>

            <div className="flex gap-2">
              {/* SMS deprioritized for now (see channel state comment above) — WhatsApp only. */}
              <span className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold"
                style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }}>
                Sending via WhatsApp
              </span>
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Type your message…"
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />

            <button onClick={send} disabled={sending || !message.trim()}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              style={{ background: result === 'error' ? 'rgba(239,68,68,0.8)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {result === 'sent' ? 'Sent!' : result === 'error' ? 'Failed — try again' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
