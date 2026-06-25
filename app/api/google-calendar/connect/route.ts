import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/google-calendar';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: therapist } = await supabase
      .from('therapists')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!therapist) return NextResponse.json({ error: 'No profile' }, { status: 404 });

    const url = getAuthUrl(therapist.id);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }
}
