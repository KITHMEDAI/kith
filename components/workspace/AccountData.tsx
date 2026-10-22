'use client';

import { useState } from 'react';
import { Download, LogOut, Trash2, Loader2 } from 'lucide-react';

const btn = 'flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60';

// "Your data": download everything (APP 12), sign out on every device, and
// delete the account with everything in it.
export default function AccountData({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    setBusy(true); setError('');
    const res = await fetch('/api/w/account/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: typed }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); setError(j.error || 'Could not delete the account'); return; }
    window.location.href = '/login?deleted=1';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">Download your data</h2>
        <p className="mt-1 text-sm text-slate-500">Every note, its original transcript or typed text, and your profile, as one JSON file.</p>
        <a href="/api/w/account/export" className={`${btn} mt-3 w-fit`}><Download className="h-4 w-4" /> Download my data</a>
      </div>

      <div>
        <h2 className="font-medium">Sign out everywhere</h2>
        <p className="mt-1 text-sm text-slate-500">Ends your sessions on every device and browser, including this one. Use it if you lost a device or shared a computer.</p>
        <form method="post" action="/api/w/auth/signout" className="mt-3">
          <input type="hidden" name="scope" value="global" />
          <button type="submit" className={btn}><LogOut className="h-4 w-4" /> Sign out of all devices</button>
        </form>
      </div>

      <div>
        <h2 className="font-medium text-rose-700">Delete account</h2>
        <p className="mt-1 text-sm text-slate-500">Permanently deletes your account, every note and anything still waiting to be transcribed. This can&apos;t be undone. Copies in our providers&apos; backups are overwritten within about 7 days.</p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className={`${btn} mt-3 border-rose-300 text-rose-700 hover:bg-rose-50`}>
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        ) : (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <label className="block text-sm text-rose-900">
              Type <b>{email}</b> to confirm
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                autoComplete="off"
                className="mt-2 h-10 w-full rounded-lg border border-rose-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                onClick={remove}
                disabled={busy || typed.trim().toLowerCase() !== email.toLowerCase()}
                className="flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete everything
              </button>
              <button onClick={() => { setConfirming(false); setTyped(''); setError(''); }} className="rounded-lg px-3 text-sm text-rose-900 hover:bg-rose-100">Cancel</button>
            </div>
            {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
