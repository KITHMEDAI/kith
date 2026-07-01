'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dark?: boolean; // true = dark panel style (patient form), false = light style (register)
}

export default function PhoneInput({ value, onChange, placeholder = '98765 43210', dark = false }: Props) {
  const [open, setOpen] = useState(false);

  // Parse stored value like "+91 98765 43210" back into parts
  const match = value.match(/^(\+\d+)\s*(.*)$/);
  const code = match ? match[1] : '+91';
  const number = match ? match[2] : (value.startsWith('+') ? '' : value);

  const update = (c: string, n: string) => onChange(n.trim() ? `${c} ${n.trim()}` : '');

  const btnClass = dark
    ? 'flex items-center gap-1.5 rounded-lg border border-purple-500/20 px-3 py-2.5 text-sm text-white whitespace-nowrap hover:border-purple-400/40 transition-colors flex-none'
    : 'flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white/80 px-3 py-3 text-sm text-slate-900 whitespace-nowrap hover:bg-white transition-colors flex-none';

  const inputClass = dark
    ? 'flex-1 rounded-lg border border-purple-500/20 px-3 py-2.5 text-[13px] text-white placeholder:text-purple-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent min-w-0'
    : 'flex-1 rounded-xl border border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors min-w-0';

  const dropdownClass = dark
    ? 'absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden w-48 shadow-xl'
    : 'absolute top-full left-0 mt-1 z-50 bg-white border border-purple-100 rounded-xl shadow-xl overflow-hidden w-48';

  const dropdownStyle = dark
    ? { background: '#1a0f3e', border: '1px solid rgba(139,92,246,0.3)' }
    : {};

  const itemBase = dark
    ? 'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-white/10 transition-colors text-left'
    : 'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-violet-50 transition-colors text-left';

  const btnStyle = dark ? { background: 'rgba(255,255,255,0.07)' } : {};
  const inputStyle = dark ? { background: 'rgba(255,255,255,0.07)' } : {};

  return (
    <div className="flex gap-2 relative">
      <div className="relative">
        <button type="button" onClick={() => setOpen(o => !o)} className={btnClass} style={btnStyle}>
          <span>{COUNTRY_CODES.find(c => c.code === code)?.flag ?? '🇮🇳'}</span>
          <span className="font-medium">{code}</span>
          <ChevronDown className={`h-3 w-3 ${dark ? 'text-purple-300/50' : 'text-slate-400'}`} />
        </button>
        {open && (
          <div className={dropdownClass} style={dropdownStyle}>
            {COUNTRY_CODES.map(c => (
              <button key={c.code} type="button"
                onClick={() => { update(c.code, number); setOpen(false); }}
                className={`${itemBase} ${c.code === code ? (dark ? 'bg-white/10 text-violet-300' : 'bg-violet-50 text-violet-700 font-semibold') : (dark ? 'text-purple-200' : 'text-slate-700')}`}>
                <span>{c.flag}</span>
                <span className="font-medium">{c.code}</span>
                <span className={`text-xs truncate ${dark ? 'text-purple-300/50' : 'text-slate-400'}`}>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="tel"
        placeholder={placeholder}
        value={number}
        onChange={e => update(code, e.target.value)}
        className={inputClass}
        style={inputStyle}
      />
    </div>
  );
}
