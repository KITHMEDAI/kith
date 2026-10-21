/**
 * lib/workspace/generate.ts
 *
 * Generic, field-aware note generation for Kith Workspace.
 *
 * Prompt = base rules + field profile + note-type template + the user's own
 * preferences + their recent edits (style examples). Output is one structured
 * JSON shape for every field, so a single renderer handles all of them.
 *
 * AI region: currently the Anthropic API (US). An AU switch (Claude on AWS
 * Bedrock, Sydney) is planned — see docs/product/kith-workspace-au-scope.md.
 */
import { anthropic, SONNET } from '@/lib/claude';
import { FIELD_MAP } from './fields';
import { NOTE_TYPE_MAP } from './note-types';

const HAIKU = 'claude-haiku-4-5-20251001';

export interface NoteContent {
  title: string;
  summary: string;
  sections: { heading: string; points: string[] }[];
  action_items: { task: string; owner: string | null; due: string | null }[];
  decisions: string[];
  follow_ups: string[];
  flags: { level: 'info' | 'attention' | 'urgent'; text: string }[];
  missing_info: string[];
  tags: string[];
}

export interface GenerateInput {
  input: string;                 // transcript text or typed notes
  inputMode: 'typed' | 'recorded';
  noteType: string;
  customInstruction?: string;    // for note type "custom"
  field: string;
  fieldCustom?: string | null;
  fieldProfile?: string | null;  // AI profile for field "other"
  preferences?: string | null;
  styleExamples?: { before: string; after: string }[];
  userName?: string;
  date: string;                  // ISO date of the note
}

const BASE_RULES = `You are Kith, an AI note-taker used by professionals in many fields. You turn a recording transcript or rough typed notes into a clear, accurate, well-structured note.

Non-negotiable rules:
1. Use ONLY information present in the input. Never invent names, numbers, dates, findings, decisions or commitments. If something important for this note type is missing, list it in "missing_info" instead of guessing.
2. Never diagnose, recommend treatment, assess causality, or give legal/financial advice that the speaker did not state. You document; humans decide.
3. Safety, incidents, compliance issues, adverse events and risks go in "flags" (level "urgent" when someone may be at risk or a regulatory clock may be running, "attention" for things a supervisor should review, "info" otherwise). Flags describe what to check; they never decide.
4. Keep the speaker's meaning. Fix transcription errors only when the intended word is obvious from context.
5. Write concise, skimmable points (one idea each, usually under 25 words). Australian English spelling.
6. Every concrete next step goes in "action_items" with an owner and due date only if stated (otherwise null).
7. Omit sections that would be empty. Do not pad.
8. Decisions, action items, follow-ups and flags have their own fields. Never repeat them as a section, and don't restate the same point twice.
9. "missing_info" lists only the 3-5 most important gaps for this note type, most important first. Never fill a gap with an assumption (e.g. don't guess a year, a role or a name).
10. The note author is the person writing the note. Don't give them (or anyone) a role or title that wasn't stated.`;

const OUTPUT_SCHEMA = `Return ONLY valid JSON (no markdown fences) with exactly this shape:
{
  "title": "short specific title (max 10 words)",
  "summary": "2-3 sentence summary",
  "sections": [{ "heading": "string", "points": ["string"] }],
  "action_items": [{ "task": "string", "owner": "string or null", "due": "string or null" }],
  "decisions": ["string"],
  "follow_ups": ["string"],
  "flags": [{ "level": "info" | "attention" | "urgent", "text": "string" }],
  "missing_info": ["string"],
  "tags": ["2-5 short lowercase tags"]
}`;

function fieldBlock(input: GenerateInput): string {
  if (input.field === 'other') {
    const name = input.fieldCustom || 'their profession';
    return `The user works in: ${name}.\n${input.fieldProfile || 'Write notes appropriate to this profession.'}`;
  }
  const f = FIELD_MAP[input.field] ?? FIELD_MAP.general;
  return `The user works in: ${f.label}.\n${f.profile}`;
}

function noteTypeBlock(input: GenerateInput): string {
  const t = NOTE_TYPE_MAP[input.noteType] ?? NOTE_TYPE_MAP.general;
  if (t.key === 'custom') {
    return `Note type: custom. The user described the note they want as: "${(input.customInstruction || 'a clear general note').slice(0, 600)}". Choose section headings that fit that description.`;
  }
  return `Note type: ${t.label}.\nUse these section headings, in this order, where the input supports them: ${t.sections.join(' | ')}.\n${t.guidance}`;
}

function personalBlock(input: GenerateInput): string {
  const parts: string[] = [];
  if (input.preferences?.trim()) parts.push(`The user's own preferences for their notes: "${input.preferences.trim().slice(0, 500)}"`);
  if (input.styleExamples?.length) {
    parts.push('The user previously edited generated notes like this. Match their preferred style and wording:\n' +
      input.styleExamples.slice(0, 3).map((e, i) =>
        `Example ${i + 1}\nBEFORE: ${e.before.slice(0, 600)}\nAFTER: ${e.after.slice(0, 600)}`).join('\n\n'));
  }
  return parts.join('\n\n');
}

function parseJson(raw: string): NoteContent {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  let obj: Partial<NoteContent>;
  try {
    obj = JSON.parse(text);
  } catch {
    // Raw control characters inside strings are the usual culprit.
    obj = JSON.parse(text.replace(/[\u0000-\u001f]+/g, ' '));
  }
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    title: String(obj.title || 'Untitled note').slice(0, 120),
    summary: String(obj.summary || ''),
    sections: arr<{ heading: string; points: string[] }>(obj.sections)
      .filter(s => s && s.heading)
      .map(s => ({ heading: String(s.heading), points: arr<string>(s.points).map(String).filter(Boolean) }))
      .filter(s => s.points.length),
    action_items: arr<{ task: string; owner: string | null; due: string | null }>(obj.action_items)
      .filter(a => a && a.task)
      .map(a => ({ task: String(a.task), owner: a.owner ? String(a.owner) : null, due: a.due ? String(a.due) : null })),
    decisions: arr<string>(obj.decisions).map(String).filter(Boolean),
    follow_ups: arr<string>(obj.follow_ups).map(String).filter(Boolean),
    flags: arr<{ level: string; text: string }>(obj.flags)
      .filter(f => f && f.text)
      .map(f => ({ level: (['info', 'attention', 'urgent'].includes(f.level) ? f.level : 'attention') as NoteContent['flags'][number]['level'], text: String(f.text) })),
    missing_info: arr<string>(obj.missing_info).map(String).filter(Boolean),
    tags: arr<string>(obj.tags).map(t => String(t).toLowerCase()).filter(Boolean).slice(0, 6),
  };
}

export async function generateNote(input: GenerateInput): Promise<NoteContent> {
  const client = anthropic();
  if (!client) throw new Error('AI is not configured (ANTHROPIC_API_KEY missing)');

  const system = [BASE_RULES, fieldBlock(input), noteTypeBlock(input), personalBlock(input), OUTPUT_SCHEMA]
    .filter(Boolean).join('\n\n');

  const source = input.inputMode === 'recorded' ? 'RECORDING TRANSCRIPT' : 'TYPED NOTES';
  const user = `Date: ${input.date}${input.userName ? `\nNote author: ${input.userName}` : ''}\n\n${source}:\n"""\n${input.input.slice(0, 120_000)}\n"""`;

  const res = await client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const raw = res.content.find((c: { type: string }) => c.type === 'text')?.text ?? '';
  return parseJson(raw);
}

/** One-time profile for a field the user typed themselves ("Other"). */
export async function generateFieldProfile(fieldText: string): Promise<string> {
  const client = anthropic();
  if (!client) return `Professional context: ${fieldText}.`;
  const res = await client.messages.create({
    model: HAIKU,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `A professional describes their work as: "${fieldText.slice(0, 200)}".
Write a compact guide (max 80 words) for an AI note-taker serving them: the vocabulary to preserve, what their notes must capture, typical structure, and any safety/compliance items that should be flagged for review. Australian context. Plain text only, no preamble.`,
    }],
  });
  const out = res.content.find((c: { type: string }) => c.type === 'text')?.text?.trim();
  return out || `Professional context: ${fieldText}.`;
}

/** Flatten a note into plain text, used for search indexing, copy and style examples. */
export function noteToText(c: NoteContent): string {
  const lines: string[] = [c.title, '', c.summary, ''];
  for (const s of c.sections) {
    lines.push(s.heading);
    s.points.forEach(p => lines.push(`- ${p}`));
    lines.push('');
  }
  if (c.decisions.length) { lines.push('Decisions'); c.decisions.forEach(d => lines.push(`- ${d}`)); lines.push(''); }
  if (c.action_items.length) {
    lines.push('Action items');
    c.action_items.forEach(a => lines.push(`- ${a.task}${a.owner ? ` (${a.owner})` : ''}${a.due ? `, due ${a.due}` : ''}`));
    lines.push('');
  }
  if (c.follow_ups.length) { lines.push('Follow-ups'); c.follow_ups.forEach(f => lines.push(`- ${f}`)); lines.push(''); }
  if (c.flags.length) { lines.push('Flags'); c.flags.forEach(f => lines.push(`- [${f.level}] ${f.text}`)); lines.push(''); }
  if (c.missing_info.length) { lines.push('Missing information'); c.missing_info.forEach(m => lines.push(`- ${m}`)); }
  return lines.join('\n').trim();
}
