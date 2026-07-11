'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Loader2, Send, X, Info } from 'lucide-react';
import LockedFeatureButton from '@/components/upgrade/LockedFeatureButton';

interface Props {
  patientId: string;
  patientName: string;
  hasEmail: boolean;
  entitled: boolean;
  /** Pre-filled message + trigger label — used by "Send to patient" on homework/suggestions. */
  initialMessage?: string;
  triggerLabel?: string;
  lockedLabel?: string;
  className?: string;
  autoOpen?: boolean;
}

export default function MessagePatientButton({
  patientId, patientName, hasEmail, entitled,
  initialMessage, triggerLabel = 'Message patient', lockedLabel, className = 'mt-3', autoOpen = false,
}: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [message, setMessage] = useState(initialMessage || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'error' | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  // Just-in-time email capture: email stays optional on the patient record
  // right up until the moment you actually try to message them, at which
  // point it's required — asked for here instead of forcing it on every
  // patient up front.
  const [localHasEmail, setLocalHasEmail] = useState(hasEmail);
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailErr, setEmailErr] = useState('');

  if (!entitled) {
    return (
      <LockedFeatureButton requiredPlan="ultra" featureLabel="Direct messaging to patients" className={className}>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" /> {lockedLabel || triggerLabel} 🔒
        </span>
      </LockedFeatureButton>
    );
  }

  async function saveEmailAndContinue() {
    const email = emailInput.trim();
    if (!email) { setEmailErr('Enter an email address'); return; }
    setSavingEmail(true); setEmailErr('');
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save email');
      setLocalHasEmail(true);
      setMessage(initialMessage || '');
      setResult(null);
      setOpen(true);
    } catch (e) {
      setEmailErr(e instanceof Error ? e.message : 'Could not save email');
    } finally {
      setSavingEmail(false);
    }
  }

  if (!localHasEmail) {
    return (
      <div className={className}>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Add an email to message {patientName}
        </p>
        <div className="flex items-center gap-1.5">
          <input type="email" value={emailInput} onChange={e => { setEmailInput(e.target.value); setEmailErr(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEmailAndContinue(); } }}
            placeholder="patient@email.com"
            className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button type="button" onClick={saveEmailAndContinue} disabled={savingEmail}
            className="flex-none rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60 flex items-center gap-1 transition-colors">
            {savingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
          </button>
        </div>
        {emailErr && <p className="mt-1 text-[11px] text-red-500">{emailErr}</p>}
      </div>
    );
  }

  async function send() {
    setSending(true); setResult(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
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

      {/* Rendered via portal straight to <body> — this button often sits
          inside a backdrop-blur card (e.g. the Contact card on the patient
          page), and any ancestor with backdrop-filter/transform becomes a
          containing block for position:fixed, which clips the overlay to
          that card's box instead of covering the full viewport. */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-5 space-y-4"
            style={{ background: '#0f172a', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 70px rgba(139,92,246,0.35), 0 0 20px rgba(139,92,246,0.25), 0 40px 80px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white">Message {patientName}</p>
                <div className="relative">
                  <button type="button" onClick={() => setShowInfo(v => !v)} onBlur={() => setShowInfo(false)}
                    className="flex items-center text-slate-500 hover:text-violet-400 transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  {showInfo && (
                    <div className="absolute left-0 top-6 z-10 w-52 rounded-lg p-2.5 text-[11px] leading-relaxed text-slate-300"
                      style={{ background: '#1a1a3a', border: '1px solid rgba(139,92,246,0.35)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                      This isn&apos;t a direct message — it&apos;s sent to {patientName}&apos;s email.
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-slate-500 hover:text-white transition-colors" /></button>
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
        </div>,
        document.body,
      )}
    </>
  );
}
