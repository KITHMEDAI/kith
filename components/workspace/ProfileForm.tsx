'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { FIELDS } from '@/lib/workspace/fields';
import PhoneField from './PhoneField';

export interface ProfileValues {
  name: string;
  email: string;
  phone: string;
  field: string;
  field_custom: string;
  note_preferences: string;
}

const inputCls = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

export default function ProfileForm({ mode, initial }: { mode: 'onboarding' | 'account'; initial: ProfileValues }) {
  const router = useRouter();
  const [v, setV] = useState<ProfileValues>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPrefs, setShowPrefs] = useState(!!initial.note_preferences);
  const set = (k: keyof ProfileValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSaved(false);
    setV(prev => ({ ...prev, [k]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) { setError('Please add your name'); return; }
    if (v.field === 'other' && !v.field_custom.trim()) { setError('Tell us your field'); return; }
    setBusy(true); setError('');
    const res = await fetch('/api/w/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.error || 'Something went wrong'); return; }
    if (mode === 'onboarding') { router.replace('/'); router.refresh(); }
    else { setSaved(true); router.refresh(); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Name</span>
        <input className={inputCls} value={v.name} onChange={set('name')} autoComplete="name" placeholder="Your full name" autoFocus={mode === 'onboarding' && !v.name} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input className={`${inputCls} bg-slate-50 text-slate-500`} value={v.email} readOnly />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Phone <span className="font-normal text-slate-400">(optional)</span></span>
        <PhoneField value={v.phone} onChange={phone => { setSaved(false); setV(prev => ({ ...prev, phone })); }} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Your field</span>
        <select className={inputCls} value={v.field} onChange={set('field')}>
          {FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </label>

      {v.field === 'other' && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">What do you do?</span>
          <input className={inputCls} value={v.field_custom} onChange={set('field_custom')} placeholder="e.g. Mining safety officer, wedding planner…" autoFocus />
          <span className="mt-1 block text-xs text-slate-500">Kith will learn how notes are written in your line of work.</span>
        </label>
      )}

      {showPrefs ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">How do you like your notes? <span className="font-normal text-slate-400">(optional)</span></span>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            value={v.note_preferences}
            onChange={set('note_preferences')}
            placeholder="e.g. Very short bullets, always list who owns each action, use metric units"
          />
        </label>
      ) : (
        <button type="button" onClick={() => setShowPrefs(true)} className="text-sm text-violet-700 hover:underline">
          + Tell Kith how you like your notes (optional)
        </button>
      )}

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        {mode === 'onboarding' ? (busy && v.field === 'other' ? 'Learning your field…' : 'Start taking notes') : saved ? 'Saved' : 'Save changes'}
      </button>
    </form>
  );
}
