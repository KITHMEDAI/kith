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

  const res = await client.messages.create({
    model: HAIKU,
    max_tokens: 1600,
    messages: [{
      role: 'user',
      content: `You are an expert clinical transcript analyst. Recording: single laptop mic, clinician and patient in same room. Speaker labels are voice-diarization (reliable across full session, may slip on 1-2 short turns).

REPAIR LOW-CONFIDENCE WORDS FIRST:
- Some words are marked ⟨low-confidence words to verify from context: …⟩ — these were probably mis-heard by the speech recogniser.
- Before analysing, silently reconstruct each flagged word into the most plausible word/phrase using the FULL conversation context (surrounding sentences, clinical topic, the speaker's intent). Also fix any other obviously garbled words even if unflagged.
- Work from the CORRECTED meaning throughout. Never quote a garbled word verbatim — use your corrected reading.

IDENTIFY ROLES:
- CLINICIAN: opens session, asks structured/reflective questions, uses clinical language, references past sessions, assigns homework, names techniques (CBT/DBT/EMDR/ACT/MI), validates without advising.
- PATIENT: shares lived experience, emotions, specific events, responds to clinician prompts, uses first-person language ("I feel", "I can't", "last week I").
- Use MAJORITY pattern per speaker across ALL their turns.

Patient context: Dx — ${(patient.diagnosis ?? []).join(', ')} | Modality: ${patient.therapy_modality ?? 'unspecified'}${speakerContext}

TRANSCRIPT:
${raw}

Return ONLY valid JSON — be SPECIFIC to THIS session, not a template. Every field must reflect actual content:
{
  "speaker_roles": {"Speaker A": "clinician", "Speaker B": "patient"},
  "role_confidence": "high|medium|low",
  "duration_estimate": "e.g. 45 min",
  "presenting_concerns": "Specific issues raised TODAY — name actual events/topics (e.g. 'conflict with mother on Sunday, sleep disruption, work deadline avoidance')",
  "emotional_tone": "calm|distressed|flat|anxious|tearful|mixed|guarded|hopeful",
  "key_themes": ["3-5 specific clinical themes — name real patterns, not generic words. E.g. 'catastrophising around job performance', 'anniversary grief re: father'"],
  "significant_statements": ["2-4 near-verbatim patient quotes that reveal cognitions, self-image, or risk"],
  "clinician_interventions": ["specific techniques actually used — e.g. 'Socratic questioning re: cognitive distortion', 'behavioural activation plan for morning routine'"],
  "mood_indicators": "Observed affect, energy, engagement level, any flat affect or dissociation noted",
  "risk_signals": "List ANY SI/SH/HI or hopelessness statements verbatim. If none: 'No SI/SH/HI detected this session.'",
  "homework_discussed": "Exact task assigned + review of previous homework, or 'None assigned'",
  "session_arc": "How state shifted start-to-end — e.g. 'Opened guarded; tearful mid-session on father topic; closed with relief after behavioural plan'"
}`,
    }],
  });

  const text = res.content[0]?.type === 'text' ? res.content[0].text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
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
    "objective": "2-4 short points separated by ' • '. Observed affect, engagement, shifts. e.g. 'Flat affect; tearful re: father • Speech organised, goal-directed'",
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
  "ai_suggestions": ["0-3 observations — ONLY ones you are genuinely confident are clinically useful and specific to what happened THIS session. If nothing in the brief clearly warrants a suggestion, or you're not confident, return an EMPTY array. NEVER pad with a generic or filler entry (e.g. 'continue monitoring', 'session trajectory positive') just to have something to show. ACTION-FIRST verb, ≤ 14 words each. Never judge the patient or their choices."],
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
- Use ${initials} always, never full name.
- risk_flags.level = high/critical if ANY SI, self-harm urges, harm to others, or psychotic symptoms present.
- prescription_notes: you are NOT a prescriber — only flag medication themes for psychiatrist review.
- resource_suggestions.exercises: ONLY include when clinically indicated by session content. If patient is stable/improving and no specific exercise is needed, OMIT the array entirely. Do not invent tasks to fill space.
- resource_suggestions.books: only REAL published books, only when directly relevant. Omit if nothing fits precisely.
- resource_suggestions.apps: omit entirely if nothing is genuinely helpful — do not pad with generic apps.
- ai_suggestions: never judge patient behaviour or choices. State observations clinically and neutrally. If things are going well, say so directly.
- Return ONLY JSON, no markdown fences.`;

  const res = await client.messages.create({
    model: SONNET,
    max_tokens: 4096,   // headroom so long sessions don't truncate mid-JSON
    messages: [{ role: 'user', content: prompt }],
  });

  const text  = res.content[0]?.type === 'text' ? res.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Sonnet returned non-JSON response');
  return parseNotesJson(match[0]);
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
  | 'diagnosis' | 'therapy_modality' | 'medications'
  | 'presenting_concerns' | 'total_sessions' | 'session_frequency';

const IMPORT_FIELDS: ImportFieldKey[] = [
  'display_name', 'nickname', 'date_of_birth', 'age', 'gender',
  'phone', 'whatsapp_number', 'email', 'emergency_contact_name',
  'emergency_contact_phone', 'diagnosis', 'therapy_modality',
  'medications', 'presenting_concerns', 'total_sessions', 'session_frequency',
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
    diagnosis: ['diagnosis', 'condition', 'disorder', 'dx', 'icd', 'presenting problem'],
    therapy_modality: ['modality', 'therapy type', 'treatment type', 'approach'],
    medications: ['medication', 'meds', 'drugs', 'prescription'],
    presenting_concerns: ['presenting concern', 'concerns', 'chief complaint', 'reason', 'notes', 'issues'],
    total_sessions: ['total sessions', 'session count', 'no of sessions', 'number of sessions', 'sessions'],
    session_frequency: ['frequency', 'session frequency', 'cadence'],
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
- diagnosis     (clinical condition(s))
- therapy_modality (CBT, DBT, EMDR, etc.)
- medications
- presenting_concerns (free-text notes / chief complaint)
- total_sessions (a count)
- session_frequency (weekly / biweekly / monthly)

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
      content: `Therapy session in progress (single laptop mic, both in same room). Patient diagnosis: ${diagnosis}. Modality: ${modality}.

The speaker with MORE questions and clinical language = clinician. The speaker sharing personal experiences = patient. Use this to read the dialogue correctly.

Recent dialogue:
${recent}

Return ONLY valid JSON — no markdown:
{
  "key_points": ["0-4 specific real-time observations about the PATIENT's state — ONLY include one if grounded in something actually said/observed in the dialogue above. Name what was just said, e.g. 'Patient shifted to past tense when describing relationship — possible dissociation'. If the dialogue so far doesn't clearly support a real observation, return an empty array rather than guessing."],
  "risk_level": "low|moderate|high|critical",
  "suggested_questions": ["0-3 follow-up questions the clinician should ask NEXT — ONLY if grounded in the last few exchanges. E.g. 'You mentioned feeling 'stuck' — can you say more about what that feels like in your body right now?'. If nothing specific to follow up on yet, return an empty array — never a generic question."],
  "treatment_suggestions": ["0-2 in-session technique suggestions — ONLY if something concrete is emerging that clearly calls for one, e.g. 'Consider grounding exercise — patient's affect escalating'. Empty array if not confident."],
  "mindfulness_suggestions": ["0-2 concrete exercises suited to patient's CURRENT emotional state — be specific, e.g. '4-7-8 breathing for the anxiety spike' not just 'breathing exercise'. Empty array if nothing specific fits yet."]
}
Never pad any array to "have something to show" — an empty array is the correct answer when you're not confident.`,
    }],
  });

  const text  = res.content[0]?.type === 'text' ? res.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return mockLiveUpdate();
  return JSON.parse(match[0]);
}
