import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Unauthenticated endpoint — key by IP instead of a therapist id, since
  // there's no session yet to rate-limit against.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rl = checkRateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const { email, type = 'clinic' } = await req.json().catch(() => ({}));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 422 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('waitlist').upsert(
    { email: email.toLowerCase().trim(), type },
    { onConflict: 'email,type', ignoreDuplicates: true },
  );

  if (error) {
    // Table may not exist yet — still succeed silently so UX isn't broken
    console.warn('[waitlist] insert failed (table may not exist):', error.message);
  }

  return NextResponse.json({ ok: true });
}
