/**
 * GET /api/leads/unsubscribe?id=<lead uuid>
 *
 * One-click unsubscribe from every nurture/marketing email — no auth
 * required (standard for email unsubscribe links), keyed by the lead's
 * unguessable UUID rather than a raw email so the link can't be used to
 * probe for someone else's subscription status. Worst case if misused is
 * someone else's marketing emails get turned off — never a data exposure.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return new NextResponse('Missing unsubscribe link — nothing to do.', { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('leads')
    .update({ unsubscribed_at: new Date().toISOString(), nurture_next_at: null })
    .eq('id', id);

  if (error) {
    console.error('[leads/unsubscribe] update failed:', error.message);
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed — Kith</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:420px;margin:80px auto;padding:0 24px;text-align:center;color:#1e1b3a}</style>
</head><body>
<h2>You're unsubscribed</h2>
<p>No further emails from this list. If that was a mistake, just sign up again from any Kith guide.</p>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
