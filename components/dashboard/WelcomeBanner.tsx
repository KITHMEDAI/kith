'use client';

import { useEffect, useState } from 'react';
import { Lock, Sparkles, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getGreeting } from '@/lib/utils';
import type { Therapist, Appointment } from '@/types';

interface Props {
  therapist: Therapist;
  todayAppointments: Appointment[];
  totalPatients: number;
}

export default function WelcomeBanner({ therapist, todayAppointments, totalPatients }: Props) {
  const [greeting, setGreeting] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setGreeting(getGreeting());
      setTime(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }));
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const completed = todayAppointments.filter(a => a.status === 'completed').length;
  const upcoming = todayAppointments.filter(a => ['scheduled', 'confirmed'].includes(a.status));
  const inSession = todayAppointments.find(a => a.status === 'in_session');
  const nextAppt = upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  const displayName = therapist.display_name;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#1E2A3A] via-[#1a3040] to-[#0f2535] p-6 text-white shadow-lg">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/10" />
      <div className="pointer-events-none absolute -bottom-12 right-24 h-40 w-40 rounded-full bg-teal-400/5" />

      <div className="relative space-y-4">
        {/* Greeting + name */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-teal-300/80">{greeting} · {time}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {displayName}
          </h1>
          {/* Credentials line */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
            {therapist.designation && <span className="font-medium text-white/80">{therapist.designation}</span>}
            {therapist.license_number && (
              <>
                <span className="text-white/30">·</span>
                <span>{therapist.designation} Reg. {therapist.license_number}</span>
              </>
            )}
            {therapist.clinic_name && (
              <>
                <span className="text-white/30">·</span>
                <span>{therapist.clinic_name}, {therapist.clinic_name}</span>
              </>
            )}
          </div>
          {/* Specialisation tags */}
          {therapist.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {therapist.specializations.map(s => (
                <span key={s} className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-medium text-teal-300 border border-teal-500/30">{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Today stats row */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          {/* Sessions today */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Calendar className="h-4 w-4 text-teal-300" />
            </div>
            <div>
              <p className="text-xs text-white/50">Today</p>
              <p className="text-sm font-semibold text-white">
                {todayAppointments.length} session{todayAppointments.length !== 1 ? 's' : ''}
                {completed > 0 && <span className="ml-1 text-white/50">· {completed} done</span>}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Total patients */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Users className="h-4 w-4 text-teal-300" />
            </div>
            <div>
              <p className="text-xs text-white/50">Active patients</p>
              <p className="text-sm font-semibold text-white">{totalPatients}</p>
            </div>
          </div>

          {/* Next appointment */}
          {nextAppt?.patient && (
            <>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                <div>
                  <p className="text-xs text-white/50">Next up</p>
                  <p className="text-sm font-semibold text-white">
                    {(nextAppt.patient as { display_name: string }).display_name} ·{' '}
                    {new Date(nextAppt.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* In-session indicator */}
          {inSession && (
            <>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-sm font-semibold text-red-300">Session in progress</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Privacy badge */}
      <div className="absolute bottom-4 right-5 flex items-center gap-1.5 text-xs text-white/40">
        <Lock className="h-3 w-3 text-emerald-400" />
        All data encrypted
      </div>
    </div>
  );
}
