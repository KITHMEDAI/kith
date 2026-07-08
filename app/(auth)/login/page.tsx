'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';
import GoogleButton from '@/components/auth/GoogleButton';

export default function LoginPage() {
  const supabase = createClient();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        // Make the error message friendlier
        const msg = err.message.toLowerCase();
        if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
          setError('Incorrect email or password. Please try again.');
        } else if (msg.includes('email not confirmed')) {
          setError('Your email isn\'t confirmed yet. Check your inbox or contact support.');
        } else if (msg.includes('too many')) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else {
          setError(err.message);
        }
        setLoading(false);
        return;
      }
      // Full page navigation so the session cookie is flushed to the browser
      // before the server-side layout reads it — avoids race with router.push
      window.location.href = '/dashboard';
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)' }}>
        <KithLockup markSize={30} className="text-[20px] tracking-[0.04em] text-white"
          gradientId="kith-login-dark" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
        <div className="space-y-4">
          <p className="text-3xl font-semibold text-white leading-snug">
            Your AI-assisted<br />clinical workspace
          </p>
          <p className="text-purple-300/80 text-sm leading-relaxed max-w-xs">
            Ambient transcription, intelligent SOAP notes, and patient insights — so you can focus entirely on the person in front of you.
          </p>
        </div>
        <p className="text-xs text-purple-400/50">DPDP 2023 aligned · Encrypted at rest &amp; in transit</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12"
        style={{ background: 'linear-gradient(135deg, #e8e0ff 0%, #f2eeff 50%, #dff2e9 100%)' }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center mb-8">
            <KithLockup markSize={26} className="text-[18px] tracking-[0.04em] text-slate-800"
              gradientId="kith-login-light" gradientFrom="#7c3aed" gradientTo="#5b21b6" />
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your clinical workspace</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                className="w-full rounded-lg border border-purple-200 bg-[#FFCCE5]/30 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-purple-600 hover:text-purple-700">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-purple-200 bg-[#FFCCE5]/30 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-colors"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-none" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 transition-colors mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <GoogleButton label="Sign in with Google" />

          <p className="mt-6 text-center text-sm text-slate-500">
            New to Kith?{' '}
            <Link href="/register" className="font-medium text-purple-600 hover:text-purple-700">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
