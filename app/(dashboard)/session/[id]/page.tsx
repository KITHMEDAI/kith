'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRealTimeTranscript } from '@/hooks/useRealTimeTranscript';
import { formatDuration, getInitials } from '@/lib/utils';
import {
  ArrowLeft, Mic, Square, Wifi, WifiOff, Clock,
  Lightbulb, FileText, RefreshCw, Calendar, Video, Loader2, AlignLeft, Sparkles,
} from 'lucide-react';
import Nebula from '@/components/session/Nebula';
import type { Appointment, Patient } from '@/types';
import type { SpeakerMap } from '@/app/api/identify-speakers/route';

// ─── Pulsing waveform bar ─────────────────────────────────────────────────────
function WaveBar({ active }: { active: boolean }) {
  if (!active) return (
    <div className="flex items-center gap-1 h-6">
      {[3,5,3,5,3].map((h, i) => (
        <div key={i} style={{ width: 3, height: h, borderRadius: 99, background: '#1e293b' }} />
      ))}
    </div>
  );
  return (
    <div className="flex items-center gap-1 h-6">
      {[4,7,5,9,6,8,4,7,5].map((h, i) => (
        <div key={i} style={{
          width: 3, height: h * 2, borderRadius: 99,
          background: '#3b82f6',
          animation: `wave ${0.6 + (i % 3) * 0.2}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.06}s`,
        }} />
      ))}
      <style>{`@keyframes wave{from{transform:scaleY(.3);opacity:.5}to{transform:scaleY(1);opacity:1}}`}</style>
    </div>
  );
}

// ─── Recurring booking modal ──────────────────────────────────────────────────
function RecurringModal({ patient, onClose, onBooked }: {
  patient: Patient;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [mode, setMode]         = useState<'skip'|'once'|'recurring'>('once');
  const [date, setDate]         = useState('');
  const [time, setTime]         = useState('');
  const [recur, setRecur]       = useState<'weekly'|'biweekly'|'monthly'>('weekly');
  const [recurCount, setRecurCount] = useState('4');
  const [loading, setLoading]   = useState(false);
  const minDate = new Date().toISOString().split('T')[0];

  const handleBook = async () => {
    if (mode === 'skip') { onClose(); return; }
    if (!date || !time) return;
    setLoading(true);
    try {
      const sessions = [];
      const base = new Date(`${date}T${time}`);
      const count = mode === 'recurring' ? Number(recurCount) : 1;
      const gapDays = recur === 'weekly' ? 7 : recur === 'biweekly' ? 14 : 30;

      for (let i = 0; i < count; i++) {
        const d = new Date(base.getTime() + i * gapDays * 86400000);
        sessions.push({
          scheduled_at: d.toISOString(),
          ends_at: new Date(d.getTime() + 50 * 60000).toISOString(),
          duration_minutes: 50,
          modality: 'in_person',
          session_type: 'individual',
        });
      }

      await Promise.all(sessions.map(s =>
        fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: patient.id, ...s }),
        })
      ));
      onBooked();
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-6 space-y-5" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="text-center space-y-1">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Calendar className="h-5 w-5 text-violet-400" />
          </div>
          <h3 className="text-base font-semibold text-white">Book next session</h3>
          <p className="text-xs text-slate-500">for {patient.display_name}</p>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {([
            { v: 'skip',      label: 'Skip' },
            { v: 'once',      label: 'Once' },
            { v: 'recurring', label: 'Recurring' },
          ] as const).map(m => (
            <button key={m.v} type="button" onClick={() => setMode(m.v)}
              className="rounded-lg py-2 text-xs font-medium transition-colors"
              style={{
                background: mode === m.v ? 'rgba(139,92,246,0.25)' : 'transparent',
                color: mode === m.v ? '#c4b5fd' : '#64748b',
                border: mode === m.v ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {mode !== 'skip' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Date</label>
                <input type="date" min={minDate} value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white bg-transparent focus:outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white bg-transparent focus:outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>
            </div>

            {mode === 'recurring' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Repeat every</label>
                  <div className="flex gap-2">
                    {([
                      { v: 'weekly',   label: 'Weekly' },
                      { v: 'biweekly', label: 'Biweekly' },
                      { v: 'monthly',  label: 'Monthly' },
                    ] as const).map(r => (
                      <button key={r.v} type="button" onClick={() => setRecur(r.v)}
                        className="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: recur === r.v ? 'rgba(139,92,246,0.2)' : 'transparent',
                          color: recur === r.v ? '#c4b5fd' : '#64748b',
                          border: `1px solid ${recur === r.v ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Number of sessions</label>
                  <select value={recurCount} onChange={e => setRecurCount(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white bg-transparent focus:outline-none"
                    style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#0f172a' }}>
                    {['2','3','4','6','8','12'].map(n => <option key={n} value={n}>{n} sessions</option>)}
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm text-slate-500 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            Cancel
          </button>
          <button onClick={handleBook} disabled={loading || (mode !== 'skip' && (!date || !time))}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            {loading ? 'Booking…' : mode === 'skip' ? 'Done' : mode === 'recurring' ? `Book ${recurCount} sessions` : 'Book session'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Extra Deepgram keyterms specific to THIS patient — their own diagnosis
// labels plus named medications from free-text `medications` (filtering out
// dosage numbers/units, which aren't real vocabulary). Boosts recognition of
// drug names that aren't in the static clinical keyterm list, on top of it.
function patientKeyterms(patient: Patient | null): string[] {
  if (!patient) return [];
  const diagnosisTerms = patient.diagnosis || [];
  const medTerms = (patient.medications || '')
    .split(/[,\n]/)
    .flatMap(part => part.trim().split(/\s+/))
    .filter(w => w.length > 3 && !/^\d+$/.test(w) && !/^\d+(mg|ml|mcg|g)$/i.test(w));
  return [...diagnosisTerms, ...medTerms];
}

// ─── Main page ────────────────────────────────────────────────────────────────
const LIVE_UPDATE_MS = 2 * 60 * 1000; // 2 minutes

export default function LiveSessionPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = createClient();

  const { segments, partialText, isConnected, connectionStatus, connect, disconnect } = useRealTimeTranscript();

  // Simple duration timer — driven by isConnected, no separate MediaRecorder needed
  const [duration, setDuration]   = useState(0);
  const durationRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecording               = isConnected;

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const liveTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentsRef      = useRef(segments);
  segmentsRef.current = segments;

  const [appointment, setAppointment]     = useState<Appointment | null>(null);
  const [patient, setPatient]             = useState<Patient | null>(null);
  const [sessionId, setSessionId]         = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'new'|'active'|'paused'|'ended'>('new');
  const [manualNotes, setManualNotes]     = useState('');
  const [liveNotes, setLiveNotes]         = useState<Record<string, unknown> | null>(null);
  const [suggestions, setSuggestions]     = useState<{
    questions?: string[];
    treatment?: string[];
    mindfulness?: string[];
  } | null>(null);
  const [isUpdating, setIsUpdating]       = useState(false);
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);
  const [speakerMap, setSpeakerMap]       = useState<SpeakerMap>({});
  const [identifying, setIdentifying]    = useState(false);
  const lastIdentifiedCount              = useRef(0);
  const [showEndModal, setShowEndModal]   = useState(false);
  const [upgradeModal, setUpgradeModal]   = useState<string | null>(null); // holds the message when shown
  const [isEnding, setIsEnding]           = useState(false);
  const [endError, setEndError]           = useState<string | null>(null);
  // showRecurring removed — session ends go directly to patient profile
  const [activeTab, setActiveTab]         = useState<'transcript'|'suggestions'|'notes'>('transcript');
  const [botDispatched, setBotDispatched] = useState(false);
  const [botError, setBotError]           = useState<string | null>(null);
  // Default view during recording is the ambient "listening" visual + live
  // caption, not a scrolling list of bubbles. The doctor can flip to the full
  // history any time — nothing is lost, just not the default.
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [durationCapMinutes, setDurationCapMinutes] = useState<number | null>(null);
  const autoEndedRef = useRef(false);

  // Online sessions (Teams/Meet) are recorded by a Recall bot, not the local mic.
  const isOnline = appointment?.modality === 'video';

  useEffect(() => {
    fetch('/api/me/entitlements')
      .then(r => r.json())
      .then(d => { if (typeof d.sessionDurationCapMinutes === 'number') setDurationCapMinutes(d.sessionDurationCapMinutes); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      const { data: appt } = await supabase
        .from('appointments')
        .select('*, patient:patients(*)')
        .eq('id', params.id)
        .single();
      if (appt) {
        setAppointment(appt as Appointment);
        setPatient(appt.patient as Patient);
        if ((appt as Record<string, unknown>).status === 'in_session') {
          const { data: existing } = await supabase
            .from('sessions').select('id,status')
            .eq('appointment_id', params.id)
            .in('status', ['active','processing'])
            .maybeSingle();
          if (existing) { setSessionId(existing.id); setSessionStatus('paused'); }
        }
      }
    }
    load();
  }, [params.id]); // eslint-disable-line

  // Duration timer — starts when connected, stops when disconnected
  useEffect(() => {
    if (isConnected) {
      setDuration(0);
      durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [isConnected]);

  // Elapsed-time tracker covering BOTH modalities (the in-person `duration`
  // timer above only ticks while the local mic is connected — online sessions
  // never call connect(), so they need their own clock keyed off bot dispatch)
  // so the per-session duration cap (plan-dependent) can be enforced either way.
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const active = isOnline ? botDispatched && sessionStatus !== 'ended' : isConnected;
    if (active) {
      if (!elapsedRef.current) elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    } else {
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
      setElapsedSec(0);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [isOnline, botDispatched, sessionStatus, isConnected]);

  // ── Live speaker identification ─────────────────────────────────────────────
  // Runs after every 10 new segments while recording. Uses Claude Haiku to map
  // "Speaker A" → "Dr. Mehta (Therapist)", "Speaker B" → "Rohan (Patient)" etc.
  useEffect(() => {
    if (!isRecording) return;
    if (segments.length < 5) return;
    if (segments.length - lastIdentifiedCount.current < 10 && lastIdentifiedCount.current > 0) return;

    lastIdentifiedCount.current = segments.length;
    setIdentifying(true);

    fetch('/api/identify-speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segments: segments.slice(0, 40), // first 40 is enough context
        patientName: patient?.display_name || '',
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.speakers) setSpeakerMap(d.speakers); })
      .catch(() => {})
      .finally(() => setIdentifying(false));
  }, [segments.length, isRecording, patient]); // eslint-disable-line

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, partialText]);

  const fetchLiveUpdate = useCallback(async () => {
    if (!patient || segmentsRef.current.length < 3) return;
    setIsUpdating(true);
    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: segmentsRef.current,
          patientId: patient.id,
          sessionNumber: 1,
          manualNotes,
          liveOnly: true,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.notes) {
          setLiveNotes(d.notes);
          setSuggestions({
            questions:    d.notes.suggested_questions || [],
            treatment:    d.notes.treatment_suggestions || [],
            mindfulness:  d.notes.mindfulness_suggestions || [],
          });
          setLastUpdated(new Date());
        }
      }
    } catch { /* silent */ }
    finally { setIsUpdating(false); }
  }, [patient, manualNotes]);

  useEffect(() => {
    if (isRecording) {
      liveTimerRef.current = setInterval(fetchLiveUpdate, LIVE_UPDATE_MS);
    } else {
      if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
    }
    return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [isRecording, fetchLiveUpdate]);

  const handleStart = async () => {
    if (!patient) return;
    try {
      const res  = await fetch('/api/sessions/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: params.id, patientId: patient.id }) });
      const data = await res.json();
      if (res.status === 402) { setUpgradeModal(data.error || 'Upgrade your plan to continue.'); return; }
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.session.id);
      setSessionStatus('active');
      await connect(data.token, patientKeyterms(patient));
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to start'); }
  };

  // Online: send a Recall notetaker bot to the meeting instead of using the mic.
  const handleStartOnline = async () => {
    setBotError(null);
    try {
      const res = await fetch('/api/sessions/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: params.id }),
      });
      const data = await res.json();
      if (res.status === 402) { setUpgradeModal(data.error || 'Upgrade your plan to continue.'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed to send notetaker');
      setSessionId(data.session.id);
      setSessionStatus('active');
      setBotDispatched(true);
    } catch (err) {
      setBotError(err instanceof Error ? err.message : 'Failed to send notetaker');
    }
  };

  // Online sessions auto-start the recorder: as soon as the video session page
  // loads, dispatch the notetaker bot automatically — no manual "send" step.
  // Fires exactly once (guarded by the ref), and only for a fresh session.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!isOnline || !appointment) return;
    if (autoStartedRef.current) return;
    if (sessionStatus !== 'new' || botDispatched) return;
    autoStartedRef.current = true;
    handleStartOnline();
  }, [isOnline, appointment, sessionStatus, botDispatched]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist the doctor's private notes (debounced) so they survive even when an
  // online session finalises via the Recall webhook (the doctor never clicks
  // "End"), and so they're fed into the generated SOAP notes.
  useEffect(() => {
    if (!sessionId || !manualNotes.trim()) return;
    const t = setTimeout(() => {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_notes: manualNotes }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [manualNotes, sessionId]);

  const handleResume = async () => {
    if (!patient || !sessionId) return;
    try {
      const res  = await fetch('/api/sessions/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionStatus('active');
      await connect(data.token, patientKeyterms(patient));
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to resume'); }
  };

  const handleEnd = async () => {
    if (!sessionId) {
      setEndError('No session ID — session may not have started. Try refreshing.');
      return;
    }
    setIsEnding(true);
    setShowEndModal(false);
    try {
      // Online: pull the Recall bot out of the call and finalise via its
      // transcript (the local mic was never used).
      if (isOnline) {
        const res = await fetch('/api/sessions/bot/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
        window.location.href = `/patients/${data.patientId || patient!.id}`;
        return;
      }

      // In-person: stop the mic, save the captured transcript.
      disconnect();
      setSessionStatus('ended');
      // Fast call: saves transcript, marks processing, triggers background note gen
      // Returns in ~200 ms — we navigate immediately after
      const res = await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, transcript: segmentsRef.current, manualNotes, speakerMap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      // Navigate immediately — notes will appear on patient profile via polling
      window.location.href = `/patients/${data.patientId || patient!.id}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to end session';
      setEndError(msg);
      setIsEnding(false);
    }
  };

  // Auto-end once the plan's per-session duration cap is hit — fires once
  // (guarded by the ref) regardless of modality.
  useEffect(() => {
    if (!durationCapMinutes || autoEndedRef.current) return;
    if (sessionStatus !== 'active' && sessionStatus !== 'paused') return;
    if (elapsedSec >= durationCapMinutes * 60) {
      autoEndedRef.current = true;
      handleEnd();
    }
  }, [elapsedSec, durationCapMinutes, sessionStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const soapNote = liveNotes?.soap_note as Record<string,string> | undefined;
  const keyPoints = liveNotes?.key_points as string[] | undefined;
  // Ambient view is the default while there's something to show — the full
  // bubble-list view is opt-in via the header toggle.
  const ambientMode = !isOnline && !showFullTranscript && (isRecording || segments.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080d14', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft className="h-4 w-4" />
          </button>

          {patient && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold flex-none"
                style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', color: '#bfdbfe' }}>
                {getInitials(patient.display_name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{patient.display_name}</p>
                <p className="text-xs text-slate-500">
                  {patient.diagnosis?.slice(0, 2).join(' · ')}
                  {(patient as unknown as Record<string,unknown>).therapy_modality ? ` · ${(patient as unknown as Record<string,unknown>).therapy_modality}` : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          {isRecording && (
            <span className={`flex items-center gap-1.5 text-xs font-medium ${
              connectionStatus === 'connected' ? 'text-emerald-400' :
              connectionStatus === 'reconnecting' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {connectionStatus === 'connected' ? <><Wifi className="h-3.5 w-3.5" /> Live</> :
               connectionStatus === 'reconnecting' ? <><WifiOff className="h-3.5 w-3.5" /> Reconnecting…</> :
               <><WifiOff className="h-3.5 w-3.5" /> Disconnected</>}
            </span>
          )}

          {/* Timer */}
          {isRecording && (
            <div className="flex items-center gap-2 font-mono text-sm font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-red-500" style={{ animation: 'pulse-rec 1.2s ease-in-out infinite' }} />
              {formatDuration(duration)}
            </div>
          )}
          {/* Plan duration-cap warning — last 5 min */}
          {durationCapMinutes && (sessionStatus === 'active' || sessionStatus === 'paused') &&
            elapsedSec >= (durationCapMinutes - 5) * 60 && elapsedSec < durationCapMinutes * 60 && (
            <span className="text-xs font-medium text-amber-400">
              Ends in {Math.max(0, durationCapMinutes * 60 - elapsedSec) / 60 | 0}m — plan limit {durationCapMinutes} min
            </span>
          )}

          {/* Action buttons */}
          {sessionStatus === 'new' && !isRecording && !isOnline && (
            <button onClick={handleStart}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 0 20px rgba(59,130,246,0.25)' }}>
              <Mic className="h-4 w-4" /> Start session
            </button>
          )}
          {/* Online: open the Meet (host) while the recorder starts automatically */}
          {isOnline && !botDispatched && (appointment as { meeting_url?: string } | null)?.meeting_url && (
            <a href={(appointment as { meeting_url?: string }).meeting_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 0 20px rgba(59,130,246,0.25)' }}>
              <Video className="h-4 w-4" /> Open Meet
            </a>
          )}
          {isOnline && sessionStatus === 'new' && !botDispatched && !botError && (
            <span className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-300"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Starting recorder…
            </span>
          )}
          {isOnline && botError && (
            <button onClick={() => { setBotError(null); handleStartOnline(); }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <RefreshCw className="h-4 w-4" /> Retry recorder
            </button>
          )}
          {/* Online: manually end the session (stops the bot + generates notes).
              Shown for a freshly-dispatched bot AND for a reloaded session that's
              still stuck "in session". */}
          {isOnline && (botDispatched || sessionStatus === 'paused') && (
            <button onClick={() => setShowEndModal(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <Square className="h-3.5 w-3.5" /> End session
            </button>
          )}
          {sessionStatus === 'paused' && !isRecording && !isOnline && (
            <button onClick={handleResume}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Mic className="h-4 w-4" /> Resume
            </button>
          )}
          {isRecording && (
            <button onClick={() => setShowEndModal(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <Square className="h-3.5 w-3.5" /> End session
            </button>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {/* Side-by-side on desktop; stacked (transcript above AI panel) on mobile,
          where a fixed 50/50 split would be too cramped to use. */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-visible">

        {/* LEFT — Live transcript ─────────────────────────────────────────── */}
        <div className="flex flex-col w-full md:w-1/2 min-h-[50vh] md:min-h-0" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Transcript header */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <WaveBar active={isRecording} />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {isRecording ? 'Live transcript' : 'Transcript'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">{segments.length} segments</span>
              {!isOnline && segments.length > 0 && (
                <button onClick={() => setShowFullTranscript(s => !s)}
                  title={showFullTranscript ? 'Show ambient view' : 'Show full transcript'}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/8 transition-colors">
                  {showFullTranscript ? <Sparkles className="h-3 w-3" /> : <AlignLeft className="h-3 w-3" />}
                  {showFullTranscript ? 'Ambient view' : 'Full transcript'}
                </button>
              )}
            </div>
          </div>

          {/* Transcript area — ambient view by default while recording, full
              scrollable history only when toggled, online-bot status otherwise. */}
          <div className={ambientMode ? 'flex-1 relative overflow-hidden' : 'flex-1 overflow-y-auto px-5 py-4 space-y-3'}>
            {isOnline ? (
              <div className="flex h-full items-center justify-center flex-col gap-3 px-6 text-center">
                <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <Calendar className="h-5 w-5 text-blue-500/60" />
                </div>
                {botError ? (
                  <p className="text-sm text-red-400 leading-relaxed max-w-sm">{botError}</p>
                ) : botDispatched ? (
                  <>
                    <p className="text-sm font-semibold text-slate-300">Kith Notetaker is joining your call</p>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                      Keep running your Teams/Meet call as usual. When it ends, the bot leaves and the
                      transcript + SOAP notes appear on {patient?.display_name || 'the patient'}&apos;s profile automatically.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-300">Starting the recorder…</p>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                      The Kith Notetaker is being sent to your meeting automatically. Just admit
                      &ldquo;Kith Notetaker&rdquo; when it knocks — no other action needed.
                    </p>
                  </>
                )}
              </div>
            ) : showFullTranscript ? (
              <>
                {/* Raw transcript text only. Speaker identification (who is the
                    clinician / patient) runs in the backend; labels are
                    intentionally hidden in the UI for now to ease testing. */}
                {segments.map((seg, i) => (
                  <p key={i} className="text-sm text-slate-200 leading-relaxed rounded-xl px-4 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {seg.text}
                  </p>
                ))}
                {partialText && (
                  <p className="text-sm text-slate-500 leading-relaxed italic px-4 py-2">{partialText}</p>
                )}
                <div ref={transcriptEndRef} />
              </>
            ) : ambientMode ? (
              <>
                {/* Persistent ambient "listening" visual — brightens while active
                    speech is coming in, calm breathing glow otherwise. Always
                    present for the whole recording, not a passing strip. */}
                <Nebula active={!!partialText} />
                {/* Bottom caption — Gemini-Live style live readout of what's being captured */}
                <div className="absolute inset-x-0 bottom-0 px-6 pb-6 pt-12 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.5) 60%, transparent)' }}>
                  <p key={partialText || segments[segments.length - 1]?.text || 'idle'}
                    className="text-center text-base sm:text-lg leading-relaxed max-w-2xl mx-auto"
                    style={{
                      minHeight: '1.6em',
                      color: partialText ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
                      fontStyle: partialText ? 'normal' : 'italic',
                      animation: 'caption-fade-in 0.35s ease-out',
                    }}>
                    {partialText || segments[segments.length - 1]?.text || 'Listening for speech…'}
                  </p>
                </div>
                <style>{`@keyframes caption-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              </>
            ) : (
              <div className="flex h-full items-center justify-center flex-col gap-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <Mic className="h-5 w-5 text-blue-500/50" />
                </div>
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                  {sessionStatus === 'new' ? 'Press Start session to begin' : 'Transcript will appear here'}
                </p>
              </div>
            )}
          </div>

          {/* Doctor's private notes */}
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
              Private notes
            </label>
            <textarea
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              placeholder="Clinical observations, follow-ups, concerns…"
              rows={3}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-700 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
        </div>

        {/* RIGHT — AI panel ───────────────────────────────────────────────── */}
        <div className="flex flex-col w-full md:w-1/2 min-h-[50vh] md:min-h-0">

          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {([
              { id: 'transcript', icon: Clock,       label: 'Overview' },
              { id: 'suggestions', icon: Lightbulb,  label: 'Suggestions' },
              { id: 'notes',       icon: FileText,    label: 'AI Notes' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-medium transition-colors"
                style={{
                  color: activeTab === id ? '#fff' : '#475569',
                  borderBottom: activeTab === id ? '2px solid #3b82f6' : '2px solid transparent',
                }}>
                <Icon className="h-3.5 w-3.5" />
                {label}
                {id === 'suggestions' && (suggestions?.questions?.length ?? 0) > 0 && (
                  <span className="ml-1 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: '#2563eb', color: '#fff' }}>
                    {(suggestions?.questions?.length ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Refresh button + last updated */}
          <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-[10px] text-slate-700">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'Auto-updates every 2 min'}
            </span>
            <button onClick={fetchLiveUpdate} disabled={isUpdating || segments.length < 3}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-blue-400 disabled:opacity-30 transition-colors">
              <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin text-blue-400' : ''}`} />
              {isUpdating ? 'Updating…' : 'Refresh now'}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* ── Overview tab ── */}
            {activeTab === 'transcript' && (
              <>
                {patient && (
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Patient</p>
                    <div className="space-y-2">
                      {[
                        ['Name', patient.display_name],
                        patient.diagnosis?.length ? ['Diagnosis', patient.diagnosis.join(', ')] : null,
                        (patient as unknown as Record<string,unknown>).therapy_modality ? ['Modality', String((patient as unknown as Record<string,unknown>).therapy_modality)] : null,
                      ].filter((x): x is string[] => !!x).map(([l, v]) => (
                        <div key={l as string} className="flex justify-between gap-4">
                          <span className="text-xs text-slate-600 shrink-0">{l}</span>
                          <span className="text-xs text-slate-300 text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">This session</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-600" />
                    {appointment ? new Date(appointment.scheduled_at).toLocaleTimeString('en-IN', { hour:'numeric', minute:'2-digit', hour12:true }) : '—'}
                    {appointment ? ` · ${appointment.duration_minutes} min` : ''}
                  </div>
                  {segments.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mic className="h-3.5 w-3.5 text-slate-600" />
                      {segments.length} utterances · {Array.from(new Set(segments.map(s => s.speaker))).join(', ')}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Suggestions tab ── */}
            {activeTab === 'suggestions' && (
              <>
                {!suggestions && !isUpdating && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                    <Lightbulb className="h-8 w-8 text-slate-700" />
                    <p className="text-sm text-slate-600">Suggestions appear after a few minutes of conversation</p>
                    <button onClick={fetchLiveUpdate} disabled={segments.length < 3}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40">
                      Generate now →
                    </button>
                  </div>
                )}
                {isUpdating && !suggestions && (
                  <div className="flex items-center gap-2.5 py-6 text-sm text-slate-500">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" /> Analysing conversation…
                  </div>
                )}

                {suggestions && (
                  <>

                    {/* Suggested questions */}
                    {(suggestions.questions?.length ?? 0) > 0 && (
                      <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Questions to ask</p>
                        {suggestions.questions!.map((q, i) => (
                          <p key={i} className="text-sm text-slate-300 flex gap-2.5 leading-relaxed">
                            <span className="text-blue-500 font-bold shrink-0 mt-0.5">{i + 1}.</span> {q}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Treatment suggestions */}
                    {(suggestions.treatment?.length ?? 0) > 0 && (
                      <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Treatment &amp; medication notes</p>
                        {suggestions.treatment!.map((t, i) => (
                          <p key={i} className="text-sm text-slate-300 flex gap-2 leading-relaxed">
                            <span className="text-emerald-500 mt-0.5 shrink-0">→</span> {t}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Mindfulness / exercises */}
                    {(suggestions.mindfulness?.length ?? 0) > 0 && (
                      <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Exercises &amp; mindfulness</p>
                        {suggestions.mindfulness!.map((m, i) => (
                          <p key={i} className="text-sm text-slate-300 flex gap-2 leading-relaxed">
                            <span className="text-violet-500 mt-0.5 shrink-0">✦</span> {m}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── Notes tab ── */}
            {activeTab === 'notes' && (
              <>
                {!liveNotes && !isUpdating && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                    <FileText className="h-8 w-8 text-slate-700" />
                    <p className="text-sm text-slate-600">SOAP notes appear as the session progresses</p>
                    <button onClick={fetchLiveUpdate} disabled={segments.length < 3}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40">
                      Generate now →
                    </button>
                  </div>
                )}
                {isUpdating && !liveNotes && (
                  <div className="flex items-center gap-2.5 py-6 text-sm text-slate-500">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" /> Generating notes…
                  </div>
                )}
                {liveNotes && (
                  <>
                    {keyPoints?.length ? (
                      <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Key points</p>
                        {keyPoints.map((pt, i) => (
                          <p key={i} className="text-sm text-slate-300 flex gap-2.5 leading-relaxed">
                            <span className="text-blue-500 mt-0.5 shrink-0">·</span> {pt}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {soapNote && (
                      <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">SOAP Note</p>
                        {(['subjective','objective','assessment','plan'] as const).map(f => (
                          <div key={f}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">{f}</p>
                            <p className="text-sm text-slate-400 leading-relaxed">{soapNote[f]}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-center text-xs text-slate-700 pt-2">
                      Full notes saved when you end the session
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 text-center text-[10px] text-slate-700" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            🔒 Audio deleted after processing · AES-256 · HIPAA & DPDP compliant
          </div>
        </div>
      </div>

      {/* ── End modal ────────────────────────────────────────────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 space-y-5"
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Square className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-white">End this session?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Kith will generate full SOAP notes, suggestions, and save everything to {patient?.display_name}'s profile.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEndModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Continue
              </button>
              <button onClick={handleEnd} disabled={isEnding}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                End & generate notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade required (plan cap / feature lock hit) ───────────────────── */}
      {upgradeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 space-y-5 text-center"
            style={{ background: '#0f172a', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">Upgrade to keep going</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{upgradeModal}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUpgradeModal(null)}
                className="flex-1 rounded-xl py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Not now
              </button>
              <a href="/settings/billing"
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white text-center"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                View plans
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Ending overlay (fast — just saving transcript) ───────────────────── */}
      {isEnding && !endError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <RefreshCw className="h-6 w-6 text-violet-400 animate-spin" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Saving session…</p>
              <p className="text-sm text-slate-500 mt-1">{segments.length} transcript segments · notes will generate in background</p>
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              {['SOAP note', 'Suggestions'].map((label) => (
                <span key={label} className="text-[10px] text-slate-600 px-2 py-0.5 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {endError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 space-y-4 text-center" style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)' }}>
            <p className="text-base font-semibold text-red-400">Note generation failed</p>
            <p className="text-sm text-slate-500 font-mono break-all">{endError}</p>
            <button onClick={() => { setEndError(null); window.location.href = `/notes/${sessionId}`; }}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              View session anyway →
            </button>
          </div>
        </div>
      )}

      {/* ── Recurring booking modal ───────────────────────────────────────────── */}
      {/* RecurringModal removed — book next session from patient profile */}

      <style>{`
        @keyframes pulse-rec { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes wave { from{transform:scaleY(.35);opacity:.5} to{transform:scaleY(1);opacity:1} }
      `}</style>
    </div>
  );
}
