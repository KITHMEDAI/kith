'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [ready, setReady]       = useState(false);   // recovery session established
  const [error, setError]       = useState<string | null>(null);

  // The browser client auto-exchanges the recovery code from the URL on load and
  // fires PASSWORD_RECOVERY. Confirm we have a session before allowing the change.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw new Error(err.message);
      setDone(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reset password.';
      setError(/session|expired|missing/i.test(msg)
        ? 'This reset link has expired or is invalid. Please request a new one.'
        : msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)' }}>
        <KithLockup markSize={30} className="text-[20px] tracking-[0.04em] text-white"
          gradientId="kith-rp-dark" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
        <div className="space-y-4">
          <p className="text-3xl font-semibold text-white leading-snug">Set a new password</p>
          <p className="text-purple-300/80 text-sm leading-relaxed max-w-xs">Choose a strong password you don&apos;t use elsewhere.</p>
        </div>
        <p className="text-xs text-purple-400/50">HIPAA · DPDP 2023 · Encrypted at rest &amp; in transit</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12"
        style={{ background: 'linear-gradient(135deg, #e8e0ff 0%, #f2eeff 50%, #dff2e9 100%)' }}>
        <div className="w-full max-w-sm">
          {done ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 flex items-center gap-2 text-emerald-700 font-semibold">
              <CheckCircle2 className="h-5 w-5" /> Password updated — signing you in…
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">New password</h1>
              <p className="mt-1 text-sm text-slate-500">
                {ready ? 'Enter a new password for your account.' : 'Verifying your reset link…'}
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-lg border border-purple-200 bg-white/70 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                  <input
                    type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-lg border border-purple-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                    <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-none" />{error}</div>
                    {/expired|invalid/i.test(error) && (
                      <Link href="/forgot-password" className="mt-2 inline-block text-xs font-semibold text-violet-600 hover:text-violet-700">
                        Request a new link →
                      </Link>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading || !ready}
                  className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 transition-colors">
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
