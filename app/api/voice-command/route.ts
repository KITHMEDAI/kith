import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseVoiceCommand } from '@/lib/voice-commands';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transcript } = await req.json();
  if (!transcript) return NextResponse.json({ error: 'No transcript' }, { status: 400 });

  const command = parseVoiceCommand(transcript);
  return NextResponse.json({ command });
}
