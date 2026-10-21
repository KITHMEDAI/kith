'use client';

import { useState } from 'react';
import { Copy, Check, Mail } from 'lucide-react';

export default function HelpContact({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent('Kith Workspace help')}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(email); } catch { /* clipboard blocked: address is visible anyway */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
      <p className="mt-1 select-all text-lg font-semibold">{email}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={copy} className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 active:scale-[0.98]">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy address'}
        </button>
        <a href={gmail} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.98]">
          <Mail className="h-4 w-4" /> Open in Gmail
        </a>
      </div>
      <p className="mt-3 text-xs text-slate-500">Using Outlook or another email app? Copy the address and paste it into a new email.</p>
    </div>
  );
}
