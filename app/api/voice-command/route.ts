import { NextRequest, NextResponse } from 'next/server';
import { parseVoiceCommand } from '@/lib/voice-commands';

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();
  if (!transcript) return NextResponse.json({ error: 'No transcript' }, { status: 400 });

  const command = parseVoiceCommand(transcript);
  return NextResponse.json({ command });
}
