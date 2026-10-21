import { promises as fs } from 'fs';
import path from 'path';

// DEV-ONLY: serves synthesized meeting audio for testing the meeting recorder
// without a real call. 404 in production.
export async function GET() {
  if (process.env.NODE_ENV === 'production') return new Response('Not found', { status: 404 });
  try {
    const wav = await fs.readFile(path.join(process.cwd(), 'scripts', 'workspace-eval', 'meeting-audio', 'meeting.wav'));
    return new Response(new Uint8Array(wav), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('No test audio', { status: 404 });
  }
}
