import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Calendar, Users, FileText,
  ChevronRight, Play, Circle, CheckCircle2,
  TrendingUp, Video,
} from 'lucide-react';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import CalendarAutoSync from '@/components/calendar/CalendarAutoSync';
import BookAppointmentButton from '@/components/appointments/BookAppointmentButton';
import type { Patient } from '@/types';

const statusMap = {
  completed:  { label: 'Completed',  dot: 'bg-slate-400',  row: '' },
  in_session: { label: 'In session', dot: 'bg-green-500',  row: 'bg-green-50/60 border-l-2 border-green-500' },
  confirmed:  { label: 'Confirmed',  dot: 'bg-blue-500',   row: '' },
  scheduled:  { label: 'Scheduled',  dot: 'bg-slate-300',  row: '' },
} as const;

function relDate(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, display_name, designation, clinic_name, avatar_url')
    .eq('user_id', user.id)
    .single();

  if (!therapist) redirect('/register');

  // Use service role so counts/data never silently drop due to RLS
  const service = createServiceRoleClient();

  // Today's bounds
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // Parallel queries
  const [
    { data: todayAppts },
    { count: totalPatients },
    { count: totalNotes },
    { data: recentSessions },
    { data: nextApptData },
    { data: bookablePatients },
  ] = await Promise.all([
    service
      .from('appointments')
      .select('id, scheduled_at, duration_minutes, modality, status, patient:patients(id, display_name, diagnosis)')
      .eq('therapist_id', therapist.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at', { ascending: true }),

    service
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .eq('status', 'active'),

    service
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .not('soap_note', 'is', null),

    service
      .from('sessions')
      .select('id, started_at, session_summary, patient:patients(id, display_name, diagnosis)')
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .not('soap_note', 'is', null)
      .order('started_at', { ascending: false })
      .limit(3),

    // Next upcoming appointment (today or future) that hasn't started
    service
      .from('appointments')
      .select('id, scheduled_at, patient:patients(id, display_name)')
      .eq('therapist_id', therapist.id)
      .in('status', ['confirmed', 'scheduled'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1),

    // Active patients for the inline "Schedule session" booking dialog
    service
      .from('patients')
      .select('id, display_name, diagnosis')
      .eq('therapist_id', therapist.id)
      .eq('status', 'active')
      .order('display_name'),
  ]);

  const appointments = todayAppts || [];
  const sessionsDone = appointments.filter(a => a.status === 'completed').length;
  const inSession    = appointments.find(a => a.status === 'in_session');
  const upcoming     = appointments.filter(a => ['confirmed', 'scheduled'].includes(a.status));
  const nextAppt        = nextApptData?.[0] ?? null;
  // Supabase returns joins as arrays — pick first element and cast
  const nextApptPatient = (Array.isArray(nextAppt?.patient) ? nextAppt!.patient[0] : nextAppt?.patient) as { id: string; display_name: string } | null;

  return (
    <div className="page-enter space-y-5 p-6">

      {/* Auto-sync Google Calendar while the dashboard is open */}
      <CalendarAutoSync />

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full flex-none overflow-hidden flex items-center justify-center bg-violet-700 text-white text-sm font-bold">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(therapist as any).avatar_url
              ? <img src={(therapist as any).avatar_url} alt={therapist.display_name} className="h-full w-full object-cover"/>
              : (therapist.display_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'DR')}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{therapist.display_name || 'Welcome'}</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {therapist.designation}{therapist.clinic_name ? ` · ${therapist.clinic_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inSession && (
            <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] text-green-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Session in progress
            </span>
          )}
          {/* Schedule session — opens an inline booking modal, no navigation */}
          <BookAppointmentButton patients={(bookablePatients as Patient[]) || []} />
          {/* Start session — goes to next booked appt, or patient list for ad-hoc */}
          {nextAppt ? (
            <Link href={`/session/${nextAppt.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-violet-700 transition-colors">
              <Play className="h-3.5 w-3.5 fill-white" />
              Start — {nextApptPatient?.display_name ?? 'session'}
            </Link>
          ) : (
            <Link href="/patients"
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-violet-700 transition-colors">
              <Video className="h-3.5 w-3.5" /> Start session
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active patients',   value: totalPatients ?? 0,  icon: Users,      sub: 'in your caseload',     href: '/patients' },
          { label: "Today's sessions",  value: appointments.length, icon: Calendar,   sub: `${sessionsDone} completed`, href: '/appointments' },
          { label: 'Notes generated',   value: totalNotes ?? 0,     icon: FileText,   sub: 'AI-assisted SOAP notes', href: '/notes' },
        ].map(({ label, value, icon: Icon, sub, href }) => (
          <Link key={label} href={href}
            className="group rounded-lg border border-white/40 bg-white/60 backdrop-blur-md p-4 hover:bg-white/80 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</p>
                <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground/70">{sub}</p>
              </div>
              <div className="rounded-md bg-muted p-2 group-hover:bg-slate-200 transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Today's schedule */}
        <div className="col-span-2 rounded-lg border border-white/40 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-purple-200/50">
            <h2 className="text-[13px] font-semibold text-foreground">Today&apos;s schedule</h2>
            <Link href="/appointments" className="flex items-center gap-0.5 text-[12px] text-violet-600 hover:text-violet-700">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="py-12 text-center px-6">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-[13px] font-medium text-muted-foreground">No sessions scheduled for today</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                {nextAppt
                  ? `Next session: ${nextApptPatient?.display_name ?? ''} · ${new Date(nextAppt.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
                  : 'Use "Schedule session" above to book upcoming sessions.'}
              </p>
            </div>
          ) : (
            appointments.map((appt, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = (Array.isArray(appt.patient) ? appt.patient[0] : appt.patient) as { id: string; display_name: string; diagnosis: string[] } | null;
              const cfg = statusMap[appt.status as keyof typeof statusMap] || statusMap.scheduled;
              const canStart = ['confirmed', 'scheduled'].includes(appt.status);
              const isDone   = appt.status === 'completed';
              const time     = new Date(appt.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
              return (
                <div key={appt.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${cfg.row} ${i < appointments.length - 1 ? 'border-b border-purple-200/30' : ''}`}>
                  <div className="w-16 flex-none text-right">
                    <span className={`text-[12px] font-medium ${isDone ? 'text-muted-foreground/40' : 'text-foreground/70'}`}>{time}</span>
                  </div>
                  <div className={`h-2 w-2 rounded-full flex-none ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium truncate ${isDone ? 'text-muted-foreground/70' : 'text-foreground'}`}>
                      {p?.display_name || 'Unknown patient'}
                    </p>
                    <p className="text-[13px] text-muted-foreground/70 truncate">
                      {p?.diagnosis?.[0] || '—'} · {appt.duration_minutes} min · {appt.modality?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-none">
                    <span className={`text-[12px] font-medium ${appt.status === 'in_session' ? 'text-green-600' : isDone ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                      {cfg.label}
                    </span>
                    {appt.status === 'in_session' && (
                      <Link href={`/session/${appt.id}`}
                        className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-green-700 transition-colors">
                        <Circle className="h-2 w-2 fill-white" /> Resume
                      </Link>
                    )}
                    {canStart && (
                      <Link href={`/session/${appt.id}`}
                        className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-violet-700 transition-colors">
                        <Play className="h-2.5 w-2.5 fill-white" /> Start
                      </Link>
                    )}
                    {isDone && (
                      <Link href={`/notes/${appt.id}`}
                        className="flex items-center gap-1 text-[12px] text-muted-foreground/70 hover:text-foreground/70 transition-colors">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Note
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Recent notes */}
          <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-200/50">
              <h2 className="text-[13px] font-semibold text-foreground">Recent notes</h2>
              <Link href="/notes" className="text-[13px] text-violet-600 hover:text-violet-700 flex items-center gap-0.5">
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {!recentSessions || recentSessions.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
                <p className="text-[13px] text-muted-foreground">No notes yet</p>
                <p className="text-[12px] text-muted-foreground/60 mt-0.5">Start a session to generate notes</p>
              </div>
            ) : (
              recentSessions.map((s, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = (Array.isArray(s.patient) ? s.patient[0] : s.patient) as { id: string; display_name: string; diagnosis: string[] } | null;
                return (
                  <Link key={s.id} href={`/notes/${s.id}`}
                    className={`block px-4 py-3 hover:bg-white/40 transition-colors ${i < recentSessions.length - 1 ? 'border-b border-purple-200/30' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-foreground">{p?.display_name || '—'}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {s.session_summary || 'No summary yet'}
                    </p>
                    <span className="text-xs text-muted-foreground/70 mt-1 block">{relDate(s.started_at)}</span>
                  </Link>
                );
              })
            )}
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-purple-200/50 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
                <h2 className="text-[13px] font-semibold text-foreground">Coming up</h2>
              </div>
              {upcoming.map((a, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = (Array.isArray(a.patient) ? a.patient[0] : a.patient) as { display_name: string } | null;
                const time = new Date(a.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
                return (
                  <div key={a.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < upcoming.length - 1 ? 'border-b border-purple-200/30' : ''}`}>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-none" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{p?.display_name || '—'}</p>
                      <p className="text-[13px] text-muted-foreground/70">{time} · {a.modality?.replace('_', ' ')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
