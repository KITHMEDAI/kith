/**
 * POST /api/soap-formatter
 *
 * Public, unauthenticated demo tool — paste rough session notes, get back a
 * structured SOAP note. Rate-limited by IP; input length capped to bound
 * cost and abuse. Nothing submitted here is stored — formatted in memory
 * and returned directly, same as toPlainEnglish() in lib/claude.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { formatAsSoapNote } from '@/lib/soap-formatter';

const MAX_INPUT_CHARS = 4000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rl = checkRateLimit(`soap-formatter:${ip}`, 8, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const { text } = await req.json().catch(() => ({ text: undefined }));
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Paste some session notes first.' }, { status: 422 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_INPUT_CHARS} characters for this demo.` },
      { status: 422 },
    );
  }

  try {
    const note = await formatAsSoapNote(text.trim());
    return NextResponse.json({ note });
  } catch (err) {
    console.error('[soap-formatter] failed:', err);
    return NextResponse.json(
      { error: 'AI formatting is temporarily unavailable — please try again shortly.' },
      { status: 503 },
    );
  }
}
