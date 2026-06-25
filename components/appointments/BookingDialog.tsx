'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Loader2, ChevronDown, Search, UserPlus, Check, AlertTriangle, Repeat, Video } from 'lucide-react';
import type { Patient } from '@/types';

interface DayAppt {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string;
  patient?: { display_name?: string } | null;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Booking dialog ──────────────────────────────────────────────────────────
// Self-contained appointment booking modal. Used both on the Appointments page
// and inline on the Dashboard so the doctor never has to leave the page they're on.
export interface BookingDialogProps {
  patients: Patient[];
  preselectedPatientId?: string;
  onClose: () => void;
  onBooked: () => void;
}

export default function BookingDialog({ patients, preselectedPatientId, onClose, onBooked }: BookingDialogProps) {
  const [patientId, setPatientId]     = useState(preselectedPatientId || '');
  const [search, setSearch]           = useState('');
  const [dropdownOpen, setDropdown]   = useState(false);
  const [date, setDate]               = useState('');
  const [time, setTime]               = useState('10:00');
  const [duration, setDuration]       = useState('50');
  const [modality, setModality]       = useState<'in_person'|'video'|'phone'>('in_person');
  const [sessionType, setSessionType] = useState<'individual'|'couples'|'group'|'family'>('individual');
  const [goals, setGoals]             = useState('');
  const [meetingUrl, setMeetingUrl]   = useState('');
  const [repeat, setRepeat]           = useState<'none'|'weekly'|'biweekly'|'monthly'>('none');
  const [count, setCount]             = useState('6');
  const [dayAppts, setDayAppts]       = useState<DayAppt[]>([]);
  const [checking, setChecking]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const dropdownRef                   = useRef<HTMLDivElement>(null);

  // Inline "add new patient" — keeps the doctor inside this dialog instead of
  // opening a separate page/tab.
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients);
  const [adding, setAdding]           = useState(false);
  const [newName, setNewName]         = useState('');
  const [newPhone, setNewPhone]       = useState('');
  const [creating, setCreating]       = useState(false);
  const [addErr, setAddErr]           = useState('');

  const selectedPatient = localPatients.find(p => p.id === patientId);
  const filtered = search.trim()
    ? localPatients.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase()))
    : localPatients;

  async function handleAddPatient() {
    if (!newName.trim()) { setAddErr('Enter a name'); return; }
    setCreating(true); setAddErr('');
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: newName.trim(), phone: newPhone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not add patient');
      const created = { id: data.patient.id, display_name: newName.trim(), diagnosis: [] } as unknown as Patient;
      setLocalPatients(prev => [...prev, created].sort((a, b) => a.display_name.localeCompare(b.display_name)));
      setPatientId(created.id);
      setAdding(false); setDropdown(false);
      setNewName(''); setNewPhone(''); setError('');
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : 'Could not add patient');
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(false); setSearch(''); setAdding(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape for keyboard convenience.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Load the chosen day's existing appointments so we can flag double-booking
  // in real time as the doctor picks a time/duration (Teams-style busy check).
  useEffect(() => {
    if (!date) { setDayAppts([]); return; }
    let cancelled = false;
    setChecking(true);
    const from = new Date(`${date}T00:00:00`).toISOString();
    const to   = new Date(`${date}T23:59:59`).toISOString();
    fetch(`/api/appointments?from=${from}&to=${to}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: DayAppt[]) => { if (!cancelled) setDayAppts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setDayAppts([]); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [date]);

  // The currently-selected slot, and any existing appointment it collides with.
  const slotConflict = useMemo(() => {
    if (!date || !time) return null;
    const startMs = new Date(`${date}T${time}:00`).getTime();
    const endMs = startMs + Number(duration) * 60000;
    return dayAppts.find(a => {
      if (a.status === 'cancelled') return false;
      const aStart = new Date(a.scheduled_at).getTime();
      const aEnd = aStart + (a.duration_minutes || 50) * 60000;
      return startMs < aEnd && aStart < endMs;
    }) || null;
  }, [date, time, duration, dayAppts]);

  const otherDayAppts = useMemo(
    () => dayAppts.filter(a => a.status !== 'cancelled').sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [dayAppts],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError('Please select a patient'); return; }
    if (!date)      { setError('Please pick a date'); return; }
    if (slotConflict) { setError(`That slot overlaps ${slotConflict.patient?.display_name || 'an existing appointment'} at ${fmtTime(new Date(slotConflict.scheduled_at))}. Pick another time.`); return; }
    setLoading(true); setError('');
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId, scheduled_at,
          duration_minutes: Number(duration), modality, session_type: sessionType,
          goals: goals || undefined,
          meeting_url: modality === 'video' ? (meetingUrl.trim() || undefined) : undefined,
          recurrence: repeat === 'none' ? undefined : { frequency: repeat, count: Number(count) },
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        const c = data.conflict;
        throw new Error(c ? `That time overlaps ${c.conflictsWith} at ${fmtTime(new Date(c.conflictAt))}. Pick another slot.` : 'That time is already booked.');
      }
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to book');
      // Surface any partial-booking or Meet-creation notices before closing.
      const notices: string[] = [];
      if (data.skipped && data.skipped.length > 0) {
        notices.push(`Booked ${data.created} of ${data.total} sessions — ${data.skipped.length} skipped (already booked).`);
      }
      if (data.meet_warning) notices.push(data.meet_warning);
      if (notices.length > 0) {
        setError(notices.join(' '));
        setTimeout(onBooked, 2600);
        return;
      }
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book');
      setLoading(false);
    }
  }

  const minDate = new Date().toISOString().split('T')[0];
  const isExisting = !!preselectedPatientId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-foreground">Book Appointment</h2>
            {isExisting && selectedPatient && (
              <p className="text-xs text-muted-foreground mt-0.5">{selectedPatient.display_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Patient — only show selector when NOT preselected */}
          {!isExisting && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Patient <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => { setDropdown(o => !o); setSearch(''); }}
                  className="w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-left"
                >
                  <span className={selectedPatient ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedPatient ? selectedPatient.display_name : 'Select patient…'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {adding ? (
                      /* Inline add-patient form — no navigation */
                      <div className="p-3 space-y-2.5">
                        <p className="text-xs font-medium text-foreground">New patient</p>
                        <input autoFocus type="text" placeholder="Full name" value={newName}
                          onChange={e => { setNewName(e.target.value); setAddErr(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPatient(); } }}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        <input type="tel" placeholder="Phone (optional)" value={newPhone}
                          onChange={e => setNewPhone(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPatient(); } }}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        {addErr && <p className="text-xs text-red-500">{addErr}</p>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setAdding(false); setAddErr(''); }}
                            className="flex-1 rounded-lg border border-input py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Back
                          </button>
                          <button type="button" onClick={handleAddPatient} disabled={creating}
                            className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">
                            {creating ? <><Loader2 className="h-3 w-3 animate-spin" /> Adding…</> : 'Add & select'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                          <Search className="h-3.5 w-3.5 text-muted-foreground flex-none" />
                          <input autoFocus type="text" placeholder="Search patients…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                        </div>
                        <div className="max-h-44 overflow-y-auto">
                          {filtered.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-muted-foreground">No patients found</p>
                          ) : filtered.map(p => (
                            <button key={p.id} type="button"
                              onClick={() => { setPatientId(p.id); setDropdown(false); setSearch(''); setError(''); }}
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${patientId === p.id ? 'bg-violet-50 text-violet-700' : 'text-foreground'}`}>
                              <span className="font-medium">{p.display_name}</span>
                              {(p.diagnosis as string[])?.[0] && (
                                <span className="ml-2 text-xs text-muted-foreground">{(p.diagnosis as string[])[0]}</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-slate-100">
                          <button type="button"
                            onClick={() => { setAdding(true); setNewName(search); setAddErr(''); }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors">
                            <UserPlus className="h-3.5 w-3.5" /> Add new patient
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date + Time — always shown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" min={minDate} value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          {/* Real-time availability for the chosen slot */}
          {date && (
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              checking ? 'border-slate-200 bg-slate-50 text-muted-foreground'
              : slotConflict ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {checking ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…</>
              ) : slotConflict ? (
                <><AlertTriangle className="h-3.5 w-3.5 flex-none" /> Busy — overlaps {slotConflict.patient?.display_name || 'an appointment'} at {fmtTime(new Date(slotConflict.scheduled_at))}</>
              ) : (
                <><Check className="h-3.5 w-3.5 flex-none" /> This slot is free</>
              )}
            </div>
          )}

          {/* The day's existing schedule (context, Teams-style) */}
          {otherDayAppts.length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">{otherDayAppts.length} appointment{otherDayAppts.length > 1 ? 's' : ''} booked this day</p>
              <ul className="space-y-0.5">
                {otherDayAppts.slice(0, 4).map(a => {
                  const s = new Date(a.scheduled_at);
                  const e = new Date(s.getTime() + (a.duration_minutes || 50) * 60000);
                  return (
                    <li key={a.id} className="flex justify-between text-xs text-slate-600">
                      <span>{fmtTime(s)} – {fmtTime(e)}</span>
                      <span className="ml-2 truncate">{a.patient?.display_name || '—'}</span>
                    </li>
                  );
                })}
                {otherDayAppts.length > 4 && <li className="text-[11px] text-muted-foreground">+{otherDayAppts.length - 4} more</li>}
              </ul>
            </div>
          )}

          {/* Recurrence */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5"><Repeat className="h-3 w-3" /> Repeat</label>
            <div className="flex items-center gap-2">
              <select value={repeat} onChange={e => setRepeat(e.target.value as typeof repeat)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="none">Does not repeat</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
              {repeat !== 'none' && (
                <div className="flex items-center gap-1.5 flex-none">
                  <span className="text-xs text-muted-foreground">for</span>
                  <input type="number" min={2} max={52} value={count} onChange={e => setCount(e.target.value)}
                    className="w-14 rounded-lg border border-input bg-background px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <span className="text-xs text-muted-foreground">sessions</span>
                </div>
              )}
            </div>
            {repeat !== 'none' && (
              <p className="mt-1 text-[11px] text-muted-foreground">Creates {count} sessions at the same time. Any that clash with existing appointments are skipped.</p>
            )}
          </div>

          {/* Duration + Modality — only for new bookings without preselected patient */}
          {!isExisting && <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {['30','45','50','60','90'].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mode</label>
              <select value={modality} onChange={e => setModality(e.target.value as typeof modality)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="in_person">In person</option>
                <option value="video">Video</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>}

          {/* Online (video) sessions — Kith auto-creates a Google Meet */}
          {!isExisting && modality === 'video' && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
                <Video className="h-3.5 w-3.5" /> Kith will create a Google Meet automatically
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                A Meet link is generated on your connected Google account, shared with the patient, and the
                notetaker joins to record. You don&apos;t need to create one.
              </p>
              <input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                placeholder="…or paste your own Teams / Zoom / Meet link"
                className="mt-2 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          )}

          {/* Session type + goals — only for new (non-preselected) bookings */}
          {!isExisting && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Session type</label>
                <div className="flex gap-2">
                  {(['individual','couples','group','family'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setSessionType(t)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize transition-colors ${
                        sessionType === t ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-input text-muted-foreground hover:border-slate-300'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Session goals <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={2}
                  placeholder="What do you want to focus on this session?"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-input py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Booking…</> : 'Book appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
