import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: NextRequest) {
  if (USE_MOCK) {
    // In mock/demo mode, simulate a successful registration and redirect to onboarding
    return NextResponse.json({ ok: true, userId: 'mock-user-id' });
  }

  try {
    const body = await req.json();
    const {
      email, password, display_name,
      phone,           // business phone
      personal_phone,
      clinic_name,
      clinic_address,
      designation,     // highest degree
      booking_source,
      booking_url,
    } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Business phone is required' }, { status: 400 });
    }
    if (!clinic_name) {
      return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 });
    }

    const admin = createServiceRoleClient();

    // 1. Create auth user via the admin API (not auth.signUp()) — signUp() triggers
    // a confirmation-email send that we immediately discard anyway (email_confirm:
    // true below skips it), and that wasted send burns Supabase's shared-mailer
    // rate limit hard enough to lock out all new signups project-wide.
    const { data: auth, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    });

    if (authErr) {
      const msg = authErr.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been registered')) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.', code: 'EMAIL_EXISTS' }, { status: 409 });
      }
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }
    if (!auth.user) return NextResponse.json({ error: 'Signup failed — please try again' }, { status: 500 });

    // 2. Upsert therapist profile (service role bypasses RLS)
    // Use upsert so that retrying registration after a partial failure never causes a duplicate key error
    const { error: profileErr } = await admin.from('therapists').upsert({
      user_id:          auth.user.id,
      display_name,
      email,
      phone:            phone || null,
      clinic_name:      clinic_name || null,
      clinic_address:   clinic_address || null,
      designation:      designation || null,
      booking_source:   booking_source || 'none',
      booking_url:      booking_url || null,
      onboarding_completed: false,
      // sensible defaults
      timezone:         'Asia/Kolkata',
      languages_spoken: ['English'],
      default_session_duration: 50,
      specializations:  [],
    }, { onConflict: 'user_id' });

    if (profileErr) {
      await admin.auth.admin.deleteUser(auth.user.id);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId: auth.user.id });
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration failed' },
      { status: 500 }
    );
  }
}
