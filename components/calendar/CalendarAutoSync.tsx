'use client';

import { useEffect } from 'react';

// Headless component: silently syncs Google Calendar on mount and on an interval
// while the page is open, refreshing the view only when new events are imported.
// Drop it anywhere on a page that shows appointments (dashboard, schedule, etc.).
export default function CalendarAutoSync({ intervalMs = 60_000 }: { intervalMs?: number }) {
  useEffect(() => {
    let cancelled = false;
    async function autoSync() {
      try {
        const res = await fetch('/api/google-calendar/sync', { method: 'POST' });
        if (!res.ok) return; // not connected / offline — stay quiet
        const data = await res.json();
        if (!cancelled && data.synced > 0) window.location.reload();
      } catch {
        /* silent background sync */
      }
    }
    autoSync();
    const id = setInterval(autoSync, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return null;
}
