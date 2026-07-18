'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit3, Save, X, Download, Copy, Check,
  AlertTriangle, Lightbulb, BookOpen, Dumbbell, Smartphone,
  Film, User, Calendar, Clock, RefreshCw,
} from 'lucide-react';
import SendToPatientAction from '@/components/patients/SendToPatientAction';

interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface RiskFlags {
  level: 'low' | 'moderate' | 'high' | 'critical';
  indicators: string[];
  action_required: boolean;
  recommended_action: string | null;
  safety_plan_needed?: boolean;
}

interface SessionGrowth {
  compared_to_last: 'improved' | 'stable' | 'declined' | 'first_session';
  areas_of_progress: string[];
  areas_of_concern: string[];
  narrative: string;
}

interface SessionDetail {
  id: string;
  session_number: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  soap_note: SOAPNote | null;
  key_points: string[] | null;
  session_summary: string | null;
  session_growth: SessionGrowth | null;
  ai_suggestions: string[] | null;
  homework_assigned: string | null;
  next_session_plan: string | null;
  manual_notes: string | null;
  risk_level: 'low' | 'moderate' | 'high' | 'critical' | null;
  risk_flags: RiskFlags | null;
  session_tags: string[] | null;
  resource_suggestions: {
    books?: { title: string; author: string; reason: string }[];
    movies?: { title: string; year: number; reason: string }[];
    exercises?: { name: string; description: string; frequency: string }[];
    apps?: { name: string; platform: string; reason: string }[];
  } | null;
  patient: { id: string; display_name: string; diagnosis: string[]; date_of_birth: string | null; phone: string | null; whatsapp_number: string | null; email: string | null } | null;
}

// `dot` is a separate literal class rather than derived from `text` via
// string replacement — Tailwind's JIT scanner needs a static class name to
// find in source, so a runtime `.replace('text-', 'bg-')` produces a class
// that never appears literally anywhere and can get purged from the built
// CSS, leaving the indicator dot with no background color at all.
const RISK_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  moderate: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Moderate Risk' },
  high: { bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400', dot: 'bg-red-400', label: 'High Risk' },
  critical: { bg: 'bg-red-600/15', border: 'border-red-500/60', text: 'text-red-400', dot: 'bg-red-400', label: 'Critical Risk' },
};

const TREND_STYLES: Record<string, { text: string; label: string }> = {
  improved: { text: 'text-emerald-400', label: '↑ Improved since last session' },
  stable: { text: 'text-gray-400', label: '→ Stable since last session' },
  declined: { text: 'text-amber-400', label: '↓ Declined since last session' },
  first_session: { text: 'text-gray-400', label: 'First session' },
};

// The AI wraps the single most clinically load-bearing word/phrase per bullet
// in **term** — this renders those as bold instead of showing literal
// asterisks, so the focus word actually pops when scanning.
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="font-semibold text-white">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// Renders clinician text that may be a set of "- " bullet lines as a scannable
// bullet list; falls back to a paragraph for single-line / legacy prose notes.
function ClinicalText({ text, dot = 'bg-teal-400' }: { text: string; dot?: string }) {
  // Points come back joined by ' • ' (or occasionally newlines); split on either.
  const lines = text.split(/\s*•\s*|\n/).map(l => l.replace(/^\s*(?:-\s+|\*(?!\*)\s+)/, '').trim()).filter(Boolean);
  if (lines.length <= 1) {
    return <p className="text-base text-gray-200 leading-relaxed whitespace-pre-wrap"><Highlighted text={text} /></p>;
  }
  return (
    <ul className="space-y-2">
      {lines.map((l, i) => (
        <li key={i} className="flex items-start gap-2.5 text-base text-gray-200 leading-snug">
          <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
          <Highlighted text={l} />
        </li>
      ))}
    </ul>
  );
}

export default function NoteDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSOAP, setEditedSOAP] = useState<SOAPNote>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState<'soap' | 'resources' | 'plan'>('soap');
  const [canMessagePatient, setCanMessagePatient] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error || 'Session not found');
        setLoading(false);
        return;
      }
      const data: SessionDetail = json.session;
      setSession(data);
      setEditedSOAP(data.soap_note || {});
      setCanMessagePatient(!!json.canMessagePatient);
      setFetchError(null);
      setLoading(false);

      // If still processing, start polling
      if (data.status === 'processing') {
        if (!pollRef.current) {
          pollRef.current = setInterval(async () => {
            const r = await fetch(`/api/sessions/${sessionId}`);
            if (!r.ok) return;
            const j = await r.json();
            const s: SessionDetail = j.session;
            setSession(s);
            setEditedSOAP(s.soap_note || {});
            if (s.status !== 'processing') {
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            }
          }, 5000);
        }
      } else {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load session');
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadSession]);

  const handleSave = useCallback(async () => {
    if (!session) return;
    setSaving(true);
    await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soap_note: editedSOAP }),
    });
    setSession(s => s ? { ...s, soap_note: editedSOAP } : s);
    setSaving(false);
    setIsEditing(false);
  }, [session, editedSOAP]);

  const handleCopy = useCallback(async () => {
    if (!session?.soap_note) return;
    const text = [
      `SOAP NOTE — ${session.patient?.display_name} — Session #${session.session_number}`,
      `Date: ${new Date(session.started_at).toLocaleDateString('en-IN')}`,
      '',
      'SUBJECTIVE:', session.soap_note.subjective || '',
      '',
      'OBJECTIVE:', session.soap_note.objective || '',
      '',
      'ASSESSMENT:', session.soap_note.assessment || '',
      '',
      'PLAN:', session.soap_note.plan || '',
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [session]);

  const handleExportPDF = useCallback(async () => {
    if (!session) return;
    // Opens the formatted HTML note in a new tab — doctor can print → Save as PDF
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    if (res.ok) {
      const html = await res.text();
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    }
  }, [session]);

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/retry-notes`, { method: 'POST' });
      if (!res.ok) throw new Error();
      // Reset to processing view + resume polling
      setSession(s => (s ? { ...s, status: 'processing' } : s));
      loadSession();
    } catch {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1a27] gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading session notes…</p>
      </div>
    );
  }

  // Session exists but notes are still being generated
  if (session && session.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1a27] gap-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-base font-semibold text-white">Generating clinical notes…</p>
          <p className="text-sm text-gray-500 mt-1">AI is analysing the session · typically 60 – 90 s</p>
        </div>
        <p className="text-xs text-gray-600">This page will update automatically</p>
      </div>
    );
  }

  // Session failed
  if (session && session.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1a27] gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <div className="text-center">
          <p className="text-base font-semibold text-white">Note generation failed</p>
          <p className="text-sm text-gray-500 mt-1">The transcript was saved — you can regenerate the notes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRetry} disabled={retrying}
            className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors">
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Regenerating…' : 'Retry note generation'}
          </button>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-200">
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (fetchError || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1a27] gap-3 text-gray-400">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm">{fetchError || 'Note not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-violet-400 hover:text-violet-300">← Go back</button>
      </div>
    );
  }

  const soap = isEditing ? editedSOAP : (session.soap_note || {});
  const duration = session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : null;

  return (
    <div className="min-h-screen bg-[#0f1a27] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#0f1a27]/95 backdrop-blur border-b border-white/8 px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-white">{session.patient?.display_name}</span>
            <span className="text-xs text-gray-500">· Session #{session.session_number}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(session.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {duration} min
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setEditedSOAP(session.soap_note || {}); }}
                className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 text-sm flex items-center gap-1.5 transition-colors">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm flex items-center gap-1.5 transition-colors">
                {saving ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 text-sm flex items-center gap-1.5 transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={handleExportPDF}
                className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 text-sm flex items-center gap-1.5 transition-colors">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm flex items-center gap-1.5 transition-colors">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Risk banner — deliberately the first thing on the page. A new
            clinician scanning this note in seconds must not be able to miss
            an active risk flag by only reading the SOAP tabs below. */}
        {session.risk_flags && session.risk_flags.level !== 'low' && (() => {
          const rf = session.risk_flags;
          const style = RISK_STYLES[rf.level] ?? RISK_STYLES.moderate;
          return (
            <div className={`${style.bg} border ${style.border} rounded-xl p-5`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className={`w-5 h-5 ${style.text}`} />
                <h2 className={`text-sm font-bold uppercase tracking-wide ${style.text}`}>{style.label}</h2>
                {rf.safety_plan_needed && (
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                    Safety plan needed
                  </span>
                )}
              </div>
              {rf.indicators?.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {rf.indicators.map((ind, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} mt-1.5 shrink-0`} />
                      <Highlighted text={ind} />
                    </li>
                  ))}
                </ul>
              )}
              {rf.recommended_action && (
                <p className="text-sm text-gray-300"><span className="font-semibold text-gray-200">Recommended action: </span>{rf.recommended_action}</p>
              )}
            </div>
          );
        })()}

        {/* At a glance — session summary + trajectory. Lets a clinician who
            has never seen this patient before (covering, or picking up a
            case) understand what happened without reading all four SOAP
            sections first. */}
        {(session.session_summary || session.session_growth) && (
          <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-300">At a Glance</h2>
              {session.session_growth && (
                <span className={`text-xs font-medium ${TREND_STYLES[session.session_growth.compared_to_last]?.text ?? 'text-gray-400'}`}>
                  {TREND_STYLES[session.session_growth.compared_to_last]?.label ?? session.session_growth.compared_to_last}
                </span>
              )}
            </div>
            {session.session_summary && (
              <p className="text-base text-gray-200 leading-relaxed">{session.session_summary}</p>
            )}
            {session.session_growth && (session.session_growth.areas_of_progress?.length > 0 || session.session_growth.areas_of_concern?.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {session.session_growth.areas_of_progress?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest mb-1.5">Progress</h3>
                    <ul className="space-y-1">
                      {session.session_growth.areas_of_progress.map((p, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /><Highlighted text={p} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {session.session_growth.areas_of_concern?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-widest mb-1.5">Concerns</h3>
                    <ul className="space-y-1">
                      {session.session_growth.areas_of_concern.map((c, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" /><Highlighted text={c} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Key points */}
        {session.key_points?.length ? (
          <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Key Points</h2>
            <ul className="space-y-2">
              {session.key_points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-base text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  <Highlighted text={pt} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(['soap', 'resources', 'plan'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab ? 'bg-[#1a2332] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'soap' ? 'SOAP Note' : tab === 'resources' ? 'Resources' : 'Next Session'}
            </button>
          ))}
        </div>

        {/* SOAP tab */}
        {activeTab === 'soap' && (
          <div className="space-y-4">
            {(['subjective', 'objective', 'assessment', 'plan'] as const).map(field => (
              <div key={field} className="bg-[#1a2332] border border-white/8 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/8 bg-white/3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{field}</h3>
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <textarea
                      value={editedSOAP[field] || ''}
                      onChange={e => setEditedSOAP(s => ({ ...s, [field]: e.target.value }))}
                      rows={4}
                      className="w-full bg-transparent text-base text-gray-200 resize-none focus:outline-none placeholder-gray-600"
                      placeholder={`Enter ${field} notes...`}
                    />
                  ) : (
                    soap[field]
                      ? <ClinicalText text={soap[field] as string} />
                      : <p className="text-base"><span className="text-gray-600 italic">Not recorded</span></p>
                  )}
                </div>
              </div>
            ))}

            {/* Doctor's private notes — entered by the clinician during the session */}
            {session.manual_notes && (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/8 bg-white/3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Doctor&apos;s private notes</h3>
                </div>
                <div className="p-4">
                  <p className="text-base text-gray-200 leading-relaxed whitespace-pre-wrap">{session.manual_notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resources tab */}
        {activeTab === 'resources' && session.resource_suggestions && (
          <div className="space-y-4">
            {/* AI suggestions */}
            {session.ai_suggestions?.length ? (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" /> AI Clinical Suggestions
                </h3>
                <p className="text-[11px] text-gray-500 mb-3">These are notes for you — only send one to the patient if clinically appropriate.</p>
                <ul className="space-y-2">
                  {session.ai_suggestions.map((s, i) => (
                    <li key={i} className="text-base text-gray-300 flex items-start gap-2 flex-wrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span className="flex-1 min-w-0"><Highlighted text={s} /></span>
                      {session.patient && (
                        <SendToPatientAction
                          text={s}
                          patientId={session.patient.id}
                          patientName={session.patient.display_name}
                          hasEmail={!!session.patient.email}
                          entitled={canMessagePatient}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Books */}
            {session.resource_suggestions.books?.length ? (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" /> Recommended Books
                </h3>
                <div className="space-y-3">
                  {session.resource_suggestions.books.map((b, i) => (
                    <div key={i} className="border-l-2 border-blue-500/30 pl-3">
                      <p className="text-sm font-medium text-white">{b.title}</p>
                      <p className="text-xs text-gray-500">{b.author}</p>
                      <p className="text-xs text-gray-400 mt-1">{b.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Exercises */}
            {session.resource_suggestions.exercises?.length ? (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-teal-400" /> Exercises
                </h3>
                <div className="space-y-3">
                  {session.resource_suggestions.exercises.map((e, i) => (
                    <div key={i} className="bg-white/3 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white">{e.name}</p>
                        <span className="text-xs text-teal-400 bg-teal-900/30 px-2 py-0.5 rounded-full">{e.frequency}</span>
                      </div>
                      <p className="text-xs text-gray-400">{e.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Apps */}
            {session.resource_suggestions.apps?.length ? (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" /> Apps
                </h3>
                <div className="space-y-2">
                  {session.resource_suggestions.apps.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{a.name} <span className="text-xs text-gray-500">· {a.platform}</span></p>
                        <p className="text-xs text-gray-400">{a.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Movies */}
            {session.resource_suggestions.movies?.length ? (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Film className="w-4 h-4 text-rose-400" /> Films / Media
                </h3>
                <div className="space-y-2">
                  {session.resource_suggestions.movies.map((m, i) => (
                    <div key={i} className="border-l-2 border-rose-500/30 pl-3">
                      <p className="text-sm font-medium text-white">{m.title} <span className="text-gray-500">({m.year})</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Next session tab */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            {session.homework_assigned && (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">Homework Assigned</h3>
                  {session.patient && (
                    <SendToPatientAction
                      text={session.homework_assigned}
                      patientId={session.patient.id}
                      patientName={session.patient.display_name}
                      hasEmail={!!session.patient.email}
                      entitled={canMessagePatient}
                    />
                  )}
                </div>
                <ClinicalText text={session.homework_assigned} />
              </div>
            )}
            {session.next_session_plan && (
              <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Next Session Plan</h3>
                <ClinicalText text={session.next_session_plan} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
