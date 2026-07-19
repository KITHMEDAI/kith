import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Sniffs the actual file signature instead of trusting the client-supplied
// `file.type` — a renamed/relabeled upload (e.g. an SVG or HTML payload sent
// as "image/png") would otherwise land in public storage with whatever
// content-type the client claimed.
function sniffImageType(buf: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  return null;
}

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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Re-derive the content-type from the actual bytes — never trust the
  // declared `file.type` for what gets written to public storage.
  const sniffedType = sniffImageType(buffer);
  if (!sniffedType) {
    return NextResponse.json({ error: 'File content does not match a supported image format' }, { status: 400 });
  }

  const ext = sniffedType.split('/')[1].replace('jpeg', 'jpg');
  const path = `${user.id}/avatar.${ext}`;

  // Use the service-role client for storage so the upload isn't blocked by a
  // missing storage.objects RLS policy (same pattern as the patient import).
  // Safe: the user is authenticated above and the path is scoped to user.id.
  const storage = createServiceRoleClient();

  // Upload (upsert) to kith-avatars bucket
  const { error: uploadError } = await storage.storage
    .from('kith-avatars')
    .upload(path, buffer, {
      contentType: sniffedType,
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
