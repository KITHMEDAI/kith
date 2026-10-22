import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/workspace/server';
import { FIELD_MAP } from '@/lib/workspace/fields';
import { NOTE_TYPE_MAP } from '@/lib/workspace/note-types';
import { generateFieldProfile } from '@/lib/workspace/generate';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { limited, LIMITS } from '@/lib/workspace/rate';

// Create/update the user's profile (onboarding + later tweaks).
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const name = String(body.name ?? '').trim().slice(0, 100);
  const phone = String(body.phone ?? '').trim().slice(0, 30) || null;
  const field = typeof body.field === 'string' && Object.hasOwn(FIELD_MAP, body.field) ? body.field : 'general';
  const fieldCustom = field === 'other' ? String(body.field_custom ?? '').trim().slice(0, 120) : null;
  const preferences = String(body.note_preferences ?? '').trim().slice(0, 500) || null;
  if (!name) return NextResponse.json({ error: 'Please add your name' }, { status: 422 });
  if (field === 'other' && !fieldCustom) return NextResponse.json({ error: 'Tell us your field' }, { status: 422 });
  const tooMany = await limited(`ws-profile:${user.id}`, LIMITS.profile, 'Too many changes in a short time. Try again shortly.');
  if (tooMany) return tooMany;

  const { data: existing } = await supabase.from('ws_profiles')
    .select('field, field_custom, field_profile, terms_accepted_at').eq('user_id', user.id).maybeSingle();

  // Only (re)write the AI field profile when the custom field actually changed.
  let fieldProfile = existing?.field_profile ?? null;
  if (field === 'other' && (existing?.field_custom !== fieldCustom || !fieldProfile)) {
    fieldProfile = await generateFieldProfile(fieldCustom!);
  }
  if (field !== 'other') fieldProfile = null;

  const row = {
    user_id: user.id,
    name,
    email: user.email ?? '',
    phone,
    field,
    field_custom: fieldCustom,
    field_profile: fieldProfile,
    note_preferences: preferences,
    default_note_type: NOTE_TYPE_MAP[FIELD_MAP[field].defaultNoteType] ? FIELD_MAP[field].defaultNoteType : 'general',
    // Creating the profile (onboarding) is where the Terms are accepted.
    terms_accepted_at: existing?.terms_accepted_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await createServiceRoleClient().from('ws_profiles').upsert(row);
  if (error) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
