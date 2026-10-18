import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { copilotAllowed } from '@/lib/copilot/guard';

// Saves the call transcript locally for Anurag's own call notes. The folder is
// git-ignored — the transcript is private and must never be shared/published.
const NOTES_DIR = path.join(process.cwd(), 'docs', 'partnerships', 'steve-agi-c51', 'call-notes');

export async function POST(req: Request) {
  if (!copilotAllowed(req)) return new NextResponse('Not found', { status: 404 });
  const body = await req.json().catch(() => null) as { markdown?: string; startedAt?: string } | null;
  if (!body?.markdown) return NextResponse.json({ error: 'Empty transcript' }, { status: 422 });

  const stamp = (body.startedAt || new Date().toISOString()).replace(/[:T]/g, '-').slice(0, 16);
  const file = path.join(NOTES_DIR, `${stamp}-transcript.md`);
  await fs.mkdir(NOTES_DIR, { recursive: true });
  await fs.writeFile(file, body.markdown, 'utf8');
  return NextResponse.json({ saved: path.relative(process.cwd(), file) });
}
