'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// Official Google "G" mark (multi-colour), per Google's sign-in button guidelines.
function GoogleG() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.27c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.95H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 .96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

// Shared "Continue with Google" button — works for both sign-up and sign-in,
// since Supabase OAuth creates the auth user automatically on first use.
// Profile bootstrap (name/avatar/email) happens server-side in the callback.
export default function GoogleButton({ label = 'Continue with Google', disabled = false }: { label?: string; disabled?: boolean }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
      });
      // On success the browser navigates away to Google — this only returns on error.
      if (err) throw new Error(err.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Google sign-in.');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <GoogleG />}
        {label}
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
