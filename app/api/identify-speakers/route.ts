import { NextRequest, NextResponse } from 'next/server';
import type { TranscriptSegment } from '@/types';

export const maxDuration = 30;

export type SpeakerInfo = {
  role: 'clinician' | 'patient' | 'unknown';
  name: string | null;      // extracted from conversation ("my name is Rohan", "Dr. Sharma")
  display: string;          // what to show in UI: "Dr. Sharma", "Rohan (Patient)", "Therapist"
};

export type SpeakerMap = Record<string, SpeakerInfo>;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const segments: TranscriptSegment[] = body.segments || [];
  const patientName: string = body.patientName || '';

  if (segments.length < 3) {
    return NextResponse.json({ speakers: {} });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: first speaker = clinician, rest = patient
    return NextResponse.json({ speakers: buildFallback(segments, patientName) });
  }

  // Build a compact transcript snippet (max 40 segments to keep tokens low)
  const snippet = segments
    .slice(0, 40)
    .map(s => `${s.speaker}: ${s.text.trim()}`)
    .join('\n');

  // Unique speaker labels present
  const speakerLabels = Array.from(new Set(segments.map(s => s.speaker)));

  const prompt = `You are analysing a therapy session transcript to identify who each speaker is.
The transcript was recorded on a SINGLE laptop microphone with everyone in the same room.
Speaker labels (Speaker A, B, C…) are assigned by voice diarization — they are based on voice characteristics, not identity.

RULES for identifying roles:
- CLINICIAN (therapist/doctor): opens the session, asks structured/reflective questions, uses clinical language, assigns homework, guides the conversation, refers to diagnosis/techniques.
- PATIENT: shares personal experiences, emotions, struggles, daily events, responds to the clinician's questions.
- If there are 3+ speakers, additional ones are likely family members or a co-therapist.

RULES for extracting names:
- Look for phrases like "I'm [Name]", "My name is [Name]", "Hello [Name]", "Dr. [Name]", "Thank you [Name]", "You mentioned [Name]".
- The registered patient name is: "${patientName || 'unknown'}" — use this as a hint if a matching name appears.

Speakers present: ${speakerLabels.join(', ')}

TRANSCRIPT SAMPLE:
${snippet}

Return ONLY valid compact JSON — one object per speaker label:
{
  "Speaker A": { "role": "clinician", "name": "Priya Sharma", "display": "Dr. Sharma" },
  "Speaker B": { "role": "patient",   "name": "Rohan",        "display": "Rohan (Patient)" }
}

Rules for "display":
- Clinician with name: "Dr. [Surname]" or just "[Name]"
- Clinician without name: "Therapist"
- Patient with name: "[Name]"
- Patient without name: "Patient"
- Unknown: "Speaker X"`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Anthropic = require('@anthropic-ai/sdk').default;
    const client = new Anthropic({ apiKey });

    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text  = res.content[0]?.type === 'text' ? res.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ speakers: buildFallback(segments, patientName) });

    const raw = JSON.parse(match[0]) as Record<string, { role: string; name: string | null; display: string }>;

    // Normalise and fill any missing speakers
    const speakers: SpeakerMap = {};
    for (const label of speakerLabels) {
      const r = raw[label];
      if (r) {
        speakers[label] = {
          role: (r.role === 'clinician' || r.role === 'patient') ? r.role : 'unknown',
          name: r.name || null,
          display: r.display || label,
        };
      } else {
        speakers[label] = { role: 'unknown', name: null, display: label };
      }
    }

    return NextResponse.json({ speakers });
  } catch (err) {
    console.error('[Kith] identify-speakers error:', err);
    return NextResponse.json({ speakers: buildFallback(segments, patientName) });
  }
}

function buildFallback(segments: TranscriptSegment[], patientName: string): SpeakerMap {
  const labels = Array.from(new Set(segments.map(s => s.speaker))).sort();
  const map: SpeakerMap = {};
  labels.forEach((label, i) => {
    if (i === 0) {
      map[label] = { role: 'clinician', name: null, display: 'Therapist' };
    } else {
      const name = i === 1 && patientName ? patientName.split(' ')[0] : null;
      map[label] = { role: 'patient', name, display: name || 'Patient' };
    }
  });
  return map;
}
