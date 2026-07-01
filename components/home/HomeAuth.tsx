'use client';

import Link from 'next/link';
import GoogleButton from '@/components/auth/GoogleButton';

export default function HomeAuth() {
  return (
    <div className="w-full max-w-sm space-y-3">
      <GoogleButton label="Continue with Google" />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-purple-300/40">OR</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <Link href="/register"
        className="flex items-center justify-center w-full rounded-2xl py-3 text-sm font-semibold text-white transition-all"
        style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)' }}>
        Sign up with email
      </Link>

      <p className="text-center text-xs text-purple-300/50">
        Already have an account?{' '}
        <Link href="/login" className="text-purple-200/80 underline hover:text-white transition-colors">Sign in</Link>
      </p>

      <p className="text-center text-xs text-purple-300/30">
        14-day Pro trial · Free plan forever · No card required
      </p>
    </div>
  );
}
