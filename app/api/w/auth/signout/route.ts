import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';

// Sign out of THIS device in one round trip: clear the session cookies on the
// server and redirect straight to sign-in (other devices stay signed in).
export async function GET(request: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });
  const { origin } = new URL(request.url);
  await createServerSupabaseClient().auth.signOut({ scope: 'local' }).catch(() => {});
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
