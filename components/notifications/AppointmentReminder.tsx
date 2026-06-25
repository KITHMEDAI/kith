'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, X, Play } from 'lucide-react';

// In-app reminder for upcoming sessions. The doctor keeps Kith open on their
// laptop, so a polled in-app toast (plus a browser notification) is the most
// reliable way to surface "a booked slot is starting soon" without depending on
// external cron/SMS infrastructure. Fires once per appointment (deduped in
// localStorage so a page reload doesn't re-alert).

const LEAD_MIN = 15;            // alert when a session is within this many minutes
const POLL_MS = 60_000;
const STORE_KEY = 'kith_reminded_appts';

interface ApptRow {
  id: string;
  scheduled_at: string;
  status: string;
  patient?: { display_name?: string } | null;
}
interface Reminder { id: string; patientName: string; scheduledAt: string; minutes: number }

function loadReminded(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}
function saveReminded(map: Record<string, number>) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AppointmentReminder() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const remindedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    remindedRef.current = loadReminded();
    // Prune entries older than a day so the store doesn't grow forever.
    const now = Date.now();
    let changed = false;
    for (const k of Object.keys(remindedRef.current)) {
      if (now - remindedRef.current[k] > 86_400_000) { delete remindedRef.current[k]; changed = true; }
    }
    if (changed) saveReminded(remindedRef.current);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const check = useCallback(async () => {
    const now = Date.now();
    const from = new Date(now).toISOString();
    const to = new Date(now + (LEAD_MIN + 1) * 60_000).toISOString();
    let rows: ApptRow[] = [];
    try {
      const res = await fetch(`/api/appointments?from=${from}&to=${to}`);
      if (!res.ok) return;                       // 401 when signed out — stay quiet
      rows = await res.json();
    } catch { return; }
    if (!Array.isArray(rows)) return;

    const fresh: Reminder[] = [];
    for (const a of rows) {
      if (!['scheduled', 'confirmed'].includes(a.status)) continue;
      const mins = Math.round((new Date(a.scheduled_at).getTime() - Date.now()) / 60_000);
      if (mins < 0 || mins > LEAD_MIN) continue;
      if (remindedRef.current[a.id]) continue;   // already alerted
      remindedRef.current[a.id] = Date.now();
      const name = a.patient?.display_name || 'a patient';
      fresh.push({ id: a.id, patientName: name, scheduledAt: a.scheduled_at, minutes: mins });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('Upcoming session — Kith', { body: `${name} in ${mins} min (${fmtTime(a.scheduled_at)})`, tag: a.id }); } catch { /* ignore */ }
      }
    }
    if (fresh.length) {
      saveReminded(remindedRef.current);
      setReminders(prev => [...prev, ...fresh]);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  if (reminders.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-3">
      <style>{`@keyframes kithToastIn { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      {reminders.map(r => (
        <div key={r.id} className="rounded-xl border border-violet-200 bg-white p-4 shadow-2xl" style={{ animation: 'kithToastIn 0.25s ease-out' }}>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {r.minutes <= 0 ? 'Session starting now' : `Session in ${r.minutes} min`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 truncate">{r.patientName} · {fmtTime(r.scheduledAt)}</p>
              <Link
                href={`/session/${r.id}`}
                onClick={() => setReminders(prev => prev.filter(x => x.id !== r.id))}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
                <Play className="h-3 w-3 fill-white" /> Start session
              </Link>
            </div>
            <button onClick={() => setReminders(prev => prev.filter(x => x.id !== r.id))}
              className="flex-none text-slate-300 hover:text-slate-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
