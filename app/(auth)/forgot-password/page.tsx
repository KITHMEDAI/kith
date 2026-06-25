'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)' }}>
        <KithLockup markSize={30} className="text-[20px] tracking-[0.04em] text-white"
          gradientId="kith-fp-dark" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
        <div className="space-y-4">
          <p className="text-3xl font-semibold text-white leading-snug">Reset your password</p>
          <p className="text-purple-300/80 text-sm leading-relaxed max-w-xs">
            We&apos;ll email you a secure link to set a new password.
          </p>
        </div>
        <p className="text-xs text-purple-400/50">HIPAA · DPDP 2023 · Encrypted at rest &amp; in transit</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12"
        style={{ background: 'linear-gradient(135deg, #e8e0ff 0%, #f2eeff 50%, #dff2e9 100%)' }}>
        <div className="w-full max-w-sm">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>

          {sent ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-5 w-5" /> Check your email
              </div>
              <p className="mt-2 text-sm text-emerald-800/80">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password-reset link. It expires in 1 hour.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Didn&apos;t get it? Check spam, or{' '}
                <button onClick={() => setSent(false)} className="font-medium text-violet-600 hover:text-violet-700">try again</button>.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Forgot password?</h1>
              <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send a reset link.</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email" required autoFocus autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    className="w-full rounded-lg border border-purple-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-none" />{error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 transition-colors">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
