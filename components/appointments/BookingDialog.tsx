'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Loader2, ChevronDown, Search, UserPlus, Check, AlertTriangle, Repeat, Video, Lock } from 'lucide-react';
import type { Patient } from '@/types';
import LockedFeatureButton from '@/components/upgrade/LockedFeatureButton';
import PhoneInput from '@/components/ui/PhoneInput';

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

// "HH:MM" -> "10:00 AM", for readable option labels while the underlying
// value stays in the 24h form the API expects.
function fmtTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Every 15-min slot in a day, optionally floored at minHHMM (today) so a
// dropdown of times literally cannot offer a past one — a real <select>
// enforces this everywhere, unlike a native <input type="time">'s picker UI.
function timeSlots(minHHMM?: string): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!minHHMM || t >= minHHMM) out.push(t);
    }
  }
  return out;
}

// Shared dark-theme input style — matches the rest of Kith's modals (session
// page consent/upgrade dialogs) rather than a plain light native form.
const FIELD = 'w-full rounded-lg border px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';
const FIELD_STYLE = { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' } as const;
// Native <option> popups are rendered by the OS/browser, not by our CSS — they
// ignore the dark theme and show a light background regardless. Force dark
// text on every option so it stays legible there instead of near-invisible
// white-on-white (as seen on kith.space).
const OPTION_STYLE = { color: '#1e1b3a', background: '#fff' } as const;

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
  const [modality, setModality]       = useState<'in_person'|'video'>('in_person');
  // Whether the doctor's plan unlocks online sessions — drives the lock on the
  // Video mode option. null while loading = assume unlocked (avoid a flash of
  // a disabled control before the real entitlement is known).
  const [onlineUnlocked, setOnlineUnlocked] = useState<boolean | null>(null);
  const [groupTypesUnlocked, setGroupTypesUnlocked] = useState<boolean | null>(null);
  const [autoMeetUnlocked, setAutoMeetUnlocked] = useState<boolean | null>(null);
  // Plan-unlocked isn't the same as actually wired up — without checking this
  // too, the dialog would promise "Kith will create a Meet" even when Google
  // Calendar was never successfully connected, and the doctor only finds out
  // later when no email arrives (exactly what happened before this check existed).
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/me/entitlements')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setOnlineUnlocked(d ? d.onlineSessions : true);
        setGroupTypesUnlocked(d ? d.groupSessionTypes : true);
        setAutoMeetUnlocked(d ? d.autoMeetAndInvite : false);
        setCalendarConnected(d ? !!d.googleCalendarConnected : false);
      })
      .catch(() => { setOnlineUnlocked(true); setGroupTypesUnlocked(true); setAutoMeetUnlocked(false); setCalendarConnected(false); });
  }, []);
  const onlineLocked = onlineUnlocked === false;
  const groupTypesLocked = groupTypesUnlocked === false;
  // Only relevant once the patient is known to need an auto-created Meet
  // (Ultra, video, no manually-pasted link) — captured just-in-time rather
  // than making email mandatory on every patient up front.
  const [patientEmailInput, setPatientEmailInput] = useState('');
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

  // Seed the just-in-time email capture whenever the selected patient changes.
  useEffect(() => {
    setPatientEmailInput((selectedPatient as unknown as { email?: string } | undefined)?.email || '');
  }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ultra auto-creates the Meet + auto-emails the patient — but only when
  // there's no manually-pasted link. That's the one path where a missing
  // patient email would silently mean nobody ever gets the join link, so
  // it's asked for here, just-in-time, rather than being mandatory on every
  // patient up front.
  const needsPatientEmail = modality === 'video' && autoMeetUnlocked === true
    && calendarConnected === true && !meetingUrl.trim() && !!selectedPatient && !patientEmailInput.trim();
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

  const minDate = new Date().toISOString().split('T')[0];
  const isToday = date === minDate;
  // "HH:MM" floor for the time picker when today is selected — recomputed each
  // render so it stays accurate as the clock moves while the dialog is open.
  const nowHHMM = new Date().toTimeString().slice(0, 5);
  const minTime = isToday ? nowHHMM : undefined;
  const availableTimeSlots = useMemo(() => timeSlots(minTime), [minTime]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError('Please select a patient'); return; }
    if (!date)      { setError('Please pick a date'); return; }
    if (isToday && time < nowHHMM) { setError('Pick a time that hasn\'t already passed.'); return; }
    if (slotConflict) { setError(`That slot overlaps ${slotConflict.patient?.display_name || 'an existing appointment'} at ${fmtTime(new Date(slotConflict.scheduled_at))}. Pick another time.`); return; }
    if (needsPatientEmail) { setError("This patient needs an email so Kith can send them the Meet link — add one above."); return; }
    setLoading(true); setError('');
    try {
      // Just-in-time: persist the email the doctor entered above, if the
      // patient didn't already have one, before booking creates the Meet.
      const existingEmail = (selectedPatient as unknown as { email?: string } | undefined)?.email;
      if (modality === 'video' && patientEmailInput.trim() && patientEmailInput.trim() !== existingEmail) {
        await fetch(`/api/patients/${patientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: patientEmailInput.trim() }),
        }).catch(() => {});
      }

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

  const isExisting = !!preselectedPatientId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        style={{ background: '#0f172a', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 70px rgba(139,92,246,0.35), 0 0 20px rgba(139,92,246,0.25), 0 40px 80px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-none" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="text-base font-semibold text-white">Book Appointment</h2>
            {isExisting && selectedPatient && (
              <p className="text-xs text-slate-400 mt-0.5">{selectedPatient.display_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body — action buttons live in a separate, always-visible
            footer below so a tall form (recurrence + video + goals) never
            hides "Book appointment" below the fold. */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* overflow-x-hidden is load-bearing, not decorative: per the CSS
              overflow spec, setting overflow-y to a non-'visible' value while
              overflow-x is left at its default 'visible' gets silently
              computed to overflow-x:auto by the browser — so any absolutely
              positioned child overflowing sideways (e.g. LockedFeatureButton's
              upgrade popup) was creating a stray horizontal scrollbar here. */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4">

          {/* Patient — only show selector when NOT preselected */}
          {!isExisting && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Patient <span className="text-red-400">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => { setDropdown(o => !o); setSearch(''); }}
                  className={`${FIELD} flex items-center justify-between text-left`} style={FIELD_STYLE}
                >
                  <span className={selectedPatient ? 'text-white' : 'text-slate-500'}>
                    {selectedPatient ? selectedPatient.display_name : 'Select patient…'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden"
                    style={{ background: '#1a1a3a', border: '1px solid rgba(255,255,255,0.12)' }}>
                    {adding ? (
                      /* Inline add-patient form — no navigation */
                      <div className="p-3 space-y-2.5">
                        <p className="text-xs font-medium text-white">New patient</p>
                        <input autoFocus type="text" placeholder="Full name" value={newName}
                          onChange={e => { setNewName(e.target.value); setAddErr(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPatient(); } }}
                          className={FIELD} style={FIELD_STYLE} />
                        <PhoneInput value={newPhone} onChange={setNewPhone} placeholder="Phone (optional)" />
                        {addErr && <p className="text-xs text-red-400">{addErr}</p>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setAdding(false); setAddErr(''); }}
                            className="flex-1 rounded-lg py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                            style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
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
                        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                          <Search className="h-3.5 w-3.5 text-slate-500 flex-none" />
                          <input autoFocus type="text" placeholder="Search patients…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
                        </div>
                        <div className="max-h-44 overflow-y-auto">
                          {filtered.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-slate-500">No patients found</p>
                          ) : filtered.map(p => (
                            <button key={p.id} type="button"
                              onClick={() => { setPatientId(p.id); setDropdown(false); setSearch(''); setError(''); }}
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${patientId === p.id ? 'bg-violet-500/15 text-violet-300' : 'text-white'}`}>
                              <span className="font-medium">{p.display_name}</span>
                              {(p.diagnosis as string[])?.[0] && (
                                <span className="ml-2 text-xs text-slate-500">{(p.diagnosis as string[])[0]}</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                          <button type="button"
                            onClick={() => { setAdding(true); setNewName(search); setAddErr(''); }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-violet-400 hover:bg-violet-500/10 transition-colors">
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Date <span className="text-red-400">*</span></label>
              <input type="date" min={minDate} value={date}
                onChange={e => {
                  setDate(e.target.value);
                  // Jumping onto today with an already-past time selected —
                  // bump it forward to the next available slot instead of
                  // silently allowing a past one.
                  if (e.target.value === minDate) {
                    const nextSlots = timeSlots(new Date().toTimeString().slice(0, 5));
                    if (!nextSlots.includes(time)) setTime(nextSlots[0] ?? time);
                  }
                }}
                className={FIELD} style={FIELD_STYLE} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Time</label>
              <select value={time} onChange={e => setTime(e.target.value)}
                className={FIELD} style={FIELD_STYLE}>
                {availableTimeSlots.map(t => (
                  <option key={t} value={t} style={OPTION_STYLE}>{fmtTimeLabel(t)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time availability for the chosen slot */}
          {date && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={
              checking ? { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }
              : slotConflict ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }
              : { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#34d399' }}>
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
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[11px] font-medium text-slate-400 mb-1">{otherDayAppts.length} appointment{otherDayAppts.length > 1 ? 's' : ''} booked this day</p>
              <ul className="space-y-0.5">
                {otherDayAppts.slice(0, 4).map(a => {
                  const s = new Date(a.scheduled_at);
                  const e = new Date(s.getTime() + (a.duration_minutes || 50) * 60000);
                  return (
                    <li key={a.id} className="flex justify-between text-xs text-slate-400">
                      <span>{fmtTime(s)} – {fmtTime(e)}</span>
                      <span className="ml-2 truncate">{a.patient?.display_name || '—'}</span>
                    </li>
                  );
                })}
                {otherDayAppts.length > 4 && <li className="text-[11px] text-slate-500">+{otherDayAppts.length - 4} more</li>}
              </ul>
            </div>
          )}

          {/* Recurrence */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5"><Repeat className="h-3 w-3" /> Repeat</label>
            <div className="flex items-center gap-2">
              <select value={repeat} onChange={e => setRepeat(e.target.value as typeof repeat)}
                className={`flex-1 ${FIELD}`} style={FIELD_STYLE}>
                <option value="none" style={OPTION_STYLE}>Does not repeat</option>
                <option value="weekly" style={OPTION_STYLE}>Weekly</option>
                <option value="biweekly" style={OPTION_STYLE}>Every 2 weeks</option>
                <option value="monthly" style={OPTION_STYLE}>Monthly</option>
              </select>
              {repeat !== 'none' && (
                <div className="flex items-center gap-1.5 flex-none">
                  <span className="text-xs text-slate-400">for</span>
                  <input type="number" min={2} max={52} value={count} onChange={e => setCount(e.target.value)}
                    className="w-14 rounded-lg border px-2 py-2 text-sm text-center text-white focus:outline-none focus:ring-2 focus:ring-violet-500" style={FIELD_STYLE} />
                  <span className="text-xs text-slate-400">sessions</span>
                </div>
              )}
            </div>
            {repeat !== 'none' && (
              <p className="mt-1 text-[11px] text-slate-500">Creates {count} sessions at the same time. Any that clash with existing appointments are skipped.</p>
            )}
          </div>

          {/* Duration + Modality — available for existing patients too, not just new bookings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className={FIELD} style={FIELD_STYLE}>
                {['30','45','50','60','90'].map(d => <option key={d} value={d} style={OPTION_STYLE}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mode</label>
              <select value={modality} onChange={e => setModality(e.target.value as typeof modality)}
                className={FIELD} style={FIELD_STYLE}>
                <option value="in_person" style={OPTION_STYLE}>In person</option>
                <option value="video" disabled={onlineLocked} style={OPTION_STYLE}>Online{onlineLocked ? ' 🔒 Upgrade to unlock' : ''}</option>
              </select>
              {onlineLocked && (
                <LockedFeatureButton requiredPlan="pro" featureLabel="Online sessions" className="mt-1">
                  <span className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">
                    <Lock className="h-3 w-3" /> Online sessions need Pro or higher
                  </span>
                </LockedFeatureButton>
              )}
            </div>
          </div>

          {/* Online (video) sessions — Kith auto-creates a Google Meet on Ultra,
              but only if Calendar is actually connected (plan-unlocked and
              actually wired up are two different things — see calendarConnected). */}
          {modality === 'video' && !onlineLocked && (
            <div className="rounded-lg p-3" style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)' }}>
              {autoMeetUnlocked && calendarConnected === false ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <Video className="h-3.5 w-3.5" /> Connect Google Calendar to auto-create the Meet
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                    Your plan supports it, but Google Calendar isn&apos;t connected yet — Kith can&apos;t generate or
                    email a Meet link without it. <a href="/settings" className="text-violet-400 hover:text-violet-300 underline">Connect it in Settings</a>, or
                    paste your own link below for this booking.
                  </p>
                </>
              ) : autoMeetUnlocked ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                    <Video className="h-3.5 w-3.5" /> Kith will create a Google Meet automatically
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                    A Meet link is generated on your connected Google account, emailed to the patient, and the
                    notetaker joins to record. You don&apos;t need to create one.
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                  <Video className="h-3.5 w-3.5" /> Paste your meeting link
                </div>
              )}
              <input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                placeholder={autoMeetUnlocked ? '…or paste your own Teams / Zoom / Meet link' : 'Teams / Zoom / Meet link'}
                className={`mt-2 ${FIELD}`} style={FIELD_STYLE} />
              {!autoMeetUnlocked && (
                <LockedFeatureButton requiredPlan="ultra" featureLabel="Automatic Meet creation + patient email" className="mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">
                    <Lock className="h-3 w-3" /> Upgrade to Ultra to have Kith create and send the link automatically
                  </span>
                </LockedFeatureButton>
              )}
              {autoMeetUnlocked && calendarConnected === true && !meetingUrl.trim() && (
                <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Patient email <span className="text-red-400">*</span> <span className="text-slate-500">— needed to send the Meet link</span>
                  </label>
                  <input type="email" value={patientEmailInput} onChange={e => setPatientEmailInput(e.target.value)}
                    placeholder="patient@email.com"
                    className={FIELD} style={FIELD_STYLE} />
                </div>
              )}
            </div>
          )}

          {/* Session type + goals — available for existing patients too */}
          <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Session type</label>
                <div className="flex gap-2">
                  {(['individual','couples','group','family'] as const).map(t => {
                    const locked = t !== 'individual' && groupTypesLocked;
                    return (
                      <button key={t} type="button" disabled={locked}
                        onClick={() => setSessionType(t)}
                        className="flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors"
                        style={
                          locked ? { border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.5)', cursor: 'not-allowed' }
                          : sessionType === t ? { border: '1px solid rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }
                          : { border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }
                        }>
                        {t}{locked ? ' 🔒' : ''}
                      </button>
                    );
                  })}
                </div>
                {groupTypesLocked && (
                  <LockedFeatureButton requiredPlan="pro" featureLabel="Couples, family & group session types" className="mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">
                      <Lock className="h-3 w-3" /> Couples, family & group need Pro or higher
                    </span>
                  </LockedFeatureButton>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Session goals <span className="text-slate-500">(optional)</span>
                </label>
                <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={2}
                  placeholder="What do you want to focus on this session?"
                  className={`${FIELD} resize-none`} style={FIELD_STYLE} />
              </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Footer — outside the scrollable area so it's always reachable */}
          <div className="flex gap-2 p-5 pt-3 border-t flex-none" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Booking…</> : 'Book appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
