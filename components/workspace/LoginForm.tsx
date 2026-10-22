'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const inputCls = 'h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

// Shown once Google is configured in the Sydney Supabase project.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_WS_GOOGLE === 'true';

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  // Sign-up step 2: the 8-digit code emailed to prove the address is theirs.
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError ? 'Google sign-in didn’t finish. Try again.' : '');

  const switchMode = (m: 'signin' | 'signup') => { setMode(m); setError(''); setCodeSent(false); setCode(''); };
  const [googleBusy, setGoogleBusy] = useState(false);

  // Same button signs in or creates the account (new users land on onboarding).
  const google = async () => {
    setGoogleBusy(true); setError('');
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/w/auth/callback` },
    });
    if (error) { setGoogleBusy(false); setError(error.message); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) { setError('Enter a valid email'); return; }
    if (password.length < (mode === 'signup' ? 8 : 1)) {
      setError(mode === 'signup' ? 'Use a password of at least 8 characters' : 'Enter your password');
      return;
    }
    setBusy(true); setError('');

    if (mode === 'signup' && !codeSent) {
      const res = await fetch('/api/w/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em }),
      });
      const j = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) { setError(j.error || 'Could not create the account'); return; }
      setCodeSent(true);
      return;
    }

    if (mode === 'signup') {
      const res = await fetch('/api/w/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, code, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setBusy(false); setError(j.error || 'That code didn’t work'); return; }
      router.replace('/');
      router.refresh();
      return;
    }

    const { error } = await createClient().auth.signInWithPassword({ email: em, password });
    if (error) {
      setBusy(false);
      setError(/invalid/i.test(error.message) ? 'Wrong email or password.'
        : /not confirmed/i.test(error.message) ? 'This account isn’t verified yet. Choose “Create account” to get a new code.'
        : error.message);
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

          {GOOGLE_ENABLED && (
            <>
              <button
                type="button"
                onClick={google}
                disabled={googleBusy || busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-medium transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
              >
                {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                )}
                Continue with Google
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
              </p>
              <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" /> or use email <div className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}

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
            {mode === 'signup' && codeSent && (
              <div>
                <p className="mb-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
                  We emailed a code to <b>{email.trim()}</b>. Enter it to finish. (Already have an account? The email says so: sign in instead.)
                </p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Code from the email"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                  className={`${inputCls} tracking-[0.3em]`}
                  aria-label="Code from the email"
                  autoFocus
                />
                <button type="button" onClick={() => { setCodeSent(false); setCode(''); }} className="mt-1 text-xs text-violet-700 hover:underline">
                  Send a new code
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {mode === 'signin' ? 'Sign in' : codeSent ? 'Verify and create account' : 'Create account'}
            </button>
          </form>
          {mode === 'signup' && (
            <p className="mt-3 text-center text-xs text-slate-500">
              By creating an account you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
            </p>
          )}

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {mode === 'signin' && (
            <p className="mt-4 text-center text-xs text-slate-500">
              New here? <button type="button" onClick={() => switchMode('signup')} className="font-medium text-violet-700 hover:underline">Create an account</button>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Your notes are stored in Australia (Sydney). <a href="/privacy" className="underline">Privacy</a> · <a href="/terms" className="underline">Terms</a> · <a href="/help" className="underline">Help</a>
        </p>
      </div>
    </div>
  );
}
