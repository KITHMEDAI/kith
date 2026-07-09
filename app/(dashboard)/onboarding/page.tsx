'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, Calendar, Users, ArrowRight,
  FileSpreadsheet, Sparkles, Loader2,
  User, Building2, Phone, Upload,
  BadgeCheck, Stethoscope, X, Plus, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { parsePatientFile } from '@/lib/parse-patient-file';
import KithLockup from '@/components/brand/KithLockup';
import { PLAN_FEATURES } from '@/lib/entitlements';

interface Therapist {
  id: string;
  display_name: string;
  designation: string;
  clinic_name: string;
  phone: string;
  specializations: string[];
  booking_source: string;
  onboarding_completed: boolean;
}

type StepId = 'welcome' | 'profile' | 'calendar' | 'records' | 'plan' | 'done';

interface Step { id: StepId; label: string; optional?: boolean }

const STEPS: Step[] = [
  { id: 'welcome',  label: 'Welcome' },
  { id: 'profile',  label: 'Your practice' },
  { id: 'calendar', label: 'Google Calendar', optional: true },
  { id: 'records',  label: 'Import patients',  optional: true },
  { id: 'plan',     label: 'Choose your plan' },
  { id: 'done',     label: 'All set!' },
];

type PlanKey = 'free' | 'pro' | 'ultra';
// USD display pricing — actually charged as the INR equivalent via Razorpay
// (see lib/razorpay.ts PLAN_PRICING). Monthly only here — annual stays a
// billing-page-only decision, kept simple during onboarding.
const PLAN_PRICE: Record<PlanKey, number> = { free: 0, pro: 20, ultra: 50 };

const DESIGNATIONS = [
  'Clinical Psychologist', 'Counselling Psychologist', 'Psychiatrist',
  'Psychotherapist', 'Mental Health Counsellor', 'Child Psychologist',
  'Neuropsychologist', 'Other',
];

type RecordsTab = 'upload' | 'manual';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<StepId>('welcome');
  const [completed, setCompleted] = useState<Set<StepId>>(new Set());

  // Profile step state
  const [displayName, setDisplayName] = useState('');
  const [designation, setDesignation] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [customSpec, setCustomSpec] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Calendar step state
  const [calLoading, setCalLoading] = useState(false);
  const [calConnected, setCalConnected] = useState(false);
  const [calError, setCalError] = useState(false);

  // Records step state
  const [recordsTab, setRecordsTab] = useState<RecordsTab>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Plan step state
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('free');
  const [subscribing, setSubscribing] = useState(false);
  const [planError, setPlanError] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data, error: fetchErr } = await supabase
        .from('therapists')
        .select('id, display_name, designation, clinic_name, phone, specializations, booking_source, onboarding_completed, google_calendar_vault_secret_id')
        .eq('user_id', user.id)
        .single();

      if (fetchErr || !data) {
        // Profile not found at all — go back to register
        router.push('/register');
        return;
      }

      const t = data as Therapist & { google_calendar_vault_secret_id?: string | null };
      if (t.onboarding_completed) { router.push('/dashboard'); return; }

      setTherapist(t);
      // Pre-fill profile from registration
      setDisplayName(t.display_name ?? '');
      setDesignation(t.designation ?? '');
      setClinicName(t.clinic_name ?? '');
      setPhone(t.phone ?? '');
      setSpecializations(t.specializations ?? []);

      // Google Calendar connection is sourced from the DB (set by the OAuth callback) —
      // robust against StrictMode double-mount / URL param loss.
      const calendarConnected = !!t.google_calendar_vault_secret_id;
      setCalConnected(calendarConnected);

      // Build the completed set: welcome is always done, merge saved progress,
      // and mark calendar complete if the DB shows it connected.
      const done = new Set<StepId>(['welcome']);
      const saved = localStorage.getItem(`kith_onboarding_${user.id}`);
      if (saved) {
        try { (JSON.parse(saved) as StepId[]).forEach(s => done.add(s)); } catch { /* ignore */ }
      }
      if (calendarConnected) done.add('calendar');

      // Handle return from the Google OAuth flow, then clean the URL.
      const calParam = new URLSearchParams(window.location.search).get('calendar');
      if (calParam === 'error') setCalError(true);
      if (calParam === 'connected' || calParam === 'error') {
        window.history.replaceState({}, '', '/onboarding');
      }

      setCompleted(done);
      localStorage.setItem(`kith_onboarding_${user.id}`, JSON.stringify(Array.from(done)));

      // Land on the first incomplete step — so a freshly-connected calendar
      // advances straight to "Import patients".
      const firstIncomplete = STEPS.find(s => !done.has(s.id));
      setCurrentStep(firstIncomplete ? firstIncomplete.id : 'done');

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markComplete = useCallback((stepId: StepId) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(stepId);
      // Persist synchronously with the cached user id — no network dependency,
      // so progress survives even when Supabase is briefly unreachable.
      if (userId) localStorage.setItem(`kith_onboarding_${userId}`, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [userId]);

  const goTo = (stepId: StepId) => setCurrentStep(stepId);

  const nextStep = () => {
    markComplete(currentStep);
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].id);
  };

  // ── Profile save ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!displayName.trim()) {
      setProfileError('Name is required.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName.trim(),
        designation,
        clinic_name: clinicName.trim(),
        phone: phone.trim(),
        specializations,
      }),
    });
    setProfileSaving(false);
    if (res.ok) {
      nextStep();
    } else {
      setProfileError('Failed to save. Please try again.');
    }
  };

  const addCustomSpec = () => {
    const trimmed = customSpec.trim();
    if (trimmed && !specializations.includes(trimmed)) {
      setSpecializations(prev => [...prev, trimmed]);
    }
    setCustomSpec('');
  };

  // ── Calendar ──────────────────────────────────────────────────────────────
  const connectCalendar = async () => {
    setCalLoading(true);
    setCalError(false);
    try {
      const res = await fetch('/api/google-calendar/auth-url?from=onboarding');
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url; // → Google consent → callback → /onboarding?calendar=connected|error
    } catch {
      setCalError(true);
      setCalLoading(false);
    }
  };

  // ── CSV/Excel upload ──────────────────────────────────────────────────────
  // Parse the file in the browser and send the same { fileName, headers, rows }
  // JSON the /api/patients/import route expects (it does NOT accept multipart).
  const uploadCsv = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError('');
    setUploadDone(false);
    try {
      const { headers, rows } = await parsePatientFile(uploadFile);
      const cleanRows = rows.filter(r => Object.values(r).some(v => String(v ?? '').trim()));
      if (!cleanRows.length) { setUploadError('That file has no data rows.'); return; }
      if (cleanRows.length > 200) { setUploadError(`That file has ${cleanRows.length} rows — the limit is 200 per import.`); return; }

      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: uploadFile.name, headers, rows: cleanRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setUploadError(data.error || `Import failed (HTTP ${res.status})`); return; }
      if (!data.imported) { setUploadError(data.errors?.[0] || 'No patients could be imported from that file.'); return; }

      setUploadCount(data.imported);
      setUploadDone(true);
      markComplete('records');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      setUploading(false);
    }
  };

  // ── Plan selection ───────────────────────────────────────────────────────
  const choosePlan = async (plan: PlanKey) => {
    setSelectedPlan(plan);
    if (plan === 'free') { nextStep(); return; }

    if (!razorpayLoaded) { setPlanError('Payment system still loading — try again in a moment.'); return; }
    setSubscribing(true);
    setPlanError('');
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: plan, interval: 'monthly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start checkout');

      const options = {
        key: data.key,
        subscription_id: data.subscription_id,
        name: 'Kith Clinical Workspace',
        description: `${plan === 'ultra' ? 'Ultra' : 'Pro'} plan — billed monthly`,
        theme: { color: '#7c3aed' },
        prefill: data.prefill || {},
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          const verify = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, tier: plan, interval: 'monthly' }),
          });
          setSubscribing(false);
          if (verify.ok) nextStep();
          else setPlanError('Payment received but verification failed — contact support, we’ll sort it out.');
        },
        modal: { ondismiss: () => setSubscribing(false) },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).Razorpay(options).open();
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : 'Checkout failed');
      setSubscribing(false);
    }
  };

  // ── Finish ────────────────────────────────────────────────────────────────
  const finish = async () => {
    setFinishing(true);
    setFinishError('');
    markComplete('done');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      });
      if (!res.ok) throw new Error();
      // Hard navigation so the dashboard server layout re-reads the fresh
      // onboarding_completed flag — avoids the redirect loop back to onboarding.
      window.location.href = '/dashboard';
    } catch {
      setFinishError("Couldn't save — check your connection and try again.");
      setFinishing(false);
    }
  };

  if (loading || !therapist) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const stepIdx = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="fixed inset-0 z-50 flex">

      {/* ── Sidebar ── */}
      <div className="hidden lg:flex w-72 flex-none flex-col justify-between p-10"
        style={{ background: 'linear-gradient(160deg,#1e0d4e 0%,#16083a 60%,#0f2a1e 100%)' }}>

        {/* Logo */}
        <KithLockup markSize={28} className="text-[18px] tracking-[0.04em] text-white" />

        {/* Steps */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300/50 mb-5">Setup checklist</p>
          {STEPS.map((s, i) => {
            const done = completed.has(s.id);
            const active = currentStep === s.id;
            return (
              <button key={s.id} onClick={() => goTo(s.id)} className="w-full flex items-center gap-3 text-left group">
                <div className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold border-2 transition-all ${
                  done ? 'bg-emerald-500 border-emerald-500 text-white'
                  : active ? 'bg-violet-500 border-violet-400 text-white'
                  : 'border-purple-800/50 text-purple-400/60'
                }`}>
                  {done ? <Check className="h-3.5 w-3.5"/> : i + 1}
                </div>
                <div>
                  <p className={`text-sm font-medium leading-tight transition-colors ${
                    active ? 'text-white' : done ? 'text-emerald-400' : 'text-purple-300/70 group-hover:text-purple-200'
                  }`}>{s.label}</p>
                  {s.optional && <p className="text-[10px] text-purple-400/40">Optional</p>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs text-purple-300/50 mb-1.5">
            <span>Progress</span>
            <span>{completed.size}/{STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-purple-900/40 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${(completed.size / STEPS.length) * 100}%` }}/>
          </div>
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 overflow-y-auto"
        style={{ background: 'linear-gradient(135deg,#ede9ff 0%,#f4f1ff 50%,#e8f5ef 100%)' }}>
        <div className="w-full max-w-lg flex flex-col">

          {/* ─ Welcome ─ */}
          {currentStep === 'welcome' && (
            <div className="flex flex-col flex-1">
              <div className="flex-1">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-6">
                  <Sparkles className="h-7 w-7 text-violet-500"/>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Welcome to Kith, {(therapist.display_name ?? '').split(' ').slice(-1)[0] || 'Doctor'}!
                </h1>
                <p className="mt-2 text-slate-500 leading-relaxed">
                  Your AI-assisted clinical workspace is ready. Let&apos;s set up your practice profile, connect your calendar, and import your existing patients — takes under 3 minutes.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { icon: '🎤', label: 'Ambient transcription', sub: 'Live transcription during sessions' },
                    { icon: '🧠', label: 'AI clinical notes', sub: 'SOAP notes generated automatically' },
                    { icon: '📊', label: 'Patient insights', sub: 'Mood tracking & progress charts' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-slate-50 p-3.5 text-center">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={nextStep}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors">
                Let&apos;s get started <ArrowRight className="h-4 w-4"/>
              </button>
            </div>
          )}

          {/* ─ Practice Profile ─ */}
          {currentStep === 'profile' && (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
                <User className="h-7 w-7 text-violet-500"/>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Your practice details</h1>
              <p className="mt-1 mb-5 text-slate-500 text-sm">
                This info appears on AI-generated notes and patient reports.
              </p>

              <div className="space-y-4 flex-1">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Dr. Priya Sharma"/>
                  </div>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Designation <span className="font-normal text-slate-400">(optional)</span></label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                    <select value={designation} onChange={e => setDesignation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none bg-white">
                      <option value="">Select designation…</option>
                      {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Clinic */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Clinic / Practice name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                    <input value={clinicName} onChange={e => setClinicName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="MindBridge Wellness"/>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="+91 98765 43210"/>
                  </div>
                </div>

                {/* Specializations — free text, optional */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Specializations <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input value={customSpec} onChange={e => setCustomSpec(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSpec(); } }}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Type a specialization and press Enter…"/>
                    <button type="button" onClick={addCustomSpec}
                      className="px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                      <Plus className="h-4 w-4"/>
                    </button>
                  </div>
                  {specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {specializations.map(s => (
                        <span key={s} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 border border-violet-400 text-violet-700">
                          {s}
                          <button type="button" onClick={() => setSpecializations(prev => prev.filter(x => x !== s))}>
                            <X className="h-3 w-3"/>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {profileError && (
                <p className="mt-3 text-xs text-red-600">{profileError}</p>
              )}

              <button onClick={saveProfile} disabled={profileSaving}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowRight className="h-4 w-4"/>}
                Save & continue
              </button>
            </div>
          )}

          {/* ─ Calendar ─ */}
          {currentStep === 'calendar' && (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
                <Calendar className="h-7 w-7 text-violet-500"/>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Sync your calendar</h1>
              <p className="mt-1 mb-5 text-slate-500 text-sm">
                Connect Google Calendar once — your appointments flow into Kith automatically, no manual entry or spreadsheets.
              </p>

              <div className="flex-1 flex flex-col gap-4">
                {/* Connected banner */}
                {calConnected && (
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3.5">
                    <BadgeCheck className="h-6 w-6 text-emerald-500 flex-none"/>
                    <div>
                      <p className="text-sm font-bold text-emerald-700">Google Calendar connected</p>
                      <p className="text-xs text-emerald-600">Read-only import is active — your events flow in automatically.</p>
                    </div>
                  </div>
                )}

                {/* Error banner */}
                {calError && !calConnected && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
                    <AlertCircle className="h-4 w-4 flex-none mt-0.5"/>
                    <span><strong>Couldn&apos;t connect.</strong> Google declined the request. Please try again — if it keeps failing, the Google integration may still need to be finished in setup.</span>
                  </div>
                )}

                {/* Benefits card */}
                <div className="rounded-2xl border border-violet-100 bg-white/70 backdrop-blur-sm p-4 space-y-2.5">
                  {['Existing calendar events import as Kith appointments', 'No manual entry or spreadsheets needed', 'Read-only — Kith never creates, edits, or deletes anything on your calendar'].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-3 w-3 text-emerald-600"/>
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Privacy reassurance */}
                {!calConnected && (
                  <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
                    <ShieldCheck className="h-3.5 w-3.5 flex-none text-emerald-500 mt-0.5"/>
                    Kith only reads your appointment times to create sessions — it never writes to your calendar, and you can disconnect anytime in Settings.
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2.5">
                {!calConnected && (
                  <button onClick={connectCalendar} disabled={calLoading}
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors shadow-lg shadow-violet-200">
                    {calLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin"/> Opening Google…</>
                      : <><Calendar className="h-4 w-4"/> {calError ? 'Try connecting again' : 'Connect Google Calendar'}</>}
                  </button>
                )}
                <button onClick={nextStep}
                  className={`w-full py-2.5 text-sm transition-colors rounded-xl ${
                    calConnected
                      ? 'bg-violet-600 text-white font-semibold hover:bg-violet-700'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {calConnected ? <>Continue <ArrowRight className="inline h-4 w-4 ml-1"/></> : 'Skip for now →'}
                </button>
              </div>
            </div>
          )}

          {/* ─ Records / Import ─ */}
          {currentStep === 'records' && (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-5">
                <Users className="h-7 w-7 text-emerald-500"/>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Import your patients</h1>
              <p className="mt-1 mb-5 text-slate-500 text-sm">
                Bring your existing patient list into Kith — choose how you manage records.
              </p>

              {/* Tabs */}
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-5">
                {([
                  { id: 'upload', label: '📄 Upload file' },
                  { id: 'manual', label: '✏️ Manual' },
                ] as { id: RecordsTab; label: string }[]).map(tab => (
                  <button key={tab.id} onClick={() => setRecordsTab(tab.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      recordsTab === tab.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Upload */}
              {recordsTab === 'upload' && (
                <div className="flex-1 space-y-4">
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                    Upload a <strong>CSV or Excel (.xlsx)</strong> file. Required columns: <code className="bg-amber-100 px-1 rounded">Name</code>, <code className="bg-amber-100 px-1 rounded">Phone</code>. Optional: Email, Diagnosis, DOB.
                  </div>

                  <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all p-6 ${
                    uploadFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                  }`}>
                    <input type="file" accept=".csv,.xlsx,.xls" className="sr-only"
                      onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadDone(false); }}/>
                    <FileSpreadsheet className={`h-8 w-8 ${uploadFile ? 'text-emerald-500' : 'text-slate-300'}`}/>
                    {uploadFile ? (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">{uploadFile.name}</p>
                        <p className="text-xs text-slate-400">{(uploadFile.size / 1024).toFixed(1)} KB — click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-500">Click to select CSV or Excel file</p>
                        <p className="text-xs text-slate-400 mt-0.5">or drag and drop</p>
                      </div>
                    )}
                  </label>

                  {uploadDone && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                      <BadgeCheck className="h-5 w-5 text-emerald-500"/>
                      <p className="text-sm font-semibold text-emerald-700">
                        {uploadCount} patient{uploadCount === 1 ? '' : 's'} imported successfully!
                      </p>
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                      <AlertCircle className="h-5 w-5 text-rose-500 shrink-0"/>
                      <p className="text-sm font-medium text-rose-700">{uploadError}</p>
                    </div>
                  )}

                  {uploadFile && !uploadDone && (
                    <button onClick={uploadCsv} disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                      Import patients
                    </button>
                  )}
                </div>
              )}

              {/* Tab: Manual */}
              {recordsTab === 'manual' && (
                <div className="flex-1 space-y-4">
                  <p className="text-sm text-slate-500">
                    Add patients one by one from the Patients section. Good if you&apos;re starting fresh or have fewer than 10 patients.
                  </p>
                  <a href="/patients/register"
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                    <Users className="h-4 w-4"/> Add first patient
                  </a>
                </div>
              )}

              <button onClick={nextStep}
                className={`mt-6 w-full py-3 text-sm rounded-xl transition-colors ${
                  uploadDone
                    ? 'bg-violet-600 text-white font-semibold hover:bg-violet-700'
                    : 'text-slate-500 hover:text-slate-700 font-medium'
                }`}>
                {uploadDone
                  ? <>Continue <ArrowRight className="inline h-4 w-4 ml-1"/></>
                  : <>Skip for now <ArrowRight className="inline h-4 w-4 ml-1"/></>}
              </button>
            </div>
          )}

          {/* ─ Plan selection ─ */}
          {currentStep === 'plan' && (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
                <Sparkles className="h-7 w-7 text-violet-500"/>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Choose your plan</h1>
              <p className="mt-1 mb-5 text-slate-500 text-sm">
                Start free, or unlock more from day one — cancel anytime, no lock-in.
              </p>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['free', 'pro', 'ultra'] as PlanKey[]).map(plan => (
                  <div key={plan}
                    className={`rounded-2xl border p-4 flex flex-col ${plan === 'ultra' ? 'border-violet-400 bg-violet-50/70 shadow-md' : 'border-slate-200 bg-white/70'}`}>
                    <p className="text-sm font-bold text-slate-900 capitalize">{plan}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${PLAN_PRICE[plan]}<span className="text-xs font-normal text-slate-400">{plan !== 'free' ? '/mo' : ''}</span></p>
                    <ul className="space-y-1.5 mt-3 mb-4 flex-1">
                      {PLAN_FEATURES[plan].map(f => (
                        <li key={f} className="text-[11px] text-slate-500 leading-snug flex gap-1.5">
                          <Check className="h-3 w-3 text-emerald-500 flex-none mt-0.5"/>{f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => choosePlan(plan)} disabled={subscribing}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
                        plan === 'ultra' ? 'bg-violet-600 text-white hover:bg-violet-700'
                        : plan === 'free' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}>
                      {subscribing && selectedPlan === plan ? <Loader2 className="h-3.5 w-3.5 animate-spin inline"/> : plan === 'free' ? 'Continue free' : `Subscribe to ${plan === 'ultra' ? 'Ultra' : 'Pro'}`}
                    </button>
                  </div>
                ))}
              </div>

              {planError && (
                <p className="mt-3 text-xs text-red-600">{planError}</p>
              )}

              <p className="mt-4 text-center text-[11px] text-slate-400">
                You can change your plan anytime from Settings.
              </p>
            </div>
          )}

          {/* ─ Done ─ */}
          {currentStep === 'done' && (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-5">
                <Check className="h-7 w-7 text-emerald-500"/>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">You&apos;re all set! 🎉</h1>
              <p className="mt-1 mb-5 text-slate-500">
                Your Kith workspace is configured. Here&apos;s a quick recap:
              </p>

              <div className="flex-1 space-y-2.5">
                {[
                  { done: true,                    text: 'Clinical profile created',    sub: therapist.display_name },
                  { done: true,                    text: 'AI note generation ready',    sub: 'SOAP notes + summaries' },
                  { done: completed.has('profile'), text: 'Practice details saved',     sub: therapist.clinic_name || 'Profile complete' },
                  { done: completed.has('calendar'), text: 'Google Calendar',           sub: calConnected ? 'Read-only import active' : 'Connect anytime in Settings → Integrations' },
                  { done: completed.has('records'),  text: 'Patient records',           sub: completed.has('records') ? 'Import configured' : 'Add patients from the Patients tab' },
                  { done: completed.has('plan'),     text: 'Plan selected',              sub: `${selectedPlan[0].toUpperCase()}${selectedPlan.slice(1)}${selectedPlan === 'free' ? ' — upgrade anytime' : ''}` },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className={`flex-none font-bold mt-0.5 ${item.done ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {item.done ? '✓' : '○'}
                    </span>
                    <div>
                      <p className={`font-medium ${item.done ? 'text-slate-700' : 'text-slate-400'}`}>{item.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {finishError && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
                  <AlertCircle className="h-4 w-4 flex-none mt-0.5"/>{finishError}
                </div>
              )}

              <button onClick={finish} disabled={finishing}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
                {finishing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                Go to my dashboard
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-xs text-slate-400 flex-none">
            Step {stepIdx + 1} of {STEPS.length}
          </div>
        </div>
      </div>
    </div>
  );
}
