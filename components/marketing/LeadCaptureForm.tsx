'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function LeadCaptureForm({ source, label }: { source: string; label: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
        <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">Check your inbox</p>
        <p className="text-xs text-muted-foreground mt-1">Sent to {email}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 text-center">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">Enter your email — we'll send it right over.</p>
      <div className="flex flex-col sm:flex-row gap-2 mt-4 max-w-sm mx-auto">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@clinic.com"
          disabled={status === 'loading'}
          className="flex-1 rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button type="submit" disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
          {status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Send it
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <p className="text-[11px] text-muted-foreground mt-3">
        Occasional follow-up emails, unsubscribe anytime.
      </p>
    </form>
  );
}
