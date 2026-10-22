import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';
import { sameOrigin } from '@/lib/workspace/rate';

// Sign out in one round trip: clear the session cookies and redirect to
// sign-in. POST only (a GET link or <img> on another site can't sign anyone
// out), from this site's own pages only. `scope=global` (form field) signs out
// every device by revoking all of the account's sessions.
export async function POST(request: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });
  if (!sameOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  const { origin } = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const scope = form?.get('scope') === 'global' ? 'global' : 'local';
  await createServerSupabaseClient().auth.signOut({ scope }).catch(() => {});
  return NextResponse.redirect(`${origin}/login${scope === 'global' ? '?signedout=all' : ''}`, { status: 303 });
}
