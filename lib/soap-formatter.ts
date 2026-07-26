/**
 * lib/soap-formatter.ts
 *
 * Single-shot SOAP formatting for the public, unauthenticated demo tool at
 * /soap-formatter. Deliberately simpler than the real session pipeline in
 * lib/claude.ts (no Haiku compression stage, no Patient/TranscriptSegment
 * typing, no risk-flag/homework/plan fields) — this only demonstrates the
 * "messy notes in, structured SOAP note out" idea, it isn't the clinical
 * pipeline itself. Nothing submitted here is persisted anywhere.
 */
import { anthropic, SONNET } from './claude';

export interface FormattedSoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const UNAVAILABLE_MESSAGE = 'AI formatting is temporarily unavailable — please try again shortly.';

export async function formatAsSoapNote(rawText: string): Promise<FormattedSoapNote> {
  const client = anthropic();
  if (!client) throw new Error(UNAVAILABLE_MESSAGE);

  const prompt = `You are formatting a therapist's rough session notes into a clean SOAP note. The input may be a messy transcript excerpt, shorthand notes, or a stream-of-consciousness recap — infer clinical structure from it.

Return ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
{"subjective":"...","objective":"...","assessment":"...","plan":"..."}

Rules:
- Subjective: what the patient reported, in their own frame.
- Objective: what was observed (affect, presentation, engagement) — if the input has no observational detail, write "Not specified in the notes provided."
- Assessment: clinical interpretation / progress read, grounded only in what's in the input — do not invent a diagnosis or risk level that isn't implied.
- Plan: next steps, homework, or focus for next session, grounded only in what's in the input.
- Each field is 1-3 concise sentences. Never fabricate details, quotes, or clinical findings beyond what's implied by the input.

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
    return {
      subjective: String(parsed.subjective || '').trim(),
      objective: String(parsed.objective || '').trim(),
      assessment: String(parsed.assessment || '').trim(),
      plan: String(parsed.plan || '').trim(),
    };
  } catch {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
}
