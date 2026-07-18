'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRealTimeTranscript } from '@/hooks/useRealTimeTranscript';
import { formatDuration, getInitials } from '@/lib/utils';
import {
  ArrowLeft, Mic, Square, Wifi, WifiOff, Clock,
  Lightbulb, FileText, RefreshCw, Calendar, Video, Loader2, AlignLeft, Sparkles, Pause, ShieldCheck,
} from 'lucide-react';
import Nebula from '@/components/session/Nebula';
import type { Appointment, Patient, TranscriptSegment } from '@/types';
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

// Appends only genuinely new items onto a running list — each live-update
// cycle only sees a recent window of the transcript, so without this an
// insight from earlier in the session would simply disappear once it aged
// out of that window instead of staying visible for the rest of the session.
// Caps how many accumulated items the live panel keeps. Without a cap, a long
// session polling every 2 minutes merges in new items forever with nothing
// ever removed — a 90-minute session could leave 40+ entries on screen,
// including questions asked and resolved an hour ago. Keeping the most
// recent MAX_MERGED items (oldest dropped first) keeps the panel usable
// without losing the "don't silently discard a fresh insight" fix this
// helper exists for.
const MAX_MERGED_NOTES = 10;
function mergeUniqueNotes(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map(s => s.trim().toLowerCase()));
  const merged = [...existing];
  for (const item of incoming) {
    const key = item.trim().toLowerCase();
    if (key && !seen.has(key)) { seen.add(key); merged.push(item); }
  }
  return merged.length > MAX_MERGED_NOTES ? merged.slice(-MAX_MERGED_NOTES) : merged;
}

// ─── Main page ────────────────────────────────────────────────────────────────
const LIVE_UPDATE_MS = 2 * 60 * 1000; // 2 minutes
const TRANSCRIPT_AUTOSAVE_MS = 15 * 1000; // 15 seconds

export default function LiveSessionPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = createClient();

  const { segments, partialText, isConnected, connectionStatus, connect, disconnect, restoreSegments } = useRealTimeTranscript();

  // Simple duration timer — driven by isConnected, no separate MediaRecorder needed
  const [duration, setDuration]   = useState(0);
  const durationRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecording               = isConnected;

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const liveTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentsRef      = useRef(segments);
  const liveUpdateSeqRef = useRef(0);

  const [appointment, setAppointment]     = useState<Appointment | null>(null);
  const [patient, setPatient]             = useState<Patient | null>(null);
  // True until the appointment-recovery check below has run — blocks the
  // online auto-start effect from racing ahead of it (see that effect).
  const [recovering, setRecovering]       = useState(true);
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

  // Consent gate — blocks BOTH the manual "Start session" click (in-person)
  // and the automatic bot dispatch (online) until the therapist confirms
  // patient consent, closing the gap between what the privacy policy promises
  // ("you are responsible for obtaining consent") and what the product
  // actually enforced (nothing — see app/api/sessions/start/route.ts, which
  // only logged a warning). Recorded once per patient via consent_recording.
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChecked, setConsentChecked]     = useState(false);
  const [savingConsent, setSavingConsent]       = useState(false);

  // Online sessions (Teams/Meet) are recorded by a Recall bot, not the local mic.
  const isOnline = appointment?.modality === 'video';

  // Ultra+ only — see lib/entitlements.ts liveOnlineUpdates. When true, the bot
  // was dispatched with Recall's realtime webhook enabled, so utterances land
  // in the session's transcript_raw while the call is still going. We can't
  // see that append happen server-side, so we poll for it.
  const [liveOnlineEntitled, setLiveOnlineEntitled] = useState(false);
  const [onlineSegments, setOnlineSegments] = useState<TranscriptSegment[]>([]);

  useEffect(() => {
    fetch('/api/me/entitlements')
      .then(r => r.json())
      .then(d => {
        if (typeof d.sessionDurationCapMinutes === 'number') setDurationCapMinutes(d.sessionDurationCapMinutes);
        setLiveOnlineEntitled(!!d.liveOnlineUpdates);
      })
      .catch(() => {});
  }, []);

  // Poll the growing transcript for an in-progress ONLINE session — no
  // websocket for bot-recorded calls, so this is the only way the client sees
  // realtime segments as they're appended by the Recall webhook.
  const onlineSegmentsActive = isOnline && liveOnlineEntitled && botDispatched && sessionStatus !== 'ended';
  useEffect(() => {
    if (!onlineSegmentsActive || !sessionId) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok || cancelled) return;
        const { session } = await res.json();
        if (Array.isArray(session?.transcript_raw)) setOnlineSegments(session.transcript_raw);
      } catch { /* keep polling */ }
    }
    poll();
    const id = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [onlineSegmentsActive, sessionId]);

  // What fetchLiveUpdate / speaker-ID actually read: the mic transcript for
  // in-person, the polled Recall segments for a live-updates-entitled online
  // session, empty otherwise (matches today's fully-batch behaviour).
  const effectiveSegments = isOnline ? onlineSegments : segments;
  const liveActive = isRecording || onlineSegmentsActive;
  segmentsRef.current = effectiveSegments;

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
        setConsentConfirmed(!!(appt.patient as Patient | null)?.consent_recording);
        if ((appt as Record<string, unknown>).status === 'in_session') {
          const { data: existing } = await supabase
            .from('sessions').select('id,status,transcript_raw')
            .eq('appointment_id', params.id)
            .in('status', ['active','processing'])
            .maybeSingle();
          if (existing) {
            setSessionId(existing.id);
            setSessionStatus('paused');
            // botDispatched is local React state — it does NOT survive a page
            // reload/reopen on its own. Without restoring it here, an online
            // session that's reopened (e.g. after closing the tab and coming
            // back) looks like the bot was never dispatched, which stops the
            // elapsed-time clock dead (its effect requires botDispatched)
            // even though the bot is still recording in the call.
            if ((appt as Record<string, unknown>).modality === 'video') {
              setBotDispatched(true);
            } else if (Array.isArray(existing.transcript_raw) && existing.transcript_raw.length > 0) {
              // In-person transcript is now autosaved periodically (see the
              // effect below) instead of only at "End session" — restore it
              // here so a reload shows what was already captured instead of
              // silently losing it. Resume then appends new segments onto
              // this instead of starting from an empty transcript.
              restoreSegments(existing.transcript_raw as TranscriptSegment[]);
            }
          }
        }
      }
      // Only now is it safe for the auto-start effect to decide whether this
      // is a fresh online session — setAppointment() above re-renders with
      // sessionStatus still 'new' while this recovery check is in flight, and
      // without this gate the auto-start effect fires on that intermediate
      // render, dispatching a second (paid) Recall bot for an already-active
      // session before setSessionStatus('paused') above ever lands.
      setRecovering(false);
    }
    load();
  }, [params.id]); // eslint-disable-line

  // Duration timer — starts when connected, stops when disconnected. Doesn't
  // reset on every (re)connect: a doctor-initiated pause/resume (or a page
  // reload mid-session) should keep counting from where it left off, not zero
  // out the visible clock. Only a genuinely new session resets it (handleStart).
  useEffect(() => {
    if (isConnected) {
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
  // Doesn't reset while merely paused — a break shouldn't refund the doctor a
  // fresh cap on resume, it should just stop adding to the total. Only a
  // genuinely new session resets it (handleStart/handleStartOnline).
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const active = isOnline ? botDispatched && sessionStatus !== 'ended' : isConnected;
    if (active) {
      if (!elapsedRef.current) elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    } else {
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [isOnline, botDispatched, sessionStatus, isConnected]);

  // ── Live speaker identification ─────────────────────────────────────────────
  // Runs after every 10 new segments while recording. Uses Claude Haiku to map
  // "Speaker A" → "Dr. Mehta (Therapist)", "Speaker B" → "Rohan (Patient)" etc.
  useEffect(() => {
    if (!liveActive) return;
    if (effectiveSegments.length < 5) return;
    if (effectiveSegments.length - lastIdentifiedCount.current < 10 && lastIdentifiedCount.current > 0) return;

    lastIdentifiedCount.current = effectiveSegments.length;
    setIdentifying(true);

    fetch('/api/identify-speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segments: effectiveSegments.slice(0, 40), // first 40 is enough context
        patientName: patient?.display_name || '',
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.speakers) setSpeakerMap(d.speakers); })
      .catch(() => {})
      .finally(() => setIdentifying(false));
  }, [effectiveSegments.length, liveActive, patient]); // eslint-disable-line

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, partialText]);

  const fetchLiveUpdate = useCallback(async () => {
    if (!patient || segmentsRef.current.length < 3) return;
    // Nothing stops the 2-minute interval from firing again before a slow
    // request resolves. Without this guard, an older request that happens to
    // resolve AFTER a newer one would overwrite risk_level/soap_note with
    // stale data — key_points/suggestions are merge-safe, but the rest of
    // `d.notes` is applied wholesale, so a later-resolving-but-older response
    // could silently regress e.g. risk_level from "critical" back to "low".
    liveUpdateSeqRef.current += 1;
    const mySeq = liveUpdateSeqRef.current;
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
        if (d.notes && mySeq === liveUpdateSeqRef.current) {
          // Each 2-min cycle only sees the last ~20 segments, so an insight
          // from ten minutes ago naturally drops out of that window. Merge
          // into the running list instead of replacing it, so a real
          // observation doesn't just vanish from the doctor's screen once
          // the conversation moves on — only new/duplicate-free items are added.
          setLiveNotes(prev => ({
            ...d.notes,
            key_points: mergeUniqueNotes((prev?.key_points as string[] | undefined) || [], d.notes.key_points || []),
          }));
          setSuggestions(prev => ({
            questions:    mergeUniqueNotes(prev?.questions   || [], d.notes.suggested_questions   || []),
            treatment:    mergeUniqueNotes(prev?.treatment   || [], d.notes.treatment_suggestions  || []),
            mindfulness:  mergeUniqueNotes(prev?.mindfulness || [], d.notes.mindfulness_suggestions || []),
          }));
          setLastUpdated(new Date());
        }
      }
    } catch { /* silent */ }
    finally { setIsUpdating(false); }
  }, [patient, manualNotes]);

  useEffect(() => {
    if (liveActive) {
      liveTimerRef.current = setInterval(fetchLiveUpdate, LIVE_UPDATE_MS);
    } else {
      if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
    }
    return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [liveActive, fetchLiveUpdate]);

  const handleStart = async () => {
    if (!patient) return;
    try {
      const res  = await fetch('/api/sessions/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: params.id, patientId: patient.id }) });
      const data = await res.json();
      if (res.status === 402) { setUpgradeModal(data.error || 'Upgrade your plan to continue.'); return; }
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.session.id);
      setSessionStatus('active');
      setDuration(0);
      setElapsedSec(0);
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
      setElapsedSec(0);
      setBotDispatched(true);
      // Best-effort: open the Meet call in its own tab the moment the
      // notetaker joins, so the doctor doesn't have to hunt for a separate
      // "Open Meet" click. Browsers only allow window.open() reliably when
      // it's a direct result of a click — this call runs from a page-load
      // effect when auto-started, so most browsers WILL silently block it
      // there (this is a browser security policy, not something any web app
      // can override). It works reliably when this fires from an actual
      // click instead (e.g. "Retry recorder"). Either way, the persistent
      // "Open Meet" button above is the guaranteed fallback.
      const url = (appointment as { meeting_url?: string } | null)?.meeting_url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setBotError(err instanceof Error ? err.message : 'Failed to send notetaker');
    }
  };

  // Online sessions auto-start the recorder: as soon as the video session page
  // loads, dispatch the notetaker bot automatically — no manual "send" step.
  // Fires exactly once (guarded by the ref), and only for a fresh session.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (recovering) return; // wait for the recovery check to resolve sessionStatus first
    if (!isOnline || !appointment) return;
    if (autoStartedRef.current) return;
    if (sessionStatus !== 'new' || botDispatched) return;
    if (!consentConfirmed) return; // consent gate below must be cleared before a bot ever joins the call
    autoStartedRef.current = true;
    handleStartOnline();
  }, [recovering, isOnline, appointment, sessionStatus, botDispatched, consentConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Surface the consent gate the moment we know it's needed — before the
  // in-person "Start session" button can be clicked and before the online
  // auto-start effect above is allowed to fire. Only for a genuinely fresh
  // session (a resumed/paused one already has recording underway).
  useEffect(() => {
    if (recovering || !patient) return;
    if (sessionStatus !== 'new') return;
    if (consentConfirmed) return;
    setShowConsentModal(true);
  }, [recovering, patient, sessionStatus, consentConfirmed]);

  const handleConfirmConsent = async () => {
    if (!patient || !consentChecked) return;
    setSavingConsent(true);
    try {
      await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_recording: true,
          consent_ai_notes: true,
          consent_date: new Date().toISOString(),
        }),
      });
    } catch { /* best-effort persist — the gate itself already did its job for this session */ }
    setPatient(p => p ? { ...p, consent_recording: true, consent_ai_notes: true } : p);
    setSavingConsent(false);
    setShowConsentModal(false);
    setConsentConfirmed(true);
    if (!isOnline) handleStart();
  };

  const handleCancelConsent = () => {
    setShowConsentModal(false);
    router.push(patient ? `/patients/${patient.id}` : '/patients');
  };

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

  // In-person transcript_raw was previously written only once, at "End
  // session" — the mic/WebSocket transcript lived only in this tab's memory
  // until then, so a crash/reload mid-session silently lost everything
  // captured so far with no way to recover it. Periodically autosaving here
  // bounds that loss to the last ~15s instead of the whole session; the
  // recovery effect above restores this on reload so it isn't just saved,
  // it's actually shown again too. Online sessions don't need this — their
  // transcript already lives server-side via the Recall webhook.
  useEffect(() => {
    if (isOnline || !sessionId || !isRecording) return;
    const id = setInterval(() => {
      if (segmentsRef.current.length === 0) return;
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_raw: segmentsRef.current }),
      }).catch(() => {});
    }, TRANSCRIPT_AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [isOnline, sessionId, isRecording]);

  // In-person only — stops the mic/WebSocket without ending the session, so a
  // doctor can step out for a break. Both timers above stop counting the
  // instant this fires (paused minutes aren't billed against the plan's
  // per-session cap) and pick back up exactly where they left off on Resume.
  const handlePause = () => {
    disconnect();
    setSessionStatus('paused');
    // Flush immediately rather than waiting for the next autosave tick — a
    // doctor who pauses and then closes the tab (without ever clicking
    // Resume or End) shouldn't lose up to TRANSCRIPT_AUTOSAVE_MS of transcript
    // to timing alone.
    if (!isOnline && sessionId && segmentsRef.current.length > 0) {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_raw: segmentsRef.current }),
      }).catch(() => {});
    }
  };

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
          {/* Paused — doctor-initiated break, not a dropped connection */}
          {sessionStatus === 'paused' && !isOnline && (
            <div className="flex items-center gap-2 font-mono text-sm font-medium text-amber-400">
              <Pause className="h-3.5 w-3.5" /> Paused · {formatDuration(duration)}
            </div>
          )}

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

          {/* Timer — in-person uses the local-mic-driven `duration` clock;
              online has no local mic connection, so it uses the shared
              `elapsedSec` clock (already ticking for the duration cap, just
              never rendered) instead. */}
          {isRecording && (
            <div className="flex items-center gap-2 font-mono text-sm font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-red-500" style={{ animation: 'pulse-rec 1.2s ease-in-out infinite' }} />
              {formatDuration(duration)}
            </div>
          )}
          {isOnline && botDispatched && sessionStatus !== 'ended' && (
            <div className="flex items-center gap-2 font-mono text-sm font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-red-500" style={{ animation: 'pulse-rec 1.2s ease-in-out infinite' }} />
              {formatDuration(elapsedSec)}
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
            <button onClick={() => { if (!consentConfirmed) { setShowConsentModal(true); return; } handleStart(); }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 0 20px rgba(59,130,246,0.25)' }}>
              <Mic className="h-4 w-4" /> Start session
            </button>
          )}
          {/* Online: open/reopen the Meet call. Previously this vanished the
              instant the bot dispatched, so closing or losing that tab left
              no way back in short of re-navigating. Now it stays available
              for the whole session (it also gets auto-opened once — see the
              startedMeetTabRef effect below — this is the reliable fallback
              for whenever a browser's popup blocker stops that). */}
          {isOnline && sessionStatus !== 'ended' && (appointment as { meeting_url?: string } | null)?.meeting_url && (
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
            <>
              <button onClick={handleResume}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Mic className="h-4 w-4" /> Resume
              </button>
              <button onClick={() => setShowEndModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                <Square className="h-3.5 w-3.5" /> End session
              </button>
            </>
          )}
          {isRecording && (
            <>
              <button onClick={handlePause}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
              <button onClick={() => setShowEndModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                <Square className="h-3.5 w-3.5" /> End session
              </button>
            </>
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
            <button onClick={fetchLiveUpdate} disabled={isUpdating || effectiveSegments.length < 3}
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
                          <p key={i} className="text-base text-slate-300 flex gap-2.5 leading-relaxed">
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
                          <p key={i} className="text-base text-slate-300 flex gap-2 leading-relaxed">
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
                          <p key={i} className="text-base text-slate-300 flex gap-2 leading-relaxed">
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
                          <p key={i} className="text-base text-slate-300 flex gap-2.5 leading-relaxed">
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
                            <p className="text-base text-slate-400 leading-relaxed">{soapNote[f]}</p>
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
            🔒 Audio deleted after processing · Encrypted in transit &amp; at rest · DPDP 2023 aligned
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

      {/* ── Consent gate — blocks recording start until confirmed ───────────── */}
      {showConsentModal && patient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 space-y-5"
            style={{ background: '#0f172a', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <ShieldCheck className="h-5 w-5 text-violet-400" />
            </div>
            <div className="space-y-1.5 text-center">
              <h3 className="text-base font-semibold text-white">Patient consent required</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {patient.display_name} doesn&rsquo;t have recording consent on file yet. Per Kith&rsquo;s terms, you&rsquo;re
                responsible for obtaining consent before this session is recorded and AI-assisted notes are generated.
              </p>
            </div>
            <label className="flex items-start gap-2.5 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-violet-500" />
              <span>I confirm {patient.display_name} has given consent to be recorded and to AI-assisted note generation.</span>
            </label>
            <div className="flex gap-3">
              <button onClick={handleCancelConsent}
                className="flex-1 rounded-xl py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
              <button onClick={handleConfirmConsent} disabled={!consentChecked || savingConsent}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                {savingConsent ? 'Saving…' : 'Confirm & start'}
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
