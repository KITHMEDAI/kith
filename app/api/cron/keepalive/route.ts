/**
 * GET /api/cron/keepalive
 *
 * Pinged daily by a Vercel Cron (see vercel.json). Makes one trivial Supabase
 * query so the FREE-tier Supabase project registers activity and never hits the
 * ~7-day idle auto-pause (which otherwise breaks login with "Failed to fetch").
 *
 * Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
 */
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runWorkspaceCleanup } from '@/lib/workspace/cleanup';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Fail closed if the secret isn't configured — an unset env var used to
  // leave this endpoint wide open instead of blocking it.
  const expected = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${expected ?? ''}`);
  if (!expected || got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = createServiceRoleClient();
    // Cheapest possible query — count-only, no rows returned. Just enough to
    // count as project activity and keep Supabase awake.
    // Kith Workspace runs this same cron against its own (Sydney) database.
    const table = process.env.NEXT_PUBLIC_EDITION === 'workspace' ? 'ws_profiles' : 'therapists';
    const { error } = await db.from(table).select('*', { head: true, count: 'exact' });
    if (error) throw error;
    // Workspace: delete leftover recordings / fail stuck notes (retention).
    const cleanup = process.env.NEXT_PUBLIC_EDITION === 'workspace' ? await runWorkspaceCleanup() : undefined;
    return NextResponse.json({ ok: true, pinged_at: new Date().toISOString(), cleanup });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'keepalive failed' },
      { status: 500 },
    );
  }
}
