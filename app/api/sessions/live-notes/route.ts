import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateLiveNotesUpdate } from '@/lib/claude';
import { z } from 'zod';

const Schema = z.object({
  session_id: z.string().uuid(),
  transcript_segments: z.array(z.object({
    speaker: z.enum(['doctor', 'patient']),
    text: z.string(),
    start_ms: z.number(),
    end_ms: z.number(),
    confidence: z.number(),
    is_partial: z.boolean(),
  })),
});

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = await generateLiveNotesUpdate({ transcript: parsed.data.transcript_segments as any, patient: { id: '', display_name: 'Patient', diagnosis: [] } as any, sessionNumber: 1 });
    return NextResponse.json(update);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
