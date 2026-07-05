// Simple in-memory rate limiter, keyed by an arbitrary string (therapist ID +
// route name). Same pattern already used in /api/sessions/start — good enough
// for a single-instance deployment; swap for Redis/Upstash if this ever runs
// across multiple serverless instances that need to share counters.
const buckets = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - entry.windowStart)) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
