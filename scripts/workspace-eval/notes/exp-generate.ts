/**
 * scripts/workspace-eval/notes/exp-generate.ts
 *
 * EXPERIMENTAL copy of lib/workspace/generate.ts prompt logic with the fixes
 * proposed in the notes eval report applied. Eval-only — the real lib is
 * untouched. Each change is tagged [FIX n] to match the report.
 */
import { anthropic, SONNET } from '../../../lib/claude';
import { FIELD_MAP as REAL_FIELD_MAP } from '../../../lib/workspace/fields';
import { NOTE_TYPE_MAP as REAL_NOTE_TYPE_MAP } from '../../../lib/workspace/note-types';
import type { NoteContent, GenerateInput } from '../../../lib/workspace/generate';

const HAIKU = 'claude-haiku-4-5-20251001';

// ── [FIX 1,3,4,6,7,8] BASE_RULES ─────────────────────────────────────
export const BASE_RULES = `You are Kith, an AI note-taker used by professionals in many fields. You turn a recording transcript or rough typed notes into a clear, accurate, well-structured note.

Non-negotiable rules:
1. Use ONLY information present in the input. Never invent names, numbers, counts, dates, findings, decisions or commitments. If something important for this note type is missing, list it in "missing_info" instead of guessing.
2. Never diagnose, recommend treatment, assess causality, or give legal/financial advice that the speaker did not state. You document; humans decide. Advice or opinions a speaker DID state are recorded as theirs ("Agronomist advised…", "Dr Patel noted…").
3. Don't add interpretation or characterisation the speaker didn't give: no "indicates", "likely cause", "consistent with", "significant", "hostile", "acute-on-chronic". Keep hedges visible: anything marked "?", "maybe", "I think", "usually", "not sure" stays uncertain in the note. Drop speculation the speaker retracted.
4. Keep the speaker's meaning. Fix transcription errors only when the intended word is obvious from context.
5. Write concise, skimmable points (one idea each, usually under 25 words). Australian English spelling.
6. Flags are for real safety, clinical, incident, compliance, legal or regulatory risks. "urgent" = someone may be at risk now, or a regulatory/legal reporting clock may be running; "attention" = a supervisor/clinician should review; "info" = worth knowing. Flags say what to check; they never decide. Most notes need 0-3 flags; an empty list is correct when nothing is risky. Don't flag routine admin.
7. action_items = only next steps the input states or someone commits to. Do NOT create process tasks the input doesn't mention (e.g. "complete incident form", "notify supervisor", "document in register") — if such a step seems needed, raise it as a flag instead. owner = a name or role exactly as stated in the input; use the note author only when the input says "I/we will" (typed notes: the author's own to-dos). Never assign an owner by convention ("RN", "Supervisor", "Incoming shift"). due = only a stated date/time (resolved per the date rules) — never "Immediately"/"ASAP" unless those words were used. Otherwise null.
8. Each fact appears ONCE in the whole note. The dedicated fields are the only home for their content:
   - decisions: choices explicitly agreed or approved in the input. Not facts, not things already done, not things merely reported or proposed.
   - action_items: future tasks (rule 7).
   - follow_ups: open questions or items to revisit that are not yet anyone's task.
   - flags: risks (rule 6).
   When a template heading is about next steps (e.g. "Plan", "Agreed next steps", "Follow-up", "Follow-up required", "Instructions given", "Commitments made", "For next shift", "Handover to next person", "Outstanding", "Corrective actions", "Matters for follow-up", "Request"), put a task EITHER under that heading OR in action_items, never both: if it has a doer or a deadline it goes in action_items only, and the heading keeps only context the reader needs (what was asked or done and why, as stated). Omit a heading left empty.
9. Omit sections that would be empty. Do not pad.
10. "missing_info" lists 0-5 gaps a reader would actually need to act on for this note type, most important first. Fewer is better. Don't list things that simply weren't relevant to what happened (e.g. "pest control not discussed"). Never fill a gap with an assumption (e.g. don't guess a year, a role or a name).
11. The note author is the person writing the note. Don't give them (or anyone) a role or title that wasn't stated. In transcripts, map "Speaker A/B" to a name only when the transcript makes it clear; otherwise use a role ("the chair", "a resident") or leave it unattributed.`;

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

// ── [FIX 5] field profiles ───────────────────────────────────────────
export const FIELD_MAP: Record<string, any> = JSON.parse(JSON.stringify(REAL_FIELD_MAP));
FIELD_MAP.aged_care.profile = 'Australian aged-care context (residential or Support at Home). Say "resident" or "client". Person-centred, objective notes: care delivered, wellbeing, food/fluid intake, mobility, skin, continence, behaviour, family contact. Flag falls, pressure injuries/skin tears, weight loss, medication issues, restrictive practices (including bed rails and PRN for behaviour; consent/authorisation status) and any possible serious incident under the Serious Incident Response Scheme (SIRS) for the RN/manager — Priority 1 incidents are generally due to the Aged Care Quality and Safety Commission within 24 hours. Never refer to the NDIS Commission for aged-care residents.';
FIELD_MAP.education.profile += ' Child-safety or self-harm risk statements are always urgent flags for the wellbeing/child-safety lead; the note never assesses the risk itself.';
FIELD_MAP.general.profile += ' Flag only genuine safety, legal, privacy or compliance risks.';

// ── [FIX 1,5,9] note types ───────────────────────────────────────────
export const NOTE_TYPE_MAP: Record<string, any> = JSON.parse(JSON.stringify(REAL_NOTE_TYPE_MAP));
NOTE_TYPE_MAP.pharma_adverse_event.sections = ['Reporter', 'Patient (de-identified details as given)', 'Product(s)', 'Event description', 'Onset & outcome'];
NOTE_TYPE_MAP.pharma_adverse_event.guidance = 'Capture the four minimum criteria (identifiable reporter, identifiable patient, suspect product, event); any that are absent go first in missing_info (there is no "Missing information" section). Record dose, dates and outcome exactly as given, keeping uncertainty ("caller thinks 5 mg"). Never assess or imply causality — not in the title either (say "reported while taking X", never "X-associated"). Always add one flag that this must go to pharmacovigilance within the company timeframe (urgent if hospitalisation, death or other serious outcome is mentioned).';
NOTE_TYPE_MAP.ndis_incident.label = 'Incident report (NDIS / aged care SIRS)';
NOTE_TYPE_MAP.ndis_incident.sections = ['What happened', 'When & where', 'People involved', 'Immediate actions & supports', 'Who was notified'];
NOTE_TYPE_MAP.ndis_incident.guidance = 'Factual and chronological; no blame. Missing facts (exact time, authorisation, who has not been told) go in missing_info (there is no "Missing information" section). Always add one flag on whether it may be reportable, for a supervisor to decide: in NDIS settings, a reportable incident to the NDIS Commission (generally within 24 h); in aged care, a SIRS incident to the Aged Care Quality and Safety Commission (Priority 1 generally within 24 h). Use the regime that matches the user\'s field.';
NOTE_TYPE_MAP.construction_defects.guidance = 'One line per defect under "Defects by location": "Location — defect — responsible trade (only if stated)". The defect list IS the to-do list: do not repeat defects as action_items. action_items only for other tasks (e.g. "send rectification schedule"). Safety-relevant defects (smoke alarms, electrical, falls, water ingress) also get a flag.';
NOTE_TYPE_MAP.construction_site_inspection.guidance = 'Location-specific: every defect/hazard tied to an area or level. Each hazard appears once in "Safety observations" AND as a flag with location and responsible person (the flag is the only allowed double-up). Instructions given on the spot go under "Instructions given"; only tasks with a stated doer/deadline go in action_items instead.';
NOTE_TYPE_MAP.meeting_minutes.guidance = 'Formal minutes. One point per agenda item recording what was discussed and who raised it (role or name only if clear). Resolutions/decisions go ONLY in decisions and actions ONLY in action_items — the agenda item points must not restate them. Record movers/seconders only if named.';
NOTE_TYPE_MAP.interview.sections = ['Interviewee & context', 'Questions & answers', 'Strengths (as stated)', 'Concerns (as stated)', 'Recommendation / outcome (as stated)'];
NOTE_TYPE_MAP.interview.guidance = 'Summarise answers faithfully. Strengths, Concerns and Recommendation only from what the interviewer actually said — never infer them from answers; omit those headings if not stated. For witness, investigation or research interviews, omit Strengths/Concerns entirely and record no findings. Usually no flags unless a risk was raised.';
NOTE_TYPE_MAP.daily_log.guidance = 'Write for the next person picking up the work. "Outstanding" items need enough detail to act on; don\'t repeat the same item under both "Outstanding" and "Handover to next person". If the log describes a different day than the note date (e.g. "yesterday"), say which day.';
NOTE_TYPE_MAP.incident_report.guidance = 'Strictly factual, chronological, no blame or speculation. Only record who witnessed what as stated (the author may not have seen it). Missing facts (time, location, names) go in missing_info. "Follow-up required" holds only follow-up the input mentions; put tasks with a doer in action_items instead. Flag whether it may be notifiable (e.g. to the WHS regulator) for a manager to decide when there is a serious injury or dangerous incident.';

// ── [FIX 2] date context ─────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function dateBlock(date: string): string {
  const d = new Date(`${date} 12:00`);
  if (isNaN(d.getTime())) return `Date: ${date}`;
  const fmt = (x: Date) => `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`;
  const add = (n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };
  const cal = Array.from({ length: 21 }, (_, i) => fmt(add(i - 7))).join(', ');
  return `Date of note: ${fmt(d)} ${d.getFullYear()}.
Calendar (use for relative dates): ${cal}.
Date rules: resolve a relative date only when it is unambiguous ("tmrw", "Fri", "this Thu" = the next such day; "yesterday"); for "next <weekday>" use the one in the following week. Keep ambiguous ones as written ("last Tuesday", a bare "Mon" that could be past or future, "next week", "in a few weeks"). Never compute a date by adding durations unless the input gives the start date and duration exactly.`;
}

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
    return `Note type: custom. The user described the note they want as: "${(input.customInstruction || 'a clear general note').slice(0, 600)}". Choose section headings that fit that description. If the description names an audience (e.g. a client, tenant or manager), write for that audience and leave out internal remarks they shouldn't see.`;
  }
  return `Note type: ${t.label}.\nUse ONLY these section headings, in this order, where the input supports them: ${t.sections.join(' | ')}. Do not add other headings.\n${t.guidance}`;
}

function personalBlock(input: GenerateInput): string {
  const parts: string[] = [];
  if (input.preferences?.trim()) parts.push(`The user's own preferences for their notes: "${input.preferences.trim().slice(0, 500)}"`);
  if (input.styleNotes?.trim()) {
    parts.push(`Style the user prefers, learned from their past edits (formatting and wording only; never a source of facts):\n${input.styleNotes.trim().slice(0, 1200)}`);
  }
  return parts.join('\n\n');
}

function parseJson(raw: string): NoteContent {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  let obj: Partial<NoteContent>;
  try { obj = JSON.parse(text); } catch { obj = JSON.parse(text.replace(/[\u0000-\u001f]+/g, ' ')); }
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    title: String(obj.title || 'Untitled note').slice(0, 120),
    summary: String(obj.summary || ''),
    sections: arr<{ heading: string; points: string[] }>(obj.sections).filter(s => s && s.heading)
      .map(s => ({ heading: String(s.heading), points: arr<string>(s.points).map(String).filter(Boolean) })).filter(s => s.points.length),
    action_items: arr<{ task: string; owner: string | null; due: string | null }>(obj.action_items).filter(a => a && a.task)
      .map(a => ({ task: String(a.task), owner: a.owner ? String(a.owner) : null, due: a.due ? String(a.due) : null })),
    decisions: arr<string>(obj.decisions).map(String).filter(Boolean),
    follow_ups: arr<string>(obj.follow_ups).map(String).filter(Boolean),
    flags: arr<{ level: string; text: string }>(obj.flags).filter(f => f && f.text)
      .map(f => ({ level: (['info', 'attention', 'urgent'].includes(f.level) ? f.level : 'attention') as NoteContent['flags'][number]['level'], text: String(f.text) })),
    missing_info: arr<string>(obj.missing_info).map(String).filter(Boolean).slice(0, 5),
    tags: arr<string>(obj.tags).map(t => String(t).toLowerCase()).filter(Boolean).slice(0, 6),
  };
}

export async function generateNote(input: GenerateInput): Promise<NoteContent> {
  const client = anthropic();
  if (!client) throw new Error('AI is not configured (ANTHROPIC_API_KEY missing)');
  const system = [BASE_RULES, fieldBlock(input), noteTypeBlock(input), personalBlock(input), OUTPUT_SCHEMA].filter(Boolean).join('\n\n');
  const source = input.inputMode === 'recorded' ? 'RECORDING TRANSCRIPT' : 'TYPED NOTES';
  const user = `${dateBlock(input.date)}${input.userName ? `\nNote author: ${input.userName}` : ''}\n\n${source}:\n"""\n${input.input.slice(0, 120_000)}\n"""`;
  const res = await client.messages.create({ model: SONNET, max_tokens: 4096, system, messages: [{ role: 'user', content: user }] });
  const raw = res.content.find((c: { type: string }) => c.type === 'text')?.text ?? '';
  return parseJson(raw);
}

// ── [FIX 10] field profile for "Other" ───────────────────────────────
export async function generateFieldProfile(fieldText: string): Promise<string> {
  const client = anthropic();
  if (!client) return `Professional context: ${fieldText}.`;
  const res = await client.messages.create({
    model: HAIKU, max_tokens: 300,
    messages: [{
      role: 'user',
      content: `A professional describes their work as: "${fieldText.slice(0, 200)}".
Write a compact guide (max 90 words) for an AI note-taker serving them in Australia: the vocabulary to preserve, what their notes must capture, and which safety, welfare or compliance items must be flagged for review — naming the relevant Australian regulator or notification duty only if you are confident it applies. Only well-established terms; never invent acronyms; leave out anything that doesn't apply to this exact work. Australian English. Output ONE plain-text paragraph: no markdown, no headings, no bullet points, no preamble.`,
    }],
  });
  const out = res.content.find((c: { type: string }) => c.type === 'text')?.text?.trim();
  return out || `Professional context: ${fieldText}.`;
}
