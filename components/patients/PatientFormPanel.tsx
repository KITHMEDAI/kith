'use client';

import { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import type { Patient } from '@/types';
import PhoneInput from '@/components/ui/PhoneInput';

// therapy_modality is free TEXT (no DB CHECK), so these are just shortcuts.
const DIAGNOSIS_OPTIONS = [
  'Depression', 'Anxiety', 'PTSD', 'Bipolar Disorder', 'OCD',
  'ADHD', 'Schizophrenia', 'Eating Disorder', 'Substance Use', 'Personality Disorder',
];
const MODALITY_OPTIONS = ['CBT', 'DBT', 'EMDR', 'ACT', 'Psychodynamic', 'Family', 'Couples', 'Group'];

// Values here MUST match the DB CHECK constraints.
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  { label: 'Other', value: 'other' },
];
const FREQUENCIES = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'As needed', value: 'as_needed' },
];

type AnyPatient = Patient & Record<string, unknown>;

interface Props {
  patient?: Patient | null;             // present => edit mode
  onClose: () => void;
  onSaved: (patient: Patient, mode: 'add' | 'edit') => void;
}

const LABEL = 'block text-xs font-medium text-purple-200/70 mb-1.5';
const FIELD = 'w-full rounded-lg border border-purple-500/20 px-3 py-2.5 text-[13px] text-white placeholder:text-purple-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
const FIELD_STYLE = { background: 'rgba(255,255,255,0.07)' } as const;

export default function PatientFormPanel({ patient, onClose, onSaved }: Props) {
  const editing = !!patient;
  // Cast once for dynamic field access (some columns aren't on the Patient type).
  const pt = patient as unknown as AnyPatient | null;
  const str = (k: string) => (pt && pt[k] != null ? String(pt[k]) : '');

  const [f, setF] = useState({
    display_name: pt?.display_name ?? '',
    nickname: str('nickname'),
    phone: pt?.phone ?? '',
    whatsapp_number: str('whatsapp_number'),
    email: pt?.email ?? '',
    date_of_birth: pt?.date_of_birth ?? '',
    gender: pt?.gender ?? '',
    therapy_modality: pt?.therapy_modality ?? '',
    session_frequency: str('session_frequency'),
    medications: str('medications'),
    presenting_concerns: str('presenting_concerns'),
    emergency_contact_name: str('emergency_contact_name'),
    emergency_contact_phone: str('emergency_contact_phone'),
  });
  const [diagnosis, setDiagnosis] = useState<string[]>(pt?.diagnosis ?? []);
  const [goals, setGoals] = useState<string[]>(((pt?.therapy_goals as string[]) ?? []));
  const [goalInput, setGoalInput] = useState('');
  const [consentRecording, setConsentRecording] = useState(!!pt?.consent_recording);
  const [consentAi, setConsentAi] = useState(!!(pt?.consent_ai_notes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }));
  const toggleDiagnosis = (t: string) =>
    setDiagnosis(prev => (prev.includes(t) ? prev.filter(d => d !== t) : [...prev, t]));
  const addGoal = () => {
    const g = goalInput.trim();
    if (g && !goals.includes(g)) setGoals(prev => [...prev, g]);
    setGoalInput('');
  };

  async function handleSubmit() {
    if (!f.display_name.trim()) { setError('Name is required'); return; }
    if (!f.phone.trim()) { setError('Phone number is required'); return; }
    setLoading(true); setError('');
    const clean = (v: string) => (v.trim() ? v.trim() : null);
    const payload: Record<string, unknown> = {
      display_name: f.display_name.trim(),
      nickname: clean(f.nickname),
      phone: clean(f.phone),
      whatsapp_number: clean(f.whatsapp_number),
      email: clean(f.email),
      date_of_birth: clean(f.date_of_birth),
      gender: f.gender || null,
      therapy_modality: clean(f.therapy_modality),
      session_frequency: f.session_frequency || null,
      medications: clean(f.medications),
      presenting_concerns: clean(f.presenting_concerns),
      emergency_contact_name: clean(f.emergency_contact_name),
      emergency_contact_phone: clean(f.emergency_contact_phone),
      diagnosis,
      therapy_goals: goals,
      consent_recording: consentRecording,
      consent_ai_notes: consentAi,
    };
    if (consentRecording || consentAi) payload.consent_date = new Date().toISOString();

    try {
      const res = await fetch(editing ? `/api/patients/${pt!.id}` : '/api/patients', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? payload : { ...payload, source: 'manual' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save patient — check the details and try again');
      const saved = (editing
        ? { ...(pt as AnyPatient), ...payload, id: pt!.id }
        : { ...payload, id: (data.patient?.id ?? data.id) }) as unknown as Patient;
      onSaved(saved, editing ? 'edit' : 'add');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save patient');
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, #1a0f3e 0%, #120a2e 100%)',
            border: '1px solid rgba(139,92,246,0.25)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
        <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-none" style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-white">{editing ? 'Edit patient' : 'Add patient'}</h2>
            <p className="text-[12px] text-purple-300/60 mt-0.5">{editing ? 'Update this patient record' : 'Register a new patient record'}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-purple-300/60 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Full name <span className="text-red-400">*</span></label>
              <input value={f.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. Priya Sharma" className={FIELD} style={FIELD_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Nickname</label>
              <input value={f.nickname} onChange={e => set('nickname', e.target.value)} placeholder="Preferred name" className={FIELD} style={FIELD_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Date of birth</label>
              <input type="date" value={f.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={FIELD} style={FIELD_STYLE} />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className={LABEL}>Gender</label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map(g => (
                <button key={g.value} type="button" onClick={() => set('gender', f.gender === g.value ? '' : g.value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${f.gender === g.value ? 'border-violet-500 bg-violet-600/30 text-violet-200' : 'border-purple-500/20 text-purple-300/60 hover:border-purple-400/40 hover:text-purple-200'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Phone <span className="text-red-400">*</span></label>
              <PhoneInput dark value={f.phone} onChange={v => set('phone', v)} placeholder="98765 43210" />
            </div>
            <div>
              <label className={LABEL}>WhatsApp <span className="text-purple-300/40">(if different)</span></label>
              <PhoneInput dark value={f.whatsapp_number} onChange={v => set('whatsapp_number', v)} placeholder="98765 43210" />
            </div>
            <div>
              <label className={LABEL}>Email <span className="text-purple-300/40">(optional)</span></label>
              <input type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="patient@email.com" className={FIELD} style={FIELD_STYLE} />
            </div>
          </div>

          {/* Diagnosis */}
          <div>
            <label className={LABEL}>Diagnosis tags</label>
            <div className="flex flex-wrap gap-1.5">
              {DIAGNOSIS_OPTIONS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleDiagnosis(tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${diagnosis.includes(tag) ? 'bg-violet-600 text-white' : 'text-purple-300/70 hover:text-purple-100'}`}
                  style={!diagnosis.includes(tag) ? { background: 'rgba(255,255,255,0.08)' } : {}}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Modality + frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Therapy modality</label>
              <select value={f.therapy_modality} onChange={e => set('therapy_modality', e.target.value)} className={FIELD} style={FIELD_STYLE}>
                <option value="">Select…</option>
                {MODALITY_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Session frequency</label>
              <select value={f.session_frequency} onChange={e => set('session_frequency', e.target.value)} className={FIELD} style={FIELD_STYLE}>
                <option value="">Select…</option>
                {FREQUENCIES.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
              </select>
            </div>
          </div>

          {/* Medications */}
          <div>
            <label className={LABEL}>Current medications</label>
            <input value={f.medications} onChange={e => set('medications', e.target.value)} placeholder="e.g. Sertraline 50mg OD" className={FIELD} style={FIELD_STYLE} />
          </div>

          {/* Presenting concerns */}
          <div>
            <label className={LABEL}>Presenting concerns</label>
            <textarea value={f.presenting_concerns} onChange={e => set('presenting_concerns', e.target.value)} rows={3} placeholder="Why is the patient seeking therapy?" className={`${FIELD} resize-none`} style={FIELD_STYLE} />
          </div>

          {/* Therapy goals */}
          <div>
            <label className={LABEL}>Treatment goals</label>
            {goals.length > 0 && (
              <ul className="mb-2 space-y-1">
                {goals.map((g, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] text-purple-100" style={FIELD_STYLE}>
                    <span className="truncate">▸ {g}</span>
                    <button type="button" onClick={() => setGoals(prev => prev.filter((_, idx) => idx !== i))} className="text-purple-300/50 hover:text-white"><X className="h-3 w-3" /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input value={goalInput} onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }}
                placeholder="Add a goal and press Enter" className={FIELD} style={FIELD_STYLE} />
              <button type="button" onClick={addGoal} className="flex-none rounded-lg border border-purple-500/20 px-3 text-purple-200 hover:bg-white/10 transition-colors"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Emergency contact */}
          <div className="space-y-2">
            <div>
              <label className={LABEL}>Emergency contact name</label>
              <input value={f.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} placeholder="Name" className={FIELD} style={FIELD_STYLE} />
            </div>
            <div>
              <label className={LABEL}>Emergency contact phone</label>
              <PhoneInput dark value={f.emergency_contact_phone} onChange={v => set('emergency_contact_phone', v)} placeholder="98765 43210" />
            </div>
          </div>

          {/* Consent */}
          <div className="space-y-2 rounded-lg p-3" style={FIELD_STYLE}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-300/60">Consent</p>
            <label className="flex items-center gap-2.5 text-[12px] text-purple-100 cursor-pointer">
              <input type="checkbox" checked={consentRecording} onChange={e => setConsentRecording(e.target.checked)} className="accent-violet-500" />
              Patient consents to session recording
            </label>
            <label className="flex items-center gap-2.5 text-[12px] text-purple-100 cursor-pointer">
              <input type="checkbox" checked={consentAi} onChange={e => setConsentAi(e.target.checked)} className="accent-violet-500" />
              Patient consents to AI-assisted notes
            </label>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex gap-3 flex-none" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-purple-500/20 py-2.5 text-[13px] font-medium text-purple-300/70 hover:text-white hover:border-purple-400/40 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 rounded-lg bg-violet-600 py-2.5 text-[13px] font-medium text-white hover:bg-violet-500 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : (editing ? 'Save changes' : 'Add patient')}
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
