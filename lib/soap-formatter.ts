/**
 * lib/soap-formatter.ts
 *
 * Single-shot note formatting for the public, unauthenticated demo tool at
 * /soap-formatter. Deliberately simpler than the real session pipeline in
 * lib/claude.ts (no Haiku compression stage, no Patient/TranscriptSegment
 * typing, no risk-flag/homework fields) — this only demonstrates the
 * "messy notes in, structured note out" idea, it isn't the clinical
 * pipeline itself. Nothing submitted here is persisted anywhere.
 *
 * Two formats: SOAP (general practice) and EMDR (target/SUD/VOC/phase —
 * the structured, measurement-driven format EMDR-trained therapists
 * actually use, distinct from generic SOAP).
 */
import { anthropic, SONNET } from './claude';

export type NoteFormat = 'soap' | 'emdr';

export interface FormattedNote {
  [key: string]: string;
}

const UNAVAILABLE_MESSAGE = 'AI formatting is temporarily unavailable — please try again shortly.';

const SOAP_SHAPE = '{"subjective":"...","objective":"...","assessment":"...","plan":"..."}';
const SOAP_RULES = `- Subjective: what the patient reported, in their own frame.
- Objective: what was observed (affect, presentation, engagement) — if the input has no observational detail, write "Not specified in the notes provided."
- Assessment: clinical interpretation / progress read, grounded only in what's in the input — do not invent a diagnosis or risk level that isn't implied.
- Plan: next steps, homework, or focus for next session, grounded only in what's in the input.`;

const EMDR_SHAPE = '{"target":"...","sudVoc":"...","cognitions":"...","phasePlan":"..."}';
const EMDR_RULES = `- target: the specific memory, image, or belief being processed this session.
- sudVoc: SUD (Subjective Units of Distress, 0-10) and VOC (Validity of Cognition, 1-7) ratings, before and after if mentioned — if not mentioned, write "Not specified in the notes provided."
- cognitions: the negative cognition (NC) and positive cognition (PC) worked with this session, grounded only in what's in the input.
- phasePlan: which phase of the EMDR protocol was addressed (e.g. assessment, desensitization, installation, body scan, closure) and the focus for next session.`;

const SOAP_LABELS = ['subjective', 'objective', 'assessment', 'plan'];
const EMDR_LABELS = ['target', 'sudVoc', 'cognitions', 'phasePlan'];

export async function formatNote(rawText: string, format: NoteFormat = 'soap'): Promise<FormattedNote> {
  const client = anthropic();
  if (!client) throw new Error(UNAVAILABLE_MESSAGE);

  const isEmdr = format === 'emdr';
  const shape = isEmdr ? EMDR_SHAPE : SOAP_SHAPE;
  const rules = isEmdr ? EMDR_RULES : SOAP_RULES;
  const labels = isEmdr ? EMDR_LABELS : SOAP_LABELS;
  const styleName = isEmdr ? 'an EMDR (Eye Movement Desensitization and Reprocessing) session note' : 'a clean SOAP note';

  const prompt = `You are formatting a therapist's rough session notes into ${styleName}. The input may be a messy transcript excerpt, shorthand notes, or a stream-of-consciousness recap — infer clinical structure from it.

Return ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
${shape}

Rules:
${rules}
- Each field is 1-3 concise sentences. Never fabricate details, quotes, ratings, or clinical findings beyond what's implied by the input.

INPUT NOTES:
${rawText}`;

  const res = await client.messages.create({
    model: SONNET,
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(UNAVAILABLE_MESSAGE);

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const note: FormattedNote = {};
    for (const key of labels) {
      note[key] = String(parsed[key] || '').trim();
    }
    return note;
  } catch {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
}
