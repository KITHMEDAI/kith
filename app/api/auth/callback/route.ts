/**
 * GET /api/auth/callback
 *
 * OAuth callback for Supabase sign-in (currently: Google). Exchanges the auth
 * code for a session, then — on a brand-new account — bootstraps the
 * `therapists` profile row from whatever Google gave us (name, email, photo).
 * Existing accounts are left untouched (we never overwrite a doctor's own
 * edits on a later login).
 */
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Pull the richest display name + photo URL Google provides. Supabase exposes
// the IdP's claims as user_metadata — field names vary slightly by provider
// version, so check the common aliases.
function extractGoogleProfile(metadata: Record<string, unknown>) {
  const displayName =
    (metadata.full_name as string) ||
    (metadata.name as string) ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(' ') ||
    null;
  const pictureUrl = (metadata.avatar_url as string) || (metadata.picture as string) || null;
  return { displayName, pictureUrl };
}

// Best-effort: download the Google profile photo and re-host it in our own
// storage bucket, so it keeps working even if the Google URL later expires.
// Never blocks sign-in if this fails.
async function mirrorAvatar(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  pictureUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(pictureUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const buffer = new Uint8Array(await res.arrayBuffer());
    const path = `${userId}/avatar.${ext}`;
    const { error } = await admin.storage.from('kith-avatars').upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) return null;
    const { data } = admin.storage.from('kith-avatars').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from('therapists')
    .select('id, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    // First-ever sign-in (Google sign-up) — create the profile from whatever
    // Google gave us. onboarding_completed stays false so the dashboard
    // layout routes them through onboarding to fill in clinic details.
    const { displayName, pictureUrl } = extractGoogleProfile(user.user_metadata || {});
    const avatarUrl = pictureUrl ? await mirrorAvatar(admin, user.id, pictureUrl) : null;

    await admin.from('therapists').upsert(
      {
        user_id: user.id,
        display_name: displayName || user.email?.split('@')[0] || 'Doctor',
        email: user.email,
        avatar_url: avatarUrl,
        booking_source: 'google_oauth',
        onboarding_completed: false,
        timezone: 'Asia/Kolkata',
        languages_spoken: ['English'],
        default_session_duration: 50,
        specializations: [],
      },
      { onConflict: 'user_id' },
    );
  } else if (!existing.avatar_url) {
    // Returning user with no profile photo yet — fill it in from Google,
    // but never touch anything they've already set themselves.
    const { pictureUrl } = extractGoogleProfile(user.user_metadata || {});
    if (pictureUrl) {
      const avatarUrl = await mirrorAvatar(admin, user.id, pictureUrl);
      if (avatarUrl) await admin.from('therapists').update({ avatar_url: avatarUrl }).eq('id', existing.id);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
