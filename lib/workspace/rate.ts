/**
 * lib/workspace/rate.ts
 *
 * Persistent rate limits for Kith Workspace, shared by every serverless
 * instance (Postgres `ws_rate_hit`, migration 003). The in-memory limiter in
 * lib/rate-limit.ts resets on every cold start, so it can't bound AI spend.
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const HOUR = 3600;
const DAY = 86400;

/** Per-user limits for each costly action: [max, windowSeconds][]. */
export const LIMITS = {
  note:     [[40, HOUR], [150, DAY]],
  retry:    [[10, HOUR], [30, DAY]],
  revise:   [[40, HOUR], [200, DAY]],
  edit:     [[120, HOUR], [600, DAY]],
  ask:      [[60, HOUR], [300, DAY]],
  search:   [[120, HOUR], [1000, DAY]],
  profile:  [[20, HOUR], [60, DAY]],
  token:    [[30, HOUR], [150, DAY]],
  upload:   [[30, HOUR], [150, DAY]],
  signupIp: [[10, HOUR], [30, DAY]],
  signupEmail: [[5, HOUR], [10, DAY]],
  verifyEmail: [[10, HOUR], [30, DAY]],
} as const satisfies Record<string, ReadonlyArray<readonly [number, number]>>;

/** Daily budget of recording minutes re-transcribed by the polish pass. */
export const AUDIO_MINUTES_PER_DAY = 8 * 60;

/**
 * Counts one hit (or `cost`) against `key` for each window. Returns seconds to
 * wait (0 = allowed). If the database is unreachable, falls back to the
 * per-instance limiter rather than blocking everyone.
 */
export async function rateHit(key: string, windows: ReadonlyArray<readonly [number, number]>, cost = 1): Promise<number> {
  const service = createServiceRoleClient();
  let wait = 0;
  for (const [max, secs] of windows) {
    const { data, error } = await service.rpc('ws_rate_hit', { p_key: `${key}:${secs}`, p_max: max, p_window_seconds: secs, p_cost: cost });
    if (error) {
      const local = checkRateLimit(`${key}:${secs}`, max, secs * 1000);
      if (!local.allowed) wait = Math.max(wait, local.retryAfterSec);
      continue;
    }
    wait = Math.max(wait, Number(data) || 0);
  }
  return wait;
}

/** 429 response when over the limit, else null. */
export async function limited(key: string, windows: ReadonlyArray<readonly [number, number]>, message: string): Promise<NextResponse | null> {
  const wait = await rateHit(key, windows);
  if (!wait) return null;
  return NextResponse.json({ error: message }, { status: 429, headers: { 'Retry-After': String(wait) } });
}

/** Client IP as seen by Vercel (not spoofable there, unlike x-forwarded-for's first hop). */
export function clientIp(req: Request): string {
  return req.headers.get('x-real-ip')
    || req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
    || 'unknown';
}
