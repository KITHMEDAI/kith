import { promises as fs } from 'fs';
import path from 'path';
import { copilotAllowed } from '@/lib/copilot/guard';

// Serves a synthesized "Steve" clip so the copilot's real audio path
// (media stream → worklet → Deepgram → cards) can be tested without a live
// call. Regenerate with scripts/copilot-test/make-sample.ps1. Local-only.
export async function GET(req: Request) {
  if (!copilotAllowed(req)) return new Response('Not found', { status: 404 });
  try {
    const wav = await fs.readFile(path.join(process.cwd(), 'scripts', 'copilot-test', 'steve-sample.wav'));
    return new Response(new Uint8Array(wav), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('Test clip missing: run scripts/copilot-test/make-sample.ps1', { status: 404 });
  }
}
