'use client';

import { useState } from 'react';

// Phone number with a country-code dropdown (defaults to Australia +61).
// Stored as "+61 412 345 678"; empty number → empty string (phone is optional).

const CODES = [
  { code: '+61', flag: '🇦🇺', name: 'Australia', example: '412 345 678' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand', example: '21 123 4567' },
  { code: '+91', flag: '🇮🇳', name: 'India', example: '98765 43210' },
  { code: '+1', flag: '🇺🇸', name: 'US / Canada', example: '201 555 0123' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom', example: '7400 123456' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore', example: '8123 4567' },
  { code: '+971', flag: '🇦🇪', name: 'UAE', example: '50 123 4567' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines', example: '905 123 4567' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia', example: '12 345 6789' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia', example: '812 345 678' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa', example: '71 123 4567' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland', example: '85 123 4567' },
];

export default function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const match = value.match(/^(\+\d{1,4})\s*(.*)$/);
  const [code, setCode] = useState(match && CODES.some(c => c.code === match[1]) ? match[1] : '+61');
  const number = match ? match[2] : value;
  const current = CODES.find(c => c.code === code) ?? CODES[0];

  const update = (c: string, n: string) => {
    const clean = n.replace(/[^\d\s()-]/g, '').slice(0, 20);
    // Australians often type the leading 0 (0412…); drop it after a country code.
    // Keep spaces as typed (trailing ones too) so typing isn't jumpy; the API trims on save.
    const typed = clean.replace(/^\s+/, '').replace(/^0(?=\d)/, '');
    onChange(typed.trim() ? `${c} ${typed}` : '');
  };

  return (
    <div className="flex gap-2">
      <select
        aria-label="Country code"
        value={code}
        onChange={e => { setCode(e.target.value); update(e.target.value, number); }}
        className="h-11 w-[7.5rem] flex-none rounded-xl border border-slate-300 bg-white px-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      >
        {CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} {c.name}</option>)}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={number}
        onChange={e => update(code, e.target.value)}
        placeholder={current.example}
        className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}
