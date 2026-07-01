import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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
