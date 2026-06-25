'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { Play, Circle, Plus, Loader2, RefreshCw, CalendarClock, X, Copy, Check, Video } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import BookingDialog from '@/components/appointments/BookingDialog';
import RescheduleModal from '@/components/appointments/RescheduleModal';
import type { Appointment, Patient } from '@/types';

interface Props {
  appointments: Appointment[];
  patients: Patient[];
  therapistId: string;
  preselectedPatientId?: string;
}

// The stored meeting_url already carries the host's account (?authuser=…), so the
// doctor opens it directly and joins as host. Copy/share gives the patient a clean link.
function cleanLink(url: string) { return url.split('?')[0]; }

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  scheduled:  { label: 'Scheduled',  dot: 'bg-slate-300',  text: 'text-muted-foreground' },
  confirmed:  { label: 'Confirmed',  dot: 'bg-blue-500',   text: 'text-violet-600' },
  in_session: { label: 'In session', dot: 'bg-green-500',  text: 'text-green-600' },
  completed:  { label: 'Completed',  dot: 'bg-slate-300',  text: 'text-muted-foreground/80' },
  cancelled:  { label: 'Cancelled',  dot: 'bg-muted',      text: 'text-muted-foreground/80' },
  no_show:    { label: 'No show',    dot: 'bg-amber-400',  text: 'text-amber-600' },
};

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))    return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE, d MMM');
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AppointmentsClient({ appointments: initial, patients, therapistId, preselectedPatientId }: Props) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>(initial);
  const [filter, setFilter]             = useState<'all'|'today'|'upcoming'|'past'>('today');
  const [showBooking, setShowBooking]   = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedId, setCopiedId]         = useState<string | null>(null);
  const [syncing, setSyncing]           = useState(false);
  const [syncMsg, setSyncMsg]           = useState('');

  void therapistId;

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url)
      .then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); })
      .catch(() => {});
  }

  // Online start: open the Meet for the doctor AND go to the session screen
  // (which dispatches the notetaker bot).
  function startVideo(appt: Appointment) {
    const url = (appt as { meeting_url?: string }).meeting_url;
    if (url) window.open(url, '_blank', 'noopener');   // url already targets the host account
    router.push(`/session/${appt.id}`);
  }

  async function handleCancel(appt: Appointment) {
    const p = appt.patient as { display_name?: string } | undefined;
    if (!window.confirm(`Cancel the appointment${p?.display_name ? ` with ${p.display_name}` : ''} on ${format(new Date(appt.scheduled_at), 'd MMM, h:mm a')}?`)) return;
    setCancellingId(appt.id);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAppointments(prev => prev.map(a => (a.id === appt.id ? { ...a, status: 'cancelled' } : a)));
    } catch {
      alert('Could not cancel — please try again.');
    } finally {
      setCancellingId(null);
    }
  }

  async function syncCalendar() {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/google-calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      if (data.synced > 0) {
        setSyncMsg(`Imported ${data.synced} new event${data.synced === 1 ? '' : 's'} from Google Calendar`);
        setTimeout(() => window.location.reload(), 900);
      } else {
        setSyncMsg(data.found > 0 ? 'Already up to date — no new events.' : 'No upcoming timed events found in your Google Calendar.');
      }
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  // Auto-sync Google Calendar: once on load, then every 60s while this page is
  // open — so events added in Google Calendar appear without a manual click.
  // (Runs silently; only refreshes the view when new events are actually imported.)
  useEffect(() => {
    let cancelled = false;
    async function autoSync() {
      try {
        const res = await fetch('/api/google-calendar/sync', { method: 'POST' });
        if (!res.ok) return; // not connected / offline — stay quiet
        const data = await res.json();
        if (!cancelled && data.synced > 0) window.location.reload();
      } catch { /* silent background sync */ }
    }
    autoSync();
    const id = setInterval(autoSync, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const now = new Date();
  const filtered = appointments.filter(a => {
    const d = new Date(a.scheduled_at);
    if (filter === 'today')    return isToday(d);
    if (filter === 'upcoming') return d > now && !isToday(d);
    if (filter === 'past')     return isPast(d) && !isToday(d);
    return true;
  }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const grouped: Record<string, Appointment[]> = {};
  filtered.forEach(a => {
    const key = format(new Date(a.scheduled_at), 'yyyy-MM-dd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  function handleBooked() {
    setShowBooking(false);
    window.location.reload();
  }

  return (
    <>
      {showBooking && (
        <BookingDialog
          patients={patients}
          preselectedPatientId={preselectedPatientId}
          onClose={() => setShowBooking(false)}
          onBooked={handleBooked}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onRescheduled={() => { setRescheduleTarget(null); window.location.reload(); }}
        />
      )}

      <div className="page-enter space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Appointments</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {appointments.length} appointments
              {syncMsg && <span className="ml-2 text-violet-600">· {syncMsg}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncCalendar}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-md border border-violet-200 bg-white px-3.5 py-2 text-[13px] font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60 transition-colors"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {syncing ? 'Syncing…' : 'Sync Google Calendar'}
            </button>
            <button
              onClick={() => setShowBooking(true)}
              className="flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Book appointment
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 border-b border-slate-200">
          {(['today','upcoming','past','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors capitalize ${
                filter === f
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground/80'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Content */}
        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md py-16 text-center">
            <p className="text-[13px] text-muted-foreground">No appointments scheduled.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateKey, appts]) => (
              <div key={dateKey}>
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {dayLabel(appts[0].scheduled_at)}
                </h3>
                <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
                  {appts.map((appt, i) => {
                    const p = appt.patient as { display_name: string; diagnosis: string[] } | undefined;
                    const cfg = statusConfig[appt.status] || statusConfig.scheduled;
                    const canStart = ['scheduled','confirmed'].includes(appt.status);
                    const isActive = appt.status === 'in_session';
                    const isDone   = ['completed','cancelled','no_show'].includes(appt.status);
                    const isVideo  = appt.modality === 'video';
                    const meetingUrl = (appt as { meeting_url?: string }).meeting_url;

                    return (
                      <div key={appt.id}
                        className={`flex items-center gap-4 px-5 py-3.5 ${
                          isActive ? 'bg-green-50/60 border-l-2 border-green-500' : ''
                        } ${i < appts.length - 1 ? 'border-b border-purple-200/30' : ''}`}>
                        {/* Time */}
                        <div className="w-16 flex-none text-right">
                          <span className={`text-[13px] font-medium ${isDone ? 'text-muted-foreground/50' : 'text-foreground/70'}`}>
                            {format(new Date(appt.scheduled_at), 'h:mm a')}
                          </span>
                        </div>

                        <div className={`h-2 w-2 rounded-full flex-none ${cfg.dot}`} />

                        {/* Avatar + name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground/70">
                            {p ? getInitials(p.display_name) : '?'}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[13px] font-medium truncate ${isDone ? 'text-muted-foreground/80' : 'text-foreground'}`}>
                              {p?.display_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground/80 truncate">
                              {p?.diagnosis?.[0]} · {appt.duration_minutes} min · {appt.modality?.replace('_',' ')}
                            </p>
                          </div>
                        </div>

                        {/* Status + action */}
                        <div className="flex items-center gap-3 flex-none">
                          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                          {isActive && (
                            <Link href={`/session/${appt.id}`}
                              className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                              <Circle className="h-2 w-2 fill-white" /> Resume
                            </Link>
                          )}
                          {canStart && (
                            isVideo && meetingUrl ? (
                              <button onClick={() => startVideo(appt)}
                                className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors">
                                <Video className="h-3 w-3" /> Open Meet &amp; start
                              </button>
                            ) : (
                              <Link href={`/session/${appt.id}`}
                                className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors">
                                <Play className="h-2.5 w-2.5 fill-white" /> Start
                              </Link>
                            )
                          )}
                          {appt.status === 'completed' && (
                            <Link href={`/notes/${appt.id}`}
                              className="text-xs text-violet-600 hover:text-violet-700 transition-colors">
                              View note →
                            </Link>
                          )}
                          {/* Online: copy link + join the Meet directly */}
                          {!isDone && isVideo && meetingUrl && (
                            <>
                              <button
                                onClick={() => copyLink(cleanLink(meetingUrl), appt.id)}
                                title="Copy meeting link"
                                className="flex items-center rounded-md border border-input px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                {copiedId === appt.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              <a
                                href={meetingUrl} target="_blank" rel="noopener noreferrer"
                                title="Open meeting as host"
                                className="flex items-center rounded-md border border-input px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                <Video className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                          {/* Reschedule / cancel — only for upcoming (not done / in-session) */}
                          {!isDone && !isActive && (
                            <>
                              <button
                                onClick={() => setRescheduleTarget(appt)}
                                title="Reschedule"
                                className="flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                <CalendarClock className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleCancel(appt)}
                                disabled={cancellingId === appt.id}
                                title="Cancel"
                                className="flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors">
                                {cancellingId === appt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
