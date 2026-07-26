'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import type { NoteFormat } from '@/lib/soap-formatter';

const EXAMPLES: Record<NoteFormat, string> = {
  soap: "Priya came in saying she's been sleeping a bit better since last time but still checks her phone for work emails right before bed. She seemed more relaxed than last session, made good eye contact, laughed a couple times. We talked through the breathing exercise again and she said it helps some nights. Want her to try leaving her phone outside the bedroom before next session and see how that goes.",
  emdr: "Worked on the car accident memory again today. Started at an 8 for distress, brought it down to a 3 by the end. The belief ‘I'm not safe’ still felt pretty true at first — by the end ‘I survived it, I'm safe now’ felt much truer. Did several sets of eye movements, checked in after each. Ended with a body scan, shoulders felt lighter. Continue with the same target next week if distress is still elevated, otherwise move toward installation.",
};

const FIELD_SETS: Record<NoteFormat, { key: string; label: string; color: string }[]> = {
  soap: [
    { key: 'subjective', label: 'S — Subjective', color: '#a78bfa' },
    { key: 'objective', label: 'O — Objective', color: '#34d399' },
    { key: 'assessment', label: 'A — Assessment', color: '#fbbf24' },
    { key: 'plan', label: 'P — Plan', color: '#f472b6' },
  ],
  emdr: [
    { key: 'target', label: 'Target Processed', color: '#a78bfa' },
    { key: 'sudVoc', label: 'SUD → VOC', color: '#34d399' },
    { key: 'cognitions', label: 'Negative → Positive Cognition', color: '#fbbf24' },
    { key: 'phasePlan', label: 'Phase & Next Session', color: '#f472b6' },
  ],
};

export default function SoapFormatterTool() {
  const [format, setFormat] = useState<NoteFormat>('soap');
  const [input, setInput] = useState('');
  const [note, setNote] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchFormat(next: NoteFormat) {
    if (next === format) return;
    setFormat(next);
    setNote(null);
    setError(null);
  }

  async function handleFormat() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch('/api/soap-formatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, format }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong — please try again.');
      } else {
        setNote(data.note);
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fields = FIELD_SETS[format];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4 justify-center" role="tablist" aria-label="Note format">
        {(['soap', 'emdr'] as NoteFormat[]).map(f => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={format === f}
            onClick={() => switchFormat(f)}
            className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors"
            style={
              format === f
                ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {f === 'soap' ? 'SOAP note' : 'EMDR note'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-5 sm:p-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.25)' }}>
        <label htmlFor="soap-input" className="block text-xs font-semibold uppercase tracking-widest text-purple-300/60 mb-2">
          Paste rough session notes or a transcript excerpt
        </label>
        <textarea
          id="soap-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={EXAMPLES[format]}
          maxLength={4000}
          rows={7}
          className="w-full rounded-xl p-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-y"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <div className="flex items-center justify-between mt-2 mb-4">
          <span className="text-[11px] text-white/30">{input.length}/4000</span>
          <button
            type="button"
            onClick={() => setInput(EXAMPLES[format])}
            className="text-[11px] font-medium text-violet-300/70 hover:text-violet-200 transition-colors"
          >
            Try an example
          </button>
        </div>

        <button
          type="button"
          onClick={handleFormat}
          disabled={!input.trim() || loading}
          className="w-full rounded-xl py-3 text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 24px rgba(124,58,237,0.35)' }}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Formatting…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Format as {format === 'soap' ? 'SOAP' : 'EMDR'} note
            </>
          )}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-300/90 text-center">{error}</p>
        )}
      </div>

      {note && (
        <div className="mt-5 rounded-2xl p-5 sm:p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.25)' }}>
          {fields.map(f => (
            <div key={f.key}>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: f.color }}>
                {f.label}
              </span>
              <p className="text-sm text-white/80 leading-relaxed mt-1">{note[f.key] || '—'}</p>
            </div>
          ))}
        </div>
      )}

      {note && (
        <div className="mt-6 rounded-2xl p-5 sm:p-6 text-center"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)' }}>
          <p className="text-sm text-purple-100/90 mb-4">
            This happened automatically during the session with Kith — no pasting required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-violet-700 hover:bg-purple-50 transition-colors shadow-lg"
          >
            Try Kith free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <p className="text-center text-[11px] text-white/25 mt-5">
        Nothing you paste here is saved or stored — it's formatted and shown back to you only.
      </p>
    </div>
  );
}
