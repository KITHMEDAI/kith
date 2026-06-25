import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// ── POST /api/profile/avatar ──────────────────────────────────────────────────
// Accepts multipart/form-data with a "file" field.
// Uploads to Supabase Storage (kith-avatars bucket) and saves avatar_url to DB.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // Validate type
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 });
  }

  // Validate size (max 10 MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB) — max 10 MB` }, { status: 400 });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${user.id}/avatar.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Use the service-role client for storage so the upload isn't blocked by a
  // missing storage.objects RLS policy (same pattern as the patient import).
  // Safe: the user is authenticated above and the path is scoped to user.id.
  const storage = createServiceRoleClient();

  // Upload (upsert) to kith-avatars bucket
  const { error: uploadError } = await storage.storage
    .from('kith-avatars')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: { publicUrl } } = storage.storage
    .from('kith-avatars')
    .getPublicUrl(path);

  // Cache-bust with timestamp so browser refreshes the image
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  // Save to therapists table
  const { error: dbError } = await supabase
    .from('therapists')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: avatarUrl });
}
