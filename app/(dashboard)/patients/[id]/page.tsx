import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, MessageSquare, Calendar,
  FileText, Brain, Activity, ChevronRight, Loader2, StickyNote,
} from 'lucide-react';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ProcessingBanner } from '@/components/patients/ProcessingBanner';
import StartSessionButton from '@/components/patients/StartSessionButton';
import EditPatientButton from '@/components/patients/EditPatientButton';
import MessagePatientButton from '@/components/patients/MessagePatientButton';
import { getInitials } from '@/lib/utils';
import { getEntitlements } from '@/lib/entitlements';
import type { Patient } from '@/types';

interface SessionRow {
  id: string;
  session_number: number | null;
  started_at: string;
  ended_at: string | null;
  session_summary: string | null;
  key_points: string[] | null;
  status: string;
  manual_notes: string | null;
  recording_source: string | null;
  transcript_raw: unknown;
}

function avatarBg(name: string) {
  const colors = ['bg-violet-500','bg-blue-500','bg-teal-500','bg-rose-500','bg-amber-500'];
  return colors[name.charCodeAt(0) % colors.length];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function sessionDuration(s: SessionRow): string | null {
  if (!s.ended_at) return null;
  const min = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
  if (min < 1) return null;
  return `${min} min`;
}

export default async function PatientProfilePage({ params }: { params: { id: string } }) {
  // Auth check with user Supabase client
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get therapist ID for ownership verification
  const { data: therapist } = await supabase
    .from('therapists').select('id, subscription_plan, subscription_status, trial_ends_at').eq('user_id', user.id).single();
  if (!therapist) redirect('/login');
  const canMessagePatients = getEntitlements(therapist).patientMessaging;

  // Use service role for all data queries — no RLS surprises
  const service = createServiceRoleClient();

  const [{ data: patient }, { data: sessions }] = await Promise.all([
    service.from('patients').select('*').eq('id', params.id).eq('therapist_id', therapist.id).single(),
    service
      .from('sessions')
      .select('id, session_number, started_at, ended_at, session_summary, key_points, status, manual_notes, recording_source, transcript_raw')
      .eq('patient_id', params.id)
      .eq('therapist_id', therapist.id)
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  if (!patient) redirect('/patients');

  const p = patient as Patient & {
    whatsapp_number?: string;
    presenting_concerns?: string;
    session_frequency?: string;
    medications?: string;
  };

  const age = p.date_of_birth
    ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400000))
    : null;
  const sess = (sessions || []) as SessionRow[];
  // Doctor's own private notes, jotted during/after each recording — never sent
  // to the patient, never part of the AI prompt's output, just a personal record.
  const personalNotes = sess.filter(s => s.manual_notes && s.manual_notes.trim());
  const latestSession = sess[0];
  const isProcessing = latestSession?.status === 'processing';
  const isFailed     = latestSession?.status === 'failed' && !latestSession.session_summary;
  const showBanner   = isProcessing || isFailed;

  return (
    <div className="page-enter p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patients" className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className={`h-11 w-11 rounded-xl ${avatarBg(p.display_name)} flex items-center justify-center text-sm font-bold text-white`}>
            {getInitials(p.display_name)}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{p.display_name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {age && <span className="text-xs text-muted-foreground">{age}y</span>}
              {p.gender && <span className="text-xs text-muted-foreground">· {p.gender}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/appointments?book=${p.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-input bg-white/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/80 transition-colors">
            <Calendar className="h-3.5 w-3.5" /> Schedule session
          </Link>
          <EditPatientButton patient={p} />
          <StartSessionButton patientId={p.id} />
        </div>
      </div>

      {/* Generating notes banner */}
      {showBanner && (
        <ProcessingBanner
          patientId={p.id}
          initialStatus={isFailed ? 'failed' : 'processing'}
          sessionId={latestSession?.id}
          isOnline={latestSession?.recording_source === 'online_bot'}
          initialHasTranscript={Array.isArray(latestSession?.transcript_raw) && latestSession.transcript_raw.length > 0}
        />
      )}

      {/* Body grid */}
      <div className="grid grid-cols-3 gap-5">

        {/* Left column */}
        <div className="space-y-4">

          {/* Clinical info — always shown, fields hidden if empty */}
          <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-1.5">
              <Brain className="h-3 w-3" /> Clinical profile
            </p>
            <div className="space-y-3">
              {p.diagnosis?.length ? (
                <div>
                  <p className="text-[10px] text-muted-foreground/70 mb-1.5">Diagnosis</p>
                  <div className="flex flex-wrap gap-1">
                    {p.diagnosis.map((d: string) => (
                      <span key={d} className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{d}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {p.therapy_modality ? (
                <div>
                  <p className="text-[10px] text-muted-foreground/70 mb-0.5">Modality</p>
                  <p className="text-sm text-foreground">{p.therapy_modality}</p>
                </div>
              ) : null}
              {p.session_frequency ? (
                <div>
                  <p className="text-[10px] text-muted-foreground/70 mb-0.5">Session frequency</p>
                  <p className="text-sm text-foreground capitalize">{p.session_frequency.replace('_', ' ')}</p>
                </div>
              ) : null}
              {p.medications ? (
                <div>
                  <p className="text-[10px] text-muted-foreground/70 mb-0.5">Medications</p>
                  <p className="text-sm text-foreground">{p.medications}</p>
                </div>
              ) : null}
              {!p.diagnosis?.length && !p.therapy_modality && !p.session_frequency && !p.medications && (
                <p className="text-xs text-muted-foreground/50 italic">No clinical data recorded</p>
              )}
            </div>
          </div>

          {/* Contact — only shown if any contact data exists */}
          {(p.phone || p.email || p.whatsapp_number) && (
            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Contact</p>
              <div className="space-y-2.5">
                {p.phone && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-none" />
                    {p.phone}
                  </div>
                )}
                {p.whatsapp_number && p.whatsapp_number !== p.phone && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-none" />
                    {p.whatsapp_number}
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground flex-none" />
                    {p.email}
                  </div>
                )}
              </div>
              <MessagePatientButton
                patientId={p.id}
                patientName={p.display_name}
                hasEmail={!!p.email}
                entitled={canMessagePatients}
              />
            </div>
          )}

          {/* Session stats — only if sessions exist */}
          {sess.length > 0 && (
            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-1.5">
                <Activity className="h-3 w-3" /> Session stats
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total sessions</span>
                  <span className="text-xs font-semibold text-foreground">{sess.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — 2 cols */}
        <div className="col-span-2 space-y-4">

          {/* Presenting concern */}
          {p.presenting_concerns && (
            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Presenting concern</p>
              <p className="text-sm text-foreground leading-relaxed">{p.presenting_concerns}</p>
            </div>
          )}

          {/* Personal notes — doctor's own jottings from each recording, private to them */}
          {personalNotes.length > 0 && (
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 backdrop-blur-md overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-amber-200/50">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700/80 flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" /> Personal notes
                  <span className="text-amber-600">{personalNotes.length}</span>
                </p>
              </div>
              <div className="divide-y divide-amber-200/40">
                {personalNotes.map(s => (
                  <div key={s.id} className="px-4 py-3">
                    <p className="text-[11px] text-amber-700/70 mb-1">{fmtDate(s.started_at)} · Session #{s.session_number ?? ''}</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{s.manual_notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session history */}
          <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-200/40">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Clinical notes
                {sess.length > 0 && (
                  <span className="ml-1 text-violet-600 font-bold">{sess.length}</span>
                )}
              </p>
              {sess.length > 0 && (
                <Link href={`/notes?patient=${p.id}`} className="text-xs text-violet-600 hover:text-violet-700">
                  View all →
                </Link>
              )}
            </div>

            {sess.length === 0 ? (
              <div className="py-10 text-center px-6">
                <FileText className="mx-auto h-7 w-7 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No sessions recorded yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start a session to begin generating AI-assisted clinical notes.</p>
              </div>
            ) : (
              <div>
                {sess.map((s, i) => {
                  const dur = sessionDuration(s);
                  const isProc = s.status === 'processing';
                  const isFailed = s.status === 'failed';
                  // Notes aren't ready while still processing — keep the row non-clickable.
                  const clickable = !isProc;
                  const border = i < sess.length - 1 ? 'border-b border-purple-200/30' : '';

                  const inner = (
                    <>
                      {/* Session # */}
                      <div className="flex-none w-7 text-center pt-0.5">
                        <span className="text-xs font-semibold text-muted-foreground/50">#{s.session_number || i + 1}</span>
                      </div>

                      {/* Summary + key point */}
                      <div className="flex-1 min-w-0">
                        {isProc ? (
                          <p className="text-sm font-semibold flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full animate-pulse-slow"
                            style={{
                              color: '#5b21b6',
                              background: 'linear-gradient(135deg,#f3e8ff,#ede9fe)',
                              border: '1px solid rgba(139,92,246,0.4)',
                              textShadow: '0 0 10px rgba(139,92,246,0.45)',
                              boxShadow: '0 0 14px rgba(139,92,246,0.3)',
                            }}>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#6d28d9' }} /> Generating notes…
                          </p>
                        ) : isFailed ? (
                          <p className="text-sm text-red-400 italic">Note generation failed — transcript saved</p>
                        ) : (
                          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                            {s.session_summary || 'Session complete — notes available'}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{fmtDate(s.started_at)}</span>
                          {dur && <span className="text-xs text-muted-foreground/60">· {dur}</span>}
                        </div>
                        {/* First key point as a preview */}
                        {s.key_points?.[0] && !isProc && (
                          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-1 italic">
                            &ldquo;{s.key_points[0]}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Right metadata */}
                      <div className="flex-none flex flex-col items-end gap-1.5">
                        {clickable && (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-violet-500 transition-colors mt-0.5" />
                        )}
                      </div>
                    </>
                  );

                  return clickable ? (
                    <Link key={s.id} href={`/notes/${s.id}`}
                      className={`flex items-start gap-3 px-4 py-4 hover:bg-white/40 transition-colors group ${border}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={s.id}
                      className={`flex items-start gap-3 px-4 py-4 cursor-default ${border}`}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Therapy goals — only if set */}
          {p.therapy_goals?.length ? (
            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-md p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Treatment goals</p>
              <ul className="space-y-1.5">
                {p.therapy_goals.map((g: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-violet-400 text-xs mt-0.5 flex-none">▸</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
