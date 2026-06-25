// AssemblyAI was replaced by Deepgram for real-time transcription.
// This endpoint is kept as a stub to avoid 404s on any lingering webhook registrations.
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'AssemblyAI integration deprecated — using Deepgram' }, { status: 410 });
}
