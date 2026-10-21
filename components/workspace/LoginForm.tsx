'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const inputCls = 'h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError ? 'That link has expired. Sign in with your email and password.' : '');

  const switchMode = (m: 'signin' | 'signup') => { setMode(m); setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) { setError('Enter a valid email'); return; }
    if (password.length < (mode === 'signup' ? 8 : 1)) {
      setError(mode === 'signup' ? 'Use a password of at least 8 characters' : 'Enter your password');
      return;
    }
    setBusy(true); setError('');

    if (mode === 'signup') {
      const res = await fetch('/api/w/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBusy(false);
        setError(j.error || 'Could not create the account');
        if (res.status === 409) setMode('signin');
        return;
      }
    }

    const { error } = await createClient().auth.signInWithPassword({ email: em, password });
    if (error) {
      setBusy(false);
      setError(/invalid/i.test(error.message) ? 'Wrong email or password.' : error.message);
      return;
    }
    // New users land on onboarding; returning users on New note.
    router.replace('/');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <KithLockup markSize={36} className="text-[26px] text-slate-900" gradientId="ws-login-grad" />
          <p className="mt-3 text-sm text-slate-500">Record or type. Get a clean, structured note in seconds.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn('rounded-lg py-2 transition', mode === m ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800')}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls}
              autoFocus
            />
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'Choose a password (8+ characters)' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {mode === 'signin' && (
            <p className="mt-4 text-center text-xs text-slate-500">
              New here? <button type="button" onClick={() => switchMode('signup')} className="font-medium text-violet-700 hover:underline">Create an account</button>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Your notes are stored in Australia (Sydney). <a href="/privacy" className="underline">Privacy</a> · <a href="mailto:kithmedai@gmail.com" className="underline">Help</a>
        </p>
      </div>
    </div>
  );
}
