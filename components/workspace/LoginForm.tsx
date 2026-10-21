'use client';

import { useState } from 'react';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(linkError ? 'That sign-in link has expired or was already used. Send a new one.' : '');

  const callback = () => `${window.location.origin}/api/w/auth/callback`;

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email'); return; }
    setBusy('email'); setError('');
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback(), shouldCreateUser: true },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  };

  const google = async () => {
    setBusy('google'); setError('');
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback() },
    });
    if (error) { setBusy(null); setError(error.message); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <KithLockup markSize={36} className="text-[26px] text-slate-900" gradientId="ws-login-grad" />
          <p className="mt-3 text-sm text-slate-500">Record or type. Get a clean, structured note in seconds.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {sent ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h1 className="mt-3 text-lg font-semibold">Check your inbox</h1>
              <p className="mt-1 text-sm text-slate-500">We sent a sign-in link to <b className="text-slate-700">{email}</b>. Open it on this device.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-sm text-violet-700 hover:underline">Use a different email</button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold">Sign in or create your account</h1>
              <p className="mt-1 text-sm text-slate-500">No password needed.</p>

              <button
                onClick={google}
                disabled={busy !== null}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-medium transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
              >
                {busy === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                )}
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" /> or <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={sendLink} className="space-y-3">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:opacity-60"
                >
                  {busy === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Email me a sign-in link
                </button>
              </form>
            </>
          )}
          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Your notes are stored in Australia (Sydney). <a href="/privacy" className="underline">Privacy</a>
        </p>
      </div>
    </div>
  );
}
