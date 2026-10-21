import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';

// Magic-link and Google sign-in both land here with ?code=… (PKCE).
export async function GET(request: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.redirect(`${origin}/login?error=link`);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  // The workspace layout sends first-time users to onboarding.
  return NextResponse.redirect(`${origin}/`);
}
