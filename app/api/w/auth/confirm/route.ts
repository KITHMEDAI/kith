import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IS_WORKSPACE } from '@/lib/workspace/server';

// Landing point for the sign-in email: verifies the one-time token and sets
// the session cookie, then sends the user into the app (onboarding if new).
export async function GET(request: Request) {
  if (!IS_WORKSPACE) return new NextResponse('Not found', { status: 404 });
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = (searchParams.get('type') || 'magiclink') as EmailOtpType;
  if (!tokenHash) return NextResponse.redirect(`${origin}/login?error=link`);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  return NextResponse.redirect(`${origin}/`);
}
