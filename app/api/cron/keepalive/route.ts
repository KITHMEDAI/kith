/**
 * GET /api/cron/keepalive
 *
 * Pinged daily by a Vercel Cron (see vercel.json). Makes one trivial Supabase
 * query so the FREE-tier Supabase project registers activity and never hits the
 * ~7-day idle auto-pause (which otherwise breaks login with "Failed to fetch").
 *
 * Protected by CRON_SECRET when set — Vercel Cron sends it as a Bearer token.
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // If CRON_SECRET is configured, require it (Vercel Cron sends it automatically).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = createServiceRoleClient();
    // Cheapest possible query — count-only, no rows returned. Just enough to
    // count as project activity and keep Supabase awake.
    const { error } = await db.from('therapists').select('id', { head: true, count: 'exact' });
    if (error) throw error;
    return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'keepalive failed' },
      { status: 500 },
    );
  }
}
