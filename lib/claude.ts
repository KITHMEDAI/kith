/**
 * lib/claude.ts
 *
 * Two-layer AI pipeline (cost-optimised):
 *   Layer 1 — Claude Haiku: repair low-confidence/garbled words from full
 *              conversation context, then compress the whole transcript into a
 *              clean structured clinical brief (cheap, handles long context).
 *   Layer 2 — Claude Sonnet: clinical synthesis — SOAP notes, suggestions, plan
 *              — from the repaired brief (precise; sees a short, clean brief).
 *
 * For 5-min live updates, Haiku alone is sufficient — no Sonnet needed.
 */

import { USE_MOCK, mockSessionNotes, mockLiveUpdate } from './mock';
import type { TranscriptSegment, Patient, SessionNotes } from '@/types';
import { getInitials } from './utils';

function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Anthropic = require('@anthropic-ai/sdk').default;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Model routing
const HAIKU  = 'claude-haiku-4-5-20251001';   // Layer 1 — transcript repair + compression
const SONNET = 'claude-sonnet-4-6';            // Layer 2 — final clinical synthesis

// ─── Public: plain-English rewrite for sending clinical text to a patient ─────
// Homework/suggestions are written for a clinician (jargon, ' • ' bullets,
// **bold** markup) — never send that verbatim to a patient. This rewrites a
// single fragment as a short, warm, second-person message a non-clinician can
// understand, changing nothing about the actual content/instructions.
export async function toPlainEnglish(text: string, patientFirstName?: string): Promise<string> {
  if (USE_MOCK) return text.replace(/\s*•\s*/g, '. ').replace(/\*\*(.+?)\*\*/g, '$1');

  const client = anthropic();
  if (!client) return text.replace(/\s*•\s*/g, '. ').replace(/\*\*(.+?)\*\*/g, '$1');

  const res = await client.messages.create({
    model: HAIKU,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Rewrite this clinical note fragment as a short, warm message sent directly to the patient${patientFirstName ? ` (${patientFirstName})` : ''}. Plain English only — no clinical jargon, no bullet markup ('•'), no markdown/asterisks. Second person ("you"). 1-4 short sentences. Do NOT add any instruction, detail, or encouragement that isn't already in the original — only rephrase what's there. Return ONLY the rewritten message, nothing else.

ORIGINAL: ${text}`,
    }],
  });

  const out = res.content[0]?.type === 'text' ? res.content[0].text.trim() : text;
  return out || text;
}

// ─── Stage 1: Haiku transcript compression ────────────────────────────────────
async function compressTranscript(
  client: any,
  transcript: TranscriptSegment[],
  patient: Patient,
  speakerMap?: Record<string, { role: string; name: string | null; display: string }>,
): Promise<string> {
  // Replace generic labels with identified names if available. Append any
  // recogniser-flagged low-confidence words so Layer 1 knows what to repair.
  const raw = transcript
    .map(s => {
      const info = speakerMap?.[s.speaker];
      const label = info?.display || s.speaker;
      const flag = s.low_conf && s.low_conf.length
        ? `   ⟨low-confidence words to verify from context: ${s.low_conf.join(', ')}⟩`
        : '';
      return `${label}: ${s.text.trim()}${flag}`;
    })
    .join('\n');

  // Build speaker role context string for the prompt
  const speakerContext = speakerMap && Object.keys(speakerMap).length > 0
    ? '\nIDENTIFIED SPEAKERS:\n' + Object.entries(speakerMap)
        .map(([label, info]) => `  ${label} → ${info.display} (${info.role})`)
        .join('\n')
    : '';

  const prompt = `You are an expert clinical transcript analyst. Recording: single laptop mic, clinician and patient in same room. Speaker labels are voice-diarization (reliable across full session, may slip on 1-2 short turns).

REPAIR LOW-CONFIDENCE WORDS FIRST:
- Some words are marked ⟨low-confidence words to verify from context: …⟩ — these were probably mis-heard by the speech recogniser.
- Before analysing, silently reconstruct each flagged word into the most plausible word/phrase using the FULL conversation context (surrounding sentences, clinical topic, the speaker's intent). Also fix any other obviously garbled words even if unflagged.
- Work from the CORRECTED meaning throughout. Never quote a garbled word verbatim — use your corrected reading.

IDENTIFY ROLES:
- CLINICIAN: opens session, asks structured/reflective questions, uses clinical language, references past sessions, assigns homework, names techniques (CBT/DBT/EMDR/ACT/MI), validates without advising.
- PATIENT: the registered patient described below (age/gender/diagnosis should roughly match) — shares lived experience, emotions, specific events, uses first-person language ("I feel", "I can't", "last week I").
- THIRD PARTY (only if a distinct third voice is present): a spouse, parent, or family member sitting in on this session. They also speak in first person about their own experience — do NOT default them into the PATIENT role just because they aren't the clinician. If their name is clearly stated aloud anywhere in the transcript, capture it in "third_party_name" below. If you cannot tell their name with confidence, leave it null — do not guess.
- Use MAJORITY pattern per speaker across ALL their turns.
- Attributing one person's statement, history, or quote to the other person is a serious documentation error, not a minor imprecision — when a third party is present, keep their material clearly separate from the patient's in every field below. If you are ever unsure which of two non-clinician speakers said something, say so explicitly rather than picking one.

Patient context: Dx — ${(patient.diagnosis ?? []).join(', ')} | Modality: ${patient.therapy_modality ?? 'unspecified'}${speakerContext}

TRANSCRIPT:
${raw}

Return ONLY valid JSON — be SPECIFIC to THIS session, not a template. Every field must reflect actual content:
{
  "speaker_roles": {"Speaker A": "clinician", "Speaker B": "patient", "Speaker C": "third_party (only if a distinct third voice exists, else omit this key entirely)"},
  "third_party_name": "Their real name if clearly stated aloud in the transcript, else null. Never guess.",
  "role_confidence": "high|medium|low",
  "duration_estimate": "e.g. 45 min",
  "presenting_concerns": "Specific issues raised TODAY — name actual events/topics (e.g. 'conflict with mother on Sunday, sleep disruption, work deadline avoidance')",
  "emotional_tone": "calm|distressed|flat|anxious|tearful|mixed|guarded|hopeful",
  "key_themes": ["3-5 specific clinical themes — name real patterns, not generic words. E.g. 'catastrophising around job performance', 'anniversary grief re: father'"],
  "significant_statements": ["2-4 near-verbatim quotes that reveal cognitions, self-image, or risk. If a third party is present, prefix each quote with who said it, e.g. '[patient] ...' or '[third party] ...' — never attribute one person's quote to the other."],
  "clinician_interventions": ["specific techniques actually used — e.g. 'Socratic questioning re: cognitive distortion', 'behavioural activation plan for morning routine'"],
  "mood_indicators": "Engagement/energy/disclosure pattern as EVIDENCED BY THE TEXT ONLY (this is a transcript, not audio/video) — e.g. reluctant vs. spontaneous disclosure, response length, hesitation, topic avoidance, or affect the speaker explicitly named themselves. Do not assert facial affect, eye contact, posture, or psychomotor state as if observed — that requires visual/audio signal this transcript doesn't carry.",
  "risk_signals": "List ANY SI/SH/HI or hopelessness statements verbatim. If none: 'No SI/SH/HI detected this session.'",
  "homework_discussed": "Exact task assigned + review of previous homework, or 'None assigned'",
  "session_arc": "How state shifted start-to-end — e.g. 'Opened guarded; tearful mid-session on father topic; closed with relief after behavioural plan'"
}`;

  // Longer/busier sessions (more turns, more low-confidence flags, noisier
  // diarization) need more room to fill out every field — 1600 tokens was
  // measured truncating mid-JSON on real 500+-segment sessions, producing
  // invalid JSON that Sonnet would then misread as "the transcript is
  // corrupted" (it isn't — Layer 1 just got cut off). One retry on invalid
  // JSON since these calls are stochastic; a truncated/malformed response
  // isn't necessarily reproducible on a second attempt.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await client.messages.create({
      model: HAIKU,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = res.content[0]?.type === 'text' ? res.content[0].text : '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        JSON.parse(match[0]);
        return match[0];
      } catch { /* fall through to retry */ }
    }
    if (attempt === 2) {
      throw new Error('Layer 1 (transcript compression) did not return valid JSON after retry — refusing to pass malformed data to note synthesis.');
    }
  }
  // Unreachable, but keeps TypeScript happy about the return type.
  throw new Error('Layer 1 (transcript compression) failed');
}

// ─── Stage 2: Sonnet clinical synthesis ───────────────────────────────────────
async function synthesiseClinicalNotes(
  client: any,
  brief: string,
  patient: Patient,
  sessionNumber: number,
  previousSummary?: string,
  manualNotes?: string,
): Promise<SessionNotes> {
  const initials = getInitials(patient.display_name);

  const prompt = `You are a senior clinical psychologist (15+ years, ${patient.therapy_modality ?? 'CBT/psychodynamic'} trained) producing post-session clinical documentation from an AI-compressed session brief. Your notes must be SPECIFIC to this session — no generic placeholders.

PATIENT PROFILE:
  Initials: ${initials}
  Age: ${patient.age ?? 'Unknown'}
  Gender: ${patient.gender ?? 'Unspecified'}
  Diagnoses: ${(patient.diagnosis ?? []).join(', ')}
  Modality: ${patient.therapy_modality ?? 'Not specified'}
  Session #: ${sessionNumber}
  Treatment goals: ${patient.therapy_goals?.join('; ') ?? 'Not documented'}
${previousSummary ? `\nPREVIOUS SESSION SUMMARY (for continuity):\n${previousSummary}` : ''}
${manualNotes ? `\nCLINICIAN\'S OWN NOTES (take as ground truth):\n${manualNotes}` : ''}

SESSION BRIEF (extracted from transcript by AI):
${brief}

Write for a BUSY clinician who scans the note in seconds — NOT long paragraphs.
Use SHORT bullet points. Each point telegraphic, specific to THIS session, ideally ≤ 14 words.
No filler, no preamble, no restating the field name. Every point a real observation, not a category.
Return ONLY valid JSON:
{
  "soap_note": {
    "subjective": "2-4 short points separated by ' • ' on ONE line. Patient-reported issues/events/emotions. e.g. 'Rumination re: supervisor conflict • Mood self-rated 4/10 • 3 nights fragmented sleep'",
    "objective": "2-4 short points separated by ' • '. This note is generated from a TEXT TRANSCRIPT ONLY — there is no video or audio observation. Base every point on what the transcript can actually evidence: engagement pattern (spontaneous vs. reluctant disclosure), coherence/organisation of what was said, response length or hesitation, topic avoidance, shifts over the session, or affect the patient explicitly self-described. NEVER assert facial affect, eye contact, posture, or psychomotor activity as directly observed (e.g. 'flat affect', 'no dissociation observed', 'appropriate eye contact') — a transcript cannot show these, and claiming to have seen them misrepresents what this system actually knows to whoever reads the chart. If nothing in the transcript evidences a genuine behavioural observation, write fewer points rather than filling the field with a boilerplate checklist line. e.g. 'Disclosed affair details only after direct questioning — reluctant, not spontaneous • Speech organised, no tangential shifts'",
    "assessment": "2-4 short points separated by ' • '. Formulation tied to dx + goals. e.g. 'Consistent with GAD: catastrophic appraisal of work stress • Limited progress on cognitive restructuring'",
    "plan": "2-4 short points separated by ' • '. Concrete next steps, techniques, referrals, frequency."
  },
  "key_points": ["3-5 points, ≤ 12 words each, concrete observations not categories"],
  "session_summary": "≤ 2 short sentences using ${initials}: key theme, emotional trajectory, outcome.",
  "session_growth": {
    "compared_to_last": "improved|stable|declined|first_session",
    "areas_of_progress": ["short points, ≤ 12 words — cite actual behaviours/cognitions that improved"],
    "areas_of_concern": ["short points, ≤ 12 words — cite actual risk signals, avoidance, regression"],
    "narrative": "1 short sentence on trajectory toward goals"
  },
  "ai_suggestions": ["0-3 observations — ONLY ones you are genuinely confident are clinically useful and specific to what happened THIS session. If nothing in the brief clearly warrants a suggestion, or you're not confident, return an EMPTY array. NEVER pad with a generic or filler entry (e.g. 'continue monitoring', 'session trajectory positive') just to have something to show. ACTION-FIRST verb, ≤ 14 words each. Never judge the patient or their choices. Phrase every point as a forward-looking next step for the clinician to consider — never as a critique of what the clinician did or didn't do this session."],
  "prescription_notes": {
    "medication_relevant": false,
    "note": null,
    "refer_to_psychiatrist": false
  },
  "resource_suggestions": {
    "books": [
      {
        "title": "Only include if a specific book directly addresses what emerged in THIS session. Real published titles only — e.g. 'Feeling Good' (Burns), 'Mind Over Mood' (Greenberger & Padesky), 'The Body Keeps the Score' (van der Kolk), 'Get Out of Your Mind and Into Your Life' (Hayes), 'The DBT Skills Workbook' (McKay et al.), 'When Panic Attacks' (Burns), 'Overcoming Unwanted Intrusive Thoughts' (Sally Winston). If no book is clearly relevant, omit this array entirely.",
        "author": "Real author name",
        "reason": "≤ 12 words: specific chapter or skill that fits this session's theme"
      }
    ],
    "exercises": [
      {
        "name": "Only include if an exercise is clinically indicated by what happened in this session — e.g. patient reported high anxiety → breathing/grounding; avoidance pattern → behavioural activation; rumination → thought record. Evidence-based: 4-7-8 breathing, PMR, 5-4-3-2-1 grounding, body scan, thought record (ABC), worry postponement, TIPP (DBT), behavioural activation scheduling, safe-place visualisation, opposite action. If patient is doing well and no specific exercise is indicated, omit this array entirely — do NOT invent a task just to fill the field.",
        "description": "Step-by-step in ≤ 15 words, specific enough for the patient to do independently",
        "frequency": "Specific timing — e.g. '10 min each morning' not just 'daily'"
      }
    ],
    "apps": [{"name": "", "platform": "iOS/Android", "reason": "≤ 10 words — only if genuinely helpful, else omit entirely"}]
  },
  "risk_flags": {
    "level": "low|moderate|high|critical",
    "indicators": [],
    "action_required": false,
    "recommended_action": null,
    "safety_plan_needed": "true if a safety plan is clinically indicated for this presentation — SET THIS TRUE even if the brief says one was already built/discussed in-session (that means it IS needed and IS documented, not that the need has passed). Only false when risk is low and no safety plan came up at all."
  },
  "homework_assigned": "1-2 short points separated by ' • ', measurable. e.g. 'Thought record: 1 negative thought/day Mon-Fri'",
  "next_session_plan": "1-2 short points separated by ' • ', specific focus for next session",
  "session_tags": ["2-4 short clinical tags — e.g. 'CBT', 'sleep', 'workplace-stress'"]
}

STRICT RULES:
- BREVITY IS MANDATORY. Short bullets only — no paragraphs, no filler words, no hedging.
- NEVER write a vague/templated line ("patient reports some concerns", "continue monitoring progress"). If the brief has no specific detail for a field, write the shortest TRUE statement instead (e.g. "No new subjective concerns reported") — never invent specifics to sound complete.
- HIGHLIGHTING (MANDATORY, no exceptions): every single point across soap_note, key_points, homework_assigned, and next_session_plan MUST wrap the one most clinically load-bearing word or short phrase in **double asterisks** — e.g. "Rumination re: **supervisor conflict** • Mood self-rated **4/10**". Before returning, check EACH point individually — if a point has zero ** markers, go back and add one. Exactly one per point, never more than one, never a generic connector word.
- NEVER put a literal newline character inside any JSON string — it breaks parsing. Keep every value on ONE line; separate points with ' • '.
- SOAP / homework / next_session_plan: multiple short points joined by ' • ' on a single line.
- Use ${initials} always, never full name. This applies even if the patient's first name, nickname, or a mis-transcribed variant of it (e.g. a speech-recognition error) appears anywhere in the session brief or was spoken aloud in the room — never copy it into the note. Only ${initials}, in every field, with no exceptions.
- THIRD PARTY IN THE ROOM: if the brief indicates a spouse/parent/family member was present and speaking (not just the clinician and ${initials}), refer to them by their real first name if the brief's "third_party_name" is non-null, or as "the other person present" if it is null. NEVER attribute their statements, history, or quotes to ${initials}, and never attribute ${initials}'s own statements to them. This mix-up is a serious clinical error, not a stylistic one — if the brief itself is ambiguous about who said something, write it as ambiguous rather than guessing a side.
- risk_flags.level = high/critical if ANY SI, self-harm urges, harm to others, or psychotic symptoms present.
- prescription_notes: you are NOT a prescriber — only flag medication themes for psychiatrist review.
- resource_suggestions.exercises: ONLY include when clinically indicated by session content. If patient is stable/improving and no specific exercise is needed, OMIT the array entirely. Do not invent tasks to fill space.
- resource_suggestions.books: only REAL published books, only when directly relevant. Omit if nothing fits precisely.
- resource_suggestions.apps: omit entirely if nothing is genuinely helpful — do not pad with generic apps.
- ai_suggestions: never judge patient behaviour or choices. State observations clinically and neutrally. If things are going well, say so directly.
- Return ONLY JSON, no markdown fences.`;

  // One retry on invalid/missing JSON — same reasoning as Layer 1's retry:
  // these calls are stochastic, so a malformed response isn't necessarily
  // reproducible on a second attempt. Previously this stage had NO retry at
  // all, so a single bad generation (more likely here than in Layer 1 given
  // how much larger and more nested this output schema is) failed the whole
  // session outright with no second chance.
  //
  // A second failure mode showed up under adversarial testing across 10
  // diverse sessions: the "exactly one **highlight** per bullet" rule is
  // frequently violated (bullets with zero ** markers) even though the
  // prompt already demands a self-check — the instruction alone isn't
  // reliable enough. Since the UI renders **term** as bold and falls back to
  // plain text otherwise, an unhighlighted bullet doesn't error, it just
  // quietly looks unfinished. So this loop now retries on either invalid
  // JSON OR highlighting non-compliance, telling the model exactly which
  // fields failed on the retry attempt. If it's still non-compliant after
  // every attempt, a deterministic fallback bolds a real word in the bullet
  // rather than shipping a note with a silently broken visual contract.
  let lastText = '';
  // Carries the previous attempt's outcome forward so the retry message never
  // has to re-parse `lastText` itself — re-parsing a response that already
  // failed to parse cleanly (or was empty/non-JSON) was throwing uncaught
  // (TypeError on a null regex match, or SyntaxError from a bare JSON.parse
  // that skipped parseNotesJson's control-char repair), which crashed the
  // whole note-generation call on exactly the failure modes this retry loop
  // exists to recover from. Found via adversarial testing + independent
  // confirmation across 5 code-review passes.
  let lastViolations: string[] | null = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const feedback = lastViolations
      ? `Some bullets in that response are missing their required **highlight** — every single point across soap_note, key_points, homework_assigned, and next_session_plan must have EXACTLY one **term** wrapped. Violations found:\n${lastViolations.join('\n')}\n\nReturn the CORRECTED full JSON object (same structure, same content, just add the missing ** markers), nothing else.`
      : 'Your last response was not a single valid JSON object matching the schema. Return ONLY the valid JSON object, no markdown fences, no commentary before or after it.';

    const res = await client.messages.create({
      model: SONNET,
      max_tokens: 4096,   // headroom so long sessions don't truncate mid-JSON
      messages: attempt === 1
        ? [{ role: 'user', content: prompt }]
        : [
            { role: 'user', content: prompt },
            { role: 'assistant', content: lastText },
            { role: 'user', content: feedback },
          ],
    });

    const text  = res.content[0]?.type === 'text' ? res.content[0].text : '';
    lastText = text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = parseNotesJson(match[0]);
        const { ok, violations } = validateHighlighting(parsed);
        if (ok) return parsed;
        if (attempt === maxAttempts) return repairHighlighting(parsed);
        lastViolations = violations;
        continue; // retry with corrective feedback
      } catch { /* fall through to retry */ }
    }
    lastViolations = null; // no valid JSON to derive violations from — generic retry prompt next
    if (attempt === maxAttempts) {
      throw new Error('Sonnet did not return valid JSON after retries');
    }
  }
  // Unreachable, but keeps TypeScript happy about the return type.
  throw new Error('Sonnet synthesis failed');
}

// Splits a "point1 • point2 • point3" field into individual bullets, same
// convention the UI (ClinicalText) uses to render them.
function splitPoints(text: string): string[] {
  return text.split(/\s*•\s*|\n/).map(s => s.trim()).filter(Boolean);
}

function countHighlights(text: string): number {
  return (text.match(/\*\*/g) || []).length / 2;
}

function validateHighlighting(notes: SessionNotes): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const checkField = (label: string, text?: string) => {
    if (!text) return;
    for (const point of splitPoints(text)) {
      if (countHighlights(point) !== 1) violations.push(`${label}: "${point}"`);
    }
  };
  checkField('subjective', notes.soap_note?.subjective);
  checkField('objective', notes.soap_note?.objective);
  checkField('assessment', notes.soap_note?.assessment);
  checkField('plan', notes.soap_note?.plan);
  (notes.key_points || []).forEach(p => { if (countHighlights(p) !== 1) violations.push(`key_points: "${p}"`); });
  checkField('homework_assigned', notes.homework_assigned);
  checkField('next_session_plan', notes.next_session_plan);
  return { ok: violations.length === 0, violations };
}

// Last-resort deterministic repair if the model still hasn't fixed every
// bullet after all retries — bolds the longest non-trivial word so the note
// never ships with a bullet that has zero visual emphasis. Not as good as
// the model choosing the clinically load-bearing phrase, but strictly
// better than silently rendering as an unformatted, unfinished-looking line.
const STOPWORDS = new Set(['the','and','with','from','this','that','their','have','been','were','into','onto','than','then','also','some','more','less','both','only','once','over','still','when','what','while','after','before','about','which','without','during']);
function autoBold(point: string): string {
  if (countHighlights(point) === 1) return point;
  const stripped = point.replace(/\*\*/g, '');
  const words = stripped.match(/[A-Za-z][A-Za-z'-]{3,}/g) || [];
  let target: string | undefined = words
    .filter(w => !STOPWORDS.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  // Short bullets (e.g. "Mood 4/10, no SH") can have zero words ≥4 chars or
  // have every word filtered as a stopword — falling through with nothing
  // bolded would silently break the one guarantee this function exists to
  // provide. Relax to any non-stopword alphanumeric token, then finally to
  // literally the first token, so a bullet is never returned unhighlighted.
  if (!target) {
    const anyToken = stripped.match(/[A-Za-z0-9][A-Za-z0-9'/-]*/g) || [];
    target = anyToken.filter(w => !STOPWORDS.has(w.toLowerCase()))[0] || anyToken[0];
  }
  if (!target) return stripped;
  return stripped.replace(target, `**${target}**`);
}
function repairField(text?: string): string | undefined {
  if (!text) return text;
  return splitPoints(text).map(autoBold).join(' • ');
}
function repairHighlighting(notes: SessionNotes): SessionNotes {
  return {
    ...notes,
    soap_note: {
      subjective: repairField(notes.soap_note?.subjective),
      objective: repairField(notes.soap_note?.objective),
      assessment: repairField(notes.soap_note?.assessment),
      plan: repairField(notes.soap_note?.plan),
    },
    key_points: (notes.key_points || []).map(autoBold),
    homework_assigned: repairField(notes.homework_assigned) ?? notes.homework_assigned,
    next_session_plan: repairField(notes.next_session_plan) ?? notes.next_session_plan,
  };
}

// Robust JSON parse for model output: the common failure is a raw newline/tab
// inside a string value (invalid JSON). Retry once with control chars collapsed
// to spaces — they're only ever invalid inside strings; between JSON tokens
// they're insignificant whitespace, so this repair is safe.
function parseNotesJson(raw: string): SessionNotes {
  try {
    return JSON.parse(raw) as SessionNotes;
  } catch {
    // Collapse raw control chars (newlines/tabs/CR) to spaces. They are only
    // invalid when inside a string value; between JSON tokens they are
    // insignificant whitespace, so this repair is safe.
    return JSON.parse(raw.replace(/[\u0000-\u001F]+/g, ' ')) as SessionNotes;
  }
}

// ─── Public: AI column mapping for patient import ─────────────────────────────
// Given the sheet headers + a few sample rows, ask Haiku to map each source
// column to a known patient field. Cheap (one call per file, not per row) and
// resilient — falls back to deterministic keyword matching if no API key.

export type ImportFieldKey =
  | 'display_name' | 'nickname' | 'date_of_birth' | 'age' | 'gender'
  | 'phone' | 'whatsapp_number' | 'email'
  | 'emergency_contact_name' | 'emergency_contact_phone'
  | 'diagnosis' | 'icd_codes' | 'therapy_modality' | 'therapy_goals' | 'medications'
  | 'presenting_concerns' | 'total_sessions' | 'session_frequency'
  | 'patient_id_number' | 'fee_per_session';

const IMPORT_FIELDS: ImportFieldKey[] = [
  'display_name', 'nickname', 'date_of_birth', 'age', 'gender',
  'phone', 'whatsapp_number', 'email', 'emergency_contact_name',
  'emergency_contact_phone', 'diagnosis', 'icd_codes', 'therapy_modality', 'therapy_goals',
  'medications', 'presenting_concerns', 'total_sessions', 'session_frequency',
  'patient_id_number', 'fee_per_session',
];

// Deterministic fallback — keyword matching, returns field → sourceColumn
function keywordMapping(headers: string[]): Partial<Record<ImportFieldKey, string>> {
  const hints: Record<ImportFieldKey, string[]> = {
    display_name: ['full name', 'patient name', 'client name', 'name', 'patient', 'client'],
    nickname: ['nickname', 'preferred name', 'goes by'],
    date_of_birth: ['date of birth', 'dob', 'birth date', 'birthdate', 'birthday'],
    age: ['age', 'years old'],
    gender: ['gender', 'sex'],
    phone: ['phone', 'mobile', 'contact number', 'cell', 'telephone'],
    whatsapp_number: ['whatsapp', 'whats app', 'wa number'],
    email: ['email', 'e-mail', 'mail'],
    emergency_contact_name: ['emergency contact name', 'emergency name', 'next of kin'],
    emergency_contact_phone: ['emergency contact phone', 'emergency phone', 'emergency number'],
    diagnosis: ['diagnosis', 'condition', 'disorder', 'dx', 'presenting problem'],
    icd_codes: ['icd', 'icd-10', 'icd10', 'icd code'],
    therapy_modality: ['modality', 'therapy type', 'treatment type', 'approach'],
    therapy_goals: ['therapy goals', 'treatment goals', 'goals', 'objectives'],
    medications: ['medication', 'meds', 'drugs', 'prescription'],
    presenting_concerns: ['presenting concern', 'concerns', 'chief complaint', 'reason', 'notes', 'issues'],
    total_sessions: ['total sessions', 'session count', 'no of sessions', 'number of sessions', 'sessions'],
    session_frequency: ['frequency', 'session frequency', 'cadence'],
    patient_id_number: ['patient id', 'file no', 'file number', 'record number', 'mrn', 'uhid'],
    fee_per_session: ['fee', 'rate', 'charge', 'price per session', 'session fee'],
  };
  const used = new Set<string>();
  const out: Partial<Record<ImportFieldKey, string>> = {};
  for (const field of IMPORT_FIELDS) {
    const match = headers.find(h => {
      if (used.has(h)) return false;
      const lower = h.toLowerCase().trim();
      return hints[field].some(k => lower.includes(k));
    });
    if (match) { out[field] = match; used.add(match); }
  }
  return out;
}

export async function inferImportMapping(
  headers: string[],
  sampleRows: Record<string, unknown>[],
): Promise<Partial<Record<ImportFieldKey, string>>> {
  const fallback = keywordMapping(headers);
  if (USE_MOCK) return fallback;

  const client = anthropic();
  if (!client) return fallback;

  const sample = JSON.stringify(sampleRows.slice(0, 5), null, 0);

  try {
    const res = await client.messages.create({
      model: HAIKU,
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You map spreadsheet columns to a clinic's patient database fields. Read the column headers AND the sample values to infer what each column holds — headers may be ambiguous, cryptic, or in another language, so use the data to decide.

TARGET FIELDS (map to these exact keys):
- display_name  (patient's full name — REQUIRED)
- nickname      (preferred/short name)
- date_of_birth (any date format)
- age           (number of years)
- gender        (male / female / other)
- phone         (primary phone)
- whatsapp_number
- email
- emergency_contact_name
- emergency_contact_phone
- diagnosis     (clinical condition(s), plain-language)
- icd_codes     (ICD-10/ICD-11 diagnostic codes specifically, e.g. "F41.1" — distinct from the plain-language diagnosis column if both exist)
- therapy_modality (CBT, DBT, EMDR, etc.)
- therapy_goals (treatment goals/objectives, free text or list)
- medications
- presenting_concerns (free-text notes / chief complaint)
- total_sessions (a count)
- session_frequency (weekly / biweekly / monthly)
- patient_id_number (clinic's own file/record number — MRN, UHID, file no., etc.)
- fee_per_session (a monetary amount)

COLUMN HEADERS:
${JSON.stringify(headers)}

SAMPLE ROWS:
${sample}

Return ONLY valid JSON: an object whose keys are the target fields above and whose values are the EXACT source column header that best matches. Omit any target field with no good match. Never map two target fields to the same column. Example: {"display_name":"Patient","date_of_birth":"DOB","phone":"Contact No"}`,
      }],
    });

    const text = res.content[0]?.type === 'text' ? res.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const raw = JSON.parse(match[0]) as Record<string, string>;
    const out: Partial<Record<ImportFieldKey, string>> = {};
    for (const field of IMPORT_FIELDS) {
      const col = raw[field];
      if (col && headers.includes(col)) out[field] = col;
    }
    // Guarantee a name mapping — fall back to keyword guess if AI missed it
    if (!out.display_name && fallback.display_name) out.display_name = fallback.display_name;
    return out;
  } catch {
    return fallback;
  }
}

// ─── Public: full session notes (2-stage) ─────────────────────────────────────
export async function generateSessionNotes(params: {
  transcript: TranscriptSegment[];
  patient: Patient;
  sessionNumber: number;
  previousSessionSummary?: string;
  manualNotes?: string;
  speakerMap?: Record<string, { role: string; name: string | null; display: string }>;
}): Promise<SessionNotes> {
  if (USE_MOCK) return mockSessionNotes(params.patient.display_name, params.patient.diagnosis ?? []);

  const client = anthropic();
  if (!client) return mockSessionNotes(params.patient.display_name, params.patient.diagnosis ?? []);

  // Stage 1: Haiku compresses the long transcript (handles 30-60 min sessions cheaply)
  const brief = await compressTranscript(client, params.transcript, params.patient, params.speakerMap);

  // Stage 2: Sonnet synthesises clinical notes from the compact brief
  return synthesiseClinicalNotes(
    client,
    brief,
    params.patient,
    params.sessionNumber,
    params.previousSessionSummary,
    params.manualNotes,
  );
}

// ─── Public: live 2-min update (Haiku only, no Sonnet) ───────────────────────
export async function generateLiveNotesUpdate(params: {
  transcript: TranscriptSegment[];
  patient: Patient;
  sessionNumber: number;
}): Promise<{
  key_points: string[];
  risk_level: string;
  suggested_questions: string[];
  treatment_suggestions: string[];
  mindfulness_suggestions: string[];
}> {
  if (USE_MOCK) return mockLiveUpdate();

  const client = anthropic();
  if (!client) return mockLiveUpdate();

  const recent = params.transcript.slice(-20)
    .map(s => `${s.speaker}: ${s.text.trim()}`)
    .join('\n');

  const diagnosis = (params.patient.diagnosis ?? []).join(', ');
  const modality  = params.patient.therapy_modality ?? 'unspecified';

  const res = await client.messages.create({
    model: HAIKU,
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: `Therapy session in progress (single laptop mic, everyone in same room). Registered patient diagnosis: ${diagnosis}. Modality: ${modality}.

WHO'S TALKING: the speaker asking structured/reflective questions and introducing technique = clinician. The registered patient (matching the profile above) shares their own experience in first person. A THIRD voice may also be present — a spouse, parent, or family member sitting in on this session, also speaking in first person about their OWN experience. If a third voice exists, do not fold their words into the patient's — keep them distinct. Refer to them by their real name if it's been clearly said aloud in the dialogue; otherwise call them "the other person present" or "her partner"/"his father" etc. if that relationship is clear from context. NEVER write a raw diarization label like "Speaker C" in any output field — that's an internal identifier, not something a clinician reading the note should see. Attributing one person's statement to the other is a serious error, not a stylistic slip — if you're unsure which of two non-clinician speakers said something, describe it in a way that doesn't commit to either, rather than guessing.

Recent dialogue:
${recent}

Return ONLY valid JSON — no markdown:
{
  "key_points": ["0-4 specific real-time observations, correctly attributed to whoever actually said/showed it — ONLY include one if grounded in something actually said/observed above. Name what was just said, e.g. 'Patient shifted to past tense when describing relationship — possible dissociation'. If the dialogue so far doesn't clearly support a real observation, return an empty array rather than guessing."],
  "risk_level": "low|moderate|high|critical",
  "suggested_questions": ["0-3 follow-up questions the clinician could ask NEXT, in the style of a specific, gentle, resolution-oriented clinician — not a textbook-101 reflex. Ground every one in an exact quote or detail from the dialogue above; never a question that would work in any session ('how does that make you feel', 'can you tell me more about that'). Use whichever of these actually fits what just happened — don't force all of them in:
    (a) If someone stated a fact or behaviour about themselves (e.g. 'I don't cry'), ask about the belief or meaning underneath it using a concrete contrast that makes it easy to answer — e.g. 'does staying dry feel like relief, or like you're not allowed to' — not an open 'why'.
    (b) If something disclosed earlier in this session plausibly explains what's happening now (a parent's own history, a stated household rule, an old pattern), connect the current moment back to it directly as a hypothesis to confirm or correct — don't ask as if starting from zero.
    (c) If someone minimises or downplays something that clearly mattered ('sounds silly', 'it's nothing', a dismissive laugh) — that's a signal the topic isn't closed, not a cue to move on. Suggest asking them to say more right now.
    (d) If two people reach agreement on something consequential unusually fast or easily, that ease can itself be worth naming (relief, avoidance, withdrawal) rather than taken at face value — ask what each person is actually seeking or moving away from.
    Always forward/resolution-oriented — never a question that digs for regret or blame ('why didn't you', 'don't you wish you had'). If nothing in the last few exchanges clearly supports one of these, return an empty array — never a generic question just to fill the slot."],
  "treatment_suggestions": ["0-2 in-session technique suggestions — ONLY if something concrete is emerging that clearly calls for one, naming the exact technique and why, e.g. 'Consider grounding exercise — affect escalating for [name/patient]'. Empty array if not confident."],
  "mindfulness_suggestions": ["0-2 concrete exercises suited to whoever's CURRENT emotional state actually calls for one — be specific, e.g. '4-7-8 breathing for the anxiety spike' not just 'breathing exercise'. Empty array if nothing specific fits yet."]
}
Never pad any array to "have something to show" — an empty array is the correct answer when you're not confident. Gentle tone throughout, never clinical-interrogation-style.`,
    }],
  });

  const text  = res.content[0]?.type === 'text' ? res.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return mockLiveUpdate();
  return JSON.parse(match[0]);
}
