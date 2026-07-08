'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, ChevronRight, ChevronDown, Loader2, Camera, FileSpreadsheet, X, MapPin, Calendar, ShieldCheck } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { parsePatientFile } from '@/lib/parse-patient-file';
import KithLockup from '@/components/brand/KithLockup';
import GoogleButton from '@/components/auth/GoogleButton';

const INPUT = 'w-full rounded-xl border border-purple-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors';
const LABEL = 'block text-sm font-semibold text-slate-700 mb-1.5';
const STEPS = ['Account', 'Profile', 'Photo', 'Import'];

const DEGREES = [
  'M.D. (Psychiatry)', 'Ph.D. (Psychology)', 'M.Phil (Clinical Psychology)',
  'M.Sc. (Psychology)', 'M.A. (Psychology)', 'M.S.W.', 'D.P.M.', 'MBBS', 'Other',
];


const NAME_PREFIXES = ['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.'];


// ── Location autocomplete (OpenStreetMap Nominatim — free, no API key) ────────
interface NominatimResult { display_name: string; address: { city?: string; town?: string; state?: string; country?: string } }

function LocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch_ = useCallback((q: string) => {
    if (q.length < 3) { setSuggestions([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&limit=6&format=json&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        const labels = data.map(d => {
          const a = d.address;
          return [a.city || a.town, a.state].filter(Boolean).join(', ');
        }).filter((v, i, arr) => v && arr.indexOf(v) === i);
        setSuggestions(labels as string[]);
        setOpen(true);
      } catch { /* ignore */ }
    }, 350);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
        <input
          type="text"
          placeholder="Koramangala, Bengaluru"
          value={value}
          autoComplete="off"
          onChange={e => { onChange(e.target.value); fetch_(e.target.value); }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={INPUT + ' pl-9'}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-purple-100 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map(s => (
            <button key={s} type="button" onMouseDown={() => { onChange(s); setSuggestions([]); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50 transition-colors text-left">
              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-none"/>{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KithLogo() {
  return (
    <KithLockup markSize={30} className="text-[19px] tracking-[0.04em] text-white" />
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClientSupabaseClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [namePrefix, setNamePrefix] = useState('Dr.');
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<{ fileName: string; headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelDone, setExcelDone] = useState(false);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const [form, setForm] = useState({
    email: '', password: '',
    name: '',
    business_phone: '', personal_phone: '',
    clinic_name: '', clinic_address: '', degree: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validate = (): string | null => {
    if (step === 1) {
      if (!form.email || !form.password) return 'Email and password are required';
      if (form.password.length < 8) return 'Password must be at least 8 characters';
      if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email';
    }
    if (step === 2) {
      if (!form.name.trim()) return 'Your name is required';
      if (!form.business_phone.trim()) return 'Business number is required';
      if (!form.clinic_name.trim()) return 'Clinic name is required';
    }
    return null;
  };

  const next = () => { const e = validate(); if (e) { setError(e); return; } setError(null); setErrorCode(null); setStep(s => s + 1); };
  const back = () => { setError(null); setErrorCode(null); setStep(s => s - 1); };

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file (JPG, PNG, or WebP).'); return; }
    if (file.size > 10 * 1024 * 1024) {
      setError(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB — please use a photo under 10 MB.`);
      return;
    }
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Parse the file in the browser (same path as the dedicated Import page) so it
  // becomes the { fileName, headers, rows } JSON the import API expects. The actual
  // import POST happens later in createAccount(), once the user is authenticated.
  const handleExcelUpload = async (file: File) => {
    setExcelFile(file);
    setExcelUploading(true);
    setError(null);
    try {
      const { headers, rows } = await parsePatientFile(file);
      const cleanRows = rows.filter(r => Object.values(r).some(v => String(v ?? '').trim()));
      if (!cleanRows.length) {
        setError('That file has no data rows.');
        setExcelFile(null);
        return;
      }
      if (cleanRows.length > 200) {
        setError(`That file has ${cleanRows.length} rows — the limit is 200 patients per import.`);
        setExcelFile(null);
        return;
      }
      setExcelData({ fileName: file.name, headers, rows: cleanRows });
      setExcelDone(true);
    } catch {
      setError("Couldn't read that file. Please upload a valid .csv or .xlsx spreadsheet.");
      setExcelFile(null);
    } finally {
      setExcelUploading(false);
    }
  };

  // Creates the account, signs in, and uploads any photo / Excel file.
  // Returns true on success. On failure it sets the error message and returns
  // false (the caller is responsible for resetting its own loading state).
  const createAccount = async (bookingSource: string): Promise<boolean> => {
    setError(null); setErrorCode(null);
    try {
      const displayName = `${namePrefix} ${form.name}`.trim();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          display_name: displayName,
          phone: form.business_phone || null,
          clinic_name: form.clinic_name || null,
          clinic_address: form.clinic_address || null,
          designation: form.degree || null,
          booking_source: bookingSource,
          onboarding_completed: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EMAIL_EXISTS') setErrorCode('EMAIL_EXISTS');
        throw new Error(data.error || 'Registration failed');
      }

      // Auto sign-in so the next step has an authenticated session
      // (needed for the avatar/Excel uploads and the Google Calendar OAuth handoff)
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInErr) throw new Error('Account created! Please sign in to continue.');

      // Upload avatar photo if one was selected
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        await fetch('/api/profile/avatar', { method: 'POST', body: fd }).catch(() => {});
      }

      // Import the parsed patient file if one was uploaded (JSON shape the API expects)
      if (excelData) {
        await fetch('/api/patients/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(excelData),
        }).catch(() => {});
      }

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
      return false;
    }
  };

  // Finish with Excel / manual booking — straight to onboarding.
  const handleSubmit = async () => {
    setLoading(true);
    const ok = await createAccount(excelDone ? 'excel' : 'none');
    if (ok) window.location.href = '/onboarding';
    else setLoading(false);
  };

  // Finish by connecting Google Calendar — creates the account, then hands off to
  // Google's consent screen. The OAuth callback stores the calendar tokens and
  // returns the user to onboarding (?calendar=connected), where bookings are synced.
  const handleConnectGoogleCalendar = async () => {
    setGcalLoading(true);
    const ok = await createAccount('google_calendar');
    if (!ok) { setGcalLoading(false); return; }
    try {
      const res = await fetch('/api/google-calendar/auth-url?from=onboarding');
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url; // → Google consent → /onboarding?calendar=connected
    } catch {
      setError('Your account is ready, but we couldn’t start the Google Calendar connection. You can connect it anytime from Settings → Integrations.');
      setGcalLoading(false);
    }
  };

  const displayName = `${namePrefix} ${form.name}`.trim();
  const initials = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const busy = loading || gcalLoading;

  return (
    <div className="flex min-h-screen">
      {/* Left */}
      <div className="hidden lg:flex w-72 flex-col justify-between p-10 flex-none" style={{ background:'linear-gradient(160deg,#1e0d4e 0%,#16083a 60%,#0f2a1e 100%)' }}>
        <KithLogo />
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600/60 mb-5">Setup</p>
          {STEPS.map((label, i) => {
            const s = i + 1; const done = step > s; const cur = step === s;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-all ${done ? 'bg-emerald-500 border-emerald-500 text-white' : cur ? 'bg-violet-500 border-violet-400 text-white' : 'border-purple-800/50 text-purple-800'}`}>
                  {done ? <Check className="h-3.5 w-3.5"/> : s}
                </div>
                <span className={`text-sm font-medium ${cur ? 'text-white' : done ? 'text-emerald-400' : 'text-purple-800'}`}>{label}</span>
              </div>
            );
          })}
        </div>
        <div>
          <p className="text-xs text-purple-600/50">Free plan forever · No credit card</p>
          <p className="text-xs text-purple-700/30 mt-1">Encrypted · DPDP 2023 aligned</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 overflow-y-auto" style={{ background:'linear-gradient(135deg,#ede9ff 0%,#f4f1ff 50%,#e8f5ef 100%)' }}>
        <div className="w-full max-w-md">

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 flex-none"/>{error}
              </div>
              {errorCode === 'EMAIL_EXISTS' && (
                <div className="mt-2 flex gap-2">
                  <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors">
                    Sign in instead
                  </Link>
                  <button onClick={() => { setStep(1); setError(null); setErrorCode(null); set('email', ''); set('password', ''); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                    Use a different email
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 1 — Account */}
          {step === 1 && (
            <div className="space-y-5">
              <div><h1 className="text-2xl font-bold text-slate-900">Create your account</h1><p className="mt-1 text-sm text-slate-500">Your secure Kith workspace starts here</p></div>
              <div><label className={LABEL}>Work email *</label><input type="email" autoFocus placeholder="you@clinic.com" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT}/></div>
              <div><label className={LABEL}>Password *</label><input type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => set('password', e.target.value)} className={INPUT}/></div>
              <label className="flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-none rounded border-purple-300 text-violet-600 focus:ring-violet-400"
                />
                <span>
                  I agree to Kith&rsquo;s <Link href="/terms" target="_blank" className="font-semibold text-violet-600 hover:underline">Terms of Service</Link> and{' '}
                  <Link href="/privacy" target="_blank" className="font-semibold text-violet-600 hover:underline">Privacy Policy</Link>, and I confirm I&rsquo;m
                  responsible for obtaining my patients&rsquo; consent before recording or AI-processing any session.
                </span>
              </label>
              <button onClick={next} disabled={!consentChecked}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-200">
                Continue <ChevronRight className="h-4 w-4"/>
              </button>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-purple-200/60" />
                <span className="text-xs text-slate-400">or</span>
                <div className="h-px flex-1 bg-purple-200/60" />
              </div>
              <GoogleButton label="Sign up with Google" disabled={!consentChecked} />
              <p className="text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-bold text-violet-600">Sign in</Link></p>
            </div>
          )}

          {/* STEP 2 — Profile */}
          {step === 2 && (
            <div className="space-y-5">
              <div><h1 className="text-2xl font-bold text-slate-900">Your practice details</h1><p className="mt-1 text-sm text-slate-500">Appears on session notes and patient communications</p></div>

              {/* Name with prefix */}
              <div>
                <label className={LABEL}>Your name *</label>
                <div className="flex gap-2">
                  {/* Prefix selector */}
                  <div className="relative">
                    <button type="button" onClick={() => setPrefixOpen(o => !o)}
                      className="flex items-center gap-1 rounded-xl border border-purple-200 bg-white/80 px-3 py-3 text-sm font-semibold text-violet-700 whitespace-nowrap hover:bg-white transition-colors">
                      {namePrefix}<ChevronDown className="h-3.5 w-3.5 text-slate-400"/>
                    </button>
                    {prefixOpen && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-purple-100 rounded-xl shadow-xl overflow-hidden w-24">
                        {NAME_PREFIXES.map(p => (
                          <button key={p} type="button" onClick={() => { setNamePrefix(p); setPrefixOpen(false); }}
                            className={`w-full px-3 py-2.5 text-sm text-left hover:bg-violet-50 transition-colors ${namePrefix === p ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-slate-700'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="text" autoFocus placeholder="Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} className={INPUT + ' flex-1'}/>
                </div>
                {form.name && <p className="mt-1.5 text-xs text-violet-600">Will appear as: <strong>{displayName}</strong></p>}
              </div>

              {/* Highest degree */}
              <div>
                <label className={LABEL}>Highest degree <span className="text-slate-400 font-normal">(optional)</span></label>
                <select value={form.degree} onChange={e => set('degree', e.target.value)} className={INPUT}>
                  <option value="">Select…</option>
                  {DEGREES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              {/* Business phone */}
              <div>
                <label className={LABEL}>Clinic / business number *</label>
                <PhoneInput value={form.business_phone} onChange={v => set('business_phone', v)}/>
              </div>

              {/* Personal phone */}
              <div>
                <label className={LABEL}>Personal number <span className="text-slate-400 font-normal">(optional)</span></label>
                <PhoneInput value={form.personal_phone} onChange={v => set('personal_phone', v)}/>
              </div>

              {/* Clinic name */}
              <div>
                <label className={LABEL}>Clinic / practice name *</label>
                <input type="text" placeholder="MindBridge Wellness Centre" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} className={INPUT}/>
              </div>

              {/* Location with autocomplete */}
              <div>
                <label className={LABEL}>Location</label>
                <LocationInput value={form.clinic_address} onChange={v => set('clinic_address', v)}/>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={back} className="flex-none rounded-xl border border-purple-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-purple-50 transition-colors">Back</button>
                <button onClick={next} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-colors">Continue <ChevronRight className="h-4 w-4"/></button>
              </div>
            </div>
          )}

          {/* STEP 3 — Photo */}
          {step === 3 && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold text-slate-900">Add a profile photo</h1><p className="mt-1 text-sm text-slate-500">Optional — helps patients and your team recognise you</p></div>
              <div className="flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="h-28 w-28 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden border-4 border-white shadow-xl"
                    style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                    {avatarPreview ? <img src={avatarPreview} alt="" className="h-full w-full object-cover"/> : initials}
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition-colors border-2 border-white">
                    <Camera className="h-4 w-4"/>
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}/>
                <button onClick={() => fileRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 px-8 py-3 text-sm font-semibold text-violet-600 hover:bg-violet-100 hover:border-violet-400 transition-all">
                  {avatarPreview ? 'Change photo' : 'Upload photo'}
                </button>
                <p className="text-xs text-slate-400">JPG or PNG · Max 5 MB</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={back} className="flex-none rounded-xl border border-purple-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-purple-50 transition-colors">Back</button>
                <button onClick={next} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-colors">
                  {avatarPreview ? 'Continue' : 'Skip for now'} <ChevronRight className="h-4 w-4"/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — Import existing bookings */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Bring in your existing bookings</h1>
                <p className="mt-1 text-sm text-slate-500">Choose how Kith should import your appointments — pick one, both, or skip for now. You can always add more later.</p>
              </div>

              {/* Google Calendar — fewest steps, recommended */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white/80 p-6 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#4285F4]/10">
                    <Calendar className="h-5 w-5 text-[#4285F4]"/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">Google Calendar</p>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Fewest steps</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Connect once and Kith brings in your upcoming appointments automatically — no spreadsheet needed.
                    </p>
                  </div>
                </div>
                <button onClick={handleConnectGoogleCalendar} disabled={busy}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-[#4285F4]/40 bg-[#4285F4]/5 py-3 text-sm font-bold text-[#4285F4] hover:bg-[#4285F4]/10 hover:border-[#4285F4]/60 disabled:opacity-60 transition-all">
                  {gcalLoading ? <><Loader2 className="h-4 w-4 animate-spin"/> Connecting…</> : <><Calendar className="h-4 w-4"/> Connect Google Calendar</>}
                </button>
              </div>

              {/* divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200"/>
                <span className="text-xs font-medium text-slate-400">or upload a file</span>
                <div className="h-px flex-1 bg-slate-200"/>
              </div>

              {/* Excel upload card */}
              <div className={`rounded-2xl border-2 p-6 transition-all ${excelDone ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white/80'}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#217346]/10">
                    <FileSpreadsheet className="h-5 w-5 text-[#217346]"/>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Excel / CSV file</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Any format works — Name, Phone, Email, Diagnosis columns. We'll map the columns for you.
                    </p>
                  </div>
                </div>

                {excelDone && excelFile ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-100 rounded-xl">
                    <Check className="h-4 w-4 text-emerald-600 flex-none"/>
                    <span className="text-sm font-semibold text-emerald-700 flex-1 truncate">{excelFile.name}</span>
                    <button onClick={() => { setExcelFile(null); setExcelData(null); setExcelDone(false); }} className="text-emerald-500 hover:text-emerald-700 transition-colors">
                      <X className="h-4 w-4"/>
                    </button>
                  </div>
                ) : (
                  <>
                    <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); }}/>
                    <button onClick={() => excelRef.current?.click()} disabled={excelUploading || busy}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#217346]/40 bg-[#217346]/5 py-3 text-sm font-bold text-[#217346] hover:bg-[#217346]/10 hover:border-[#217346]/60 disabled:opacity-60 transition-all">
                      {excelUploading ? <><Loader2 className="h-4 w-4 animate-spin"/> Reading…</> : <><FileSpreadsheet className="h-4 w-4"/> Upload Excel or CSV</>}
                    </button>
                  </>
                )}
              </div>

              {/* Security reassurance */}
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 leading-relaxed">
                <ShieldCheck className="h-4 w-4 flex-none text-emerald-600 mt-0.5"/>
                <span>
                  <strong className="text-slate-600">Your data stays private.</strong> Kith only accesses your appointment times to schedule sessions — never your emails or personal events. Connections are encrypted and you can disconnect anytime from Settings.
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={back} disabled={busy} className="flex-none rounded-xl border border-purple-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-purple-50 disabled:opacity-60 transition-colors">Back</button>
                <button onClick={handleSubmit} disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors shadow-lg shadow-violet-200">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin"/> Creating workspace…</> : <><Check className="h-4 w-4"/> Create my workspace</>}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400">More booking tools are coming soon — you can also import anytime from the Patients tab</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
