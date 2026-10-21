/**
 * scripts/workspace-eval/notes/run.ts
 *
 * Note-generation quality eval. For each case: generateNote() (timed), then
 * deterministic checks + LLM judge. Results are saved to notes/out/<label>.json;
 * notes/report.ts turns baseline (+ optional experimental re-run) into the report.
 *
 *   npx tsx scripts/workspace-eval/notes/run.ts                 # baseline, all cases
 *   npx tsx scripts/workspace-eval/notes/run.ts --only a,b      # subset
 *   npx tsx scripts/workspace-eval/notes/run.ts --exp --failed  # experimental prompt on baseline failures
 *   add --report to write the report straight away (report.ts does it otherwise)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { setup, judge, pool, type CaseResult } from '../harness';
import { CASES, type NoteCase } from './cases';

export const OUT_DIR = path.join(__dirname, 'out');
const DATE = '21 October 2026';
const USER = 'Alex';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

interface Note {
  title: string; summary: string;
  sections: { heading: string; points: string[] }[];
  action_items: { task: string; owner: string | null; due: string | null }[];
  decisions: string[]; follow_ups: string[];
  flags: { level: string; text: string }[];
  missing_info: string[]; tags: string[];
}

export interface NoteCaseResult extends CaseResult {
  field: string; noteType: string; inputMode: string;
  hardIssues: string[]; softIssues: string[];
  judgeIssues: string[]; judgeNotes?: string;
  noteText?: string; profile?: string;
}

// ── deterministic checks ─────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('the and for with from that this was are has have not but you all any can will its his her she him they them their our out per via into onto about after before over under been being also just get got need needs to of in on at by an a is it be as or if so do no yes'.split(' '));
const toks = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w)));
function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size < 4 || b.size < 4) return 0;
  let inter = 0; a.forEach(x => { if (b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}
const ADVICE = [
  /\b(i|we) (would )?(recommend|suggest|advise)\b/i,
  /\bconsider (starting|prescribing|commencing|stopping|ceasing|switching|increasing|reducing)\b/i,
  /\bshould (start|commence|stop|cease|switch to|be prescribed|be treated|be given)\b/i,
  /\b(likely|probable|suspected|presumed) (diagnosis|cause|aetiology|etiology)\b/i,
  /\bconsistent with\b/i, /\bsuggestive of\b/i, /\bindicative of\b/i,
  /\b(caused by|secondary to|attributable to) (the )?(medication|drug|treatment|product)\b/i,
  /\bdifferential(s)?\b/i,
];
const SYNONYMS: Record<string, string[]> = {
  electrician: ['sparky', 'sparkies', 'sparkie'], sparky: ['electrician'], clinician: ['doctor', ' gp', 'dr ', 'see you back', "i'd like"],
  plumber: ['plumbing'], tiler: ['tiling'], carpenter: ['chippy'], vet: ['veterinarian'], council: ['council'],
};
const META_HEADINGS = ['decisions', 'action items', 'actions', 'follow ups', 'follow up', 'flags', 'missing information', 'next steps'];
const RELATIVE = /\b(tmrw|tomorrow|today|tonight|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|wk|month|mth|eod|cob|asap|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|\d)/i;

function detChecks(c: NoteCase, note: Note, sectionsOf: (k: string) => string[]) {
  const hard: string[] = []; const soft: string[] = [];
  const inputL = c.input.toLowerCase();
  // shape
  if (!note.title?.trim() || note.title === 'Untitled note') hard.push('shape: empty title');
  if (!note.summary?.trim()) hard.push('shape: empty summary');
  if (note.title && note.title.split(/\s+/).length > 12) soft.push(`title > 10 words: "${note.title}"`);
  if (!note.sections.length) hard.push('shape: no sections');
  // headings
  const expected = sectionsOf(c.noteType).map(norm);
  for (const s of note.sections) {
    const h = norm(s.heading);
    if (META_HEADINGS.includes(h) && !expected.includes(h)) hard.push(`heading duplicates a dedicated field: "${s.heading}"`);
    if (c.noteType !== 'custom' && expected.length && !expected.some(e => e === h || e.startsWith(h) || h.startsWith(e)))
      hard.push(`unexpected heading "${s.heading}" (expected one of: ${sectionsOf(c.noteType).join(' | ')})`);
  }
  if (c.noteType !== 'custom') {
    const order = note.sections.map(s => expected.findIndex(e => { const h = norm(s.heading); return e === h || e.startsWith(h) || h.startsWith(e); })).filter(i => i >= 0);
    if (order.some((v, i) => i > 0 && v < order[i - 1])) soft.push('headings out of template order');
  }
  // missing_info
  if (note.missing_info.length > 5) hard.push(`missing_info has ${note.missing_info.length} items (> 5)`);
  // owners / dues
  const firstPerson = /\b(i'll|i will|i'd|i need|i said|i've|i'm|me|my|i)\b/i.test(c.input);
  for (const a of note.action_items) {
    if (a.owner) {
      const o = a.owner.toLowerCase();
      const words = Array.from(toks(o)).filter(w => !['team', 'staff', 'person'].includes(w));
      const isAuthor = o.includes(USER.toLowerCase()) || /author|\bme\b|\bi\b/.test(o);
      const syn = words.flatMap(w => SYNONYMS[w] ?? []);
      const grounded = words.some(w => inputL.includes(w)) || syn.some(w => inputL.includes(w)) || /speaker [a-e]/.test(o);
      if (isAuthor) {
        if (c.inputMode === 'typed') soft.push(`author "${a.owner}" assigned as owner (typed notes, implicit first person) - verify task was stated: "${a.task.slice(0, 90)}"`);
        else if (!firstPerson) hard.push(`author assigned as owner without first-person commitment: "${a.task}"`);
      } else if (!grounded) hard.push(`owner not grounded in input: "${a.owner}" for "${a.task}"`);
    }
    if (a.due) {
      const dueToks = Array.from(toks(a.due));
      const urgentWord = /\b(immediately|asap|urgent|as soon as possible|now|today|tonight|straight away)\b/i;
      const ok = dueToks.some(w => inputL.includes(w)) || (urgentWord.test(a.due) ? urgentWord.test(c.input) : (RELATIVE.test(a.due) && RELATIVE.test(c.input)));
      if (!ok) hard.push(`due not grounded in input: "${a.due}" for "${a.task}"`);
    }
  }
  // duplicates
  const pts = note.sections.flatMap(s => s.points.map(p => ({ p, h: s.heading })));
  const groups: [string, string[]][] = [['decision', note.decisions], ['action', note.action_items.map(a => a.task)], ['follow-up', note.follow_ups]];
  for (const { p, h } of pts) for (const [g, items] of groups) for (const it of items)
    if (jaccard(toks(p), toks(it)) >= 0.6) hard.push(`duplicate: section "${h}" point repeats ${g}: "${it.slice(0, 80)}"`);
  for (const a of note.action_items) for (const f of note.follow_ups)
    if (jaccard(toks(a.task), toks(f)) >= 0.6) hard.push(`duplicate: action and follow-up: "${f.slice(0, 80)}"`);
  for (const { p, h } of pts) for (const fl of note.flags)
    if (jaccard(toks(p), toks(fl.text)) >= 0.6) soft.push(`section "${h}" point repeats a flag: "${fl.text.slice(0, 70)}"`);
  const missSec = note.sections.find(s => norm(s.heading) === 'missing information');
  if (missSec && note.missing_info.length) soft.push('"Missing information" appears both as a section and in missing_info');
  // advice language
  const all = [note.summary, ...pts.map(x => x.p), ...note.flags.map(f => f.text), ...note.follow_ups, ...note.action_items.map(a => a.task)].join('\n');
  for (const re of ADVICE) {
    const m = all.match(re);
    if (m && !re.test(c.input)) hard.push(`advice/diagnosis language: "${m[0]}" in "${all.slice(Math.max(0, m.index! - 50), m.index! + 60).replace(/\n/g, ' ')}"`);
  }
  return { hard, soft };
}

// ── judge ───────────────────────────────────────────────────────────
const CRITERIA = {
  faithfulness: 'No invented facts, names, numbers, dates, roles, diagnoses, causes or commitments; uncertain items (marked ?, "maybe", "I think") stay uncertain; nothing stated as decided that was not decided. Resolving relative dates against the provided note date is ALLOWED only if the arithmetic is correct.',
  coverage: 'Every material fact, number, decision, commitment, risk and open question in the input is captured somewhere in the note.',
  structure: 'Uses the note type\'s headings (in order) where the input supports them, omits headings with no content rather than padding, and keeps decisions/actions/flags out of sections (no double-ups).',
  field_fit: 'Vocabulary, framing and compliance awareness suit the field (e.g. "participant" for NDIS, SIRS for aged care, PV for pharma, WHS for construction); reads like a competent professional in that field wrote it.',
  flags_quality: 'Flags every real safety/compliance/clinical/legal risk present with a sensible level (urgent when someone may be at risk or a regulatory clock may be running), describes what to check without deciding; does not flag trivia. An EMPTY flags list is correct (score 5) when the input contains no real risk - never penalise absence of flags in that case.',
  concision: 'Skimmable, one idea per point, no padding, no repetition, title specific and short, summary 2-3 sentences.',
};

async function judgeCase(c: NoteCase, noteText: string, NOTE_TYPE_MAP: any, FIELD_MAP: any, profile?: string) {
  const t = NOTE_TYPE_MAP[c.noteType];
  const f = FIELD_MAP[c.field];
  const fieldDesc = c.field === 'other' ? `${c.fieldCustom} (custom field; AI profile: ${profile})` : `${f.label} — profile: ${f.profile}`;
  const typeDesc = c.noteType === 'custom'
    ? `Custom note. User's description: "${c.customInstruction}"`
    : `${t.label}. Expected sections (in order, omit if unsupported): ${t.sections.join(' | ')}. Guidance: ${t.guidance}`;
  const payload = `FIELD: ${fieldDesc}
NOTE TYPE: ${typeDesc}
DATE CONTEXT: The model WAS GIVEN the note date "21 October 2026" (a Wednesday) and author name "Alex". Resolving "tmrw" to Thu 22 Oct, "Fri" to 23 Oct, "Mon" (past) to 19 Oct is allowed and correct; wrong arithmetic is a faithfulness error. Leaving a relative date unresolved is also fine.
INPUT MODE: ${c.inputMode === 'recorded' ? 'recording transcript (speaker labels from diarisation, names only known if spoken)' : 'typed rough notes by the author'}
KNOWN TRAPS IN THIS INPUT (check each specifically): ${c.traps}

INPUT:
"""
${c.input}
"""

GENERATED NOTE (sections, then dedicated fields: Decisions, Action items "(owner), due", Follow-ups, Flags [level], Missing information):
"""
${noteText}
"""`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await judge('Turn a transcript or rough typed notes into a structured professional note of the given type for the given field', CRITERIA, payload); }
    catch (e) { if (attempt === 2) throw e; }
  }
  throw new Error('unreachable');
}

// ── main ────────────────────────────────────────────────────────────
async function main() {
  await setup();
  const exp = flag('--exp');
  const gen = exp ? await import('./exp-generate') : await import('../../../lib/workspace/generate');
  const { NOTE_TYPE_MAP } = await import('../../../lib/workspace/note-types');
  const { FIELD_MAP } = await import('../../../lib/workspace/fields');
  const realGen = await import('../../../lib/workspace/generate');
  const typeMap: any = exp && (gen as any).NOTE_TYPE_MAP ? (gen as any).NOTE_TYPE_MAP : NOTE_TYPE_MAP;
  const fieldMap: any = exp && (gen as any).FIELD_MAP ? (gen as any).FIELD_MAP : FIELD_MAP;

  let cases = CASES;
  const only = opt('--only');
  if (only) { const ids = only.split(','); cases = cases.filter(c => ids.includes(c.id)); }
  if (flag('--failed')) {
    const base: NoteCaseResult[] = JSON.parse(readFileSync(path.join(OUT_DIR, 'baseline.json'), 'utf8'));
    const failed = new Set(base.filter(r => !r.pass).map(r => r.id));
    cases = cases.filter(c => failed.has(c.id));
  }
  const limit = opt('--limit'); if (limit) cases = cases.slice(0, Number(limit));
  const label = opt('--label') || (exp ? 'exp' : 'baseline');
  console.log(`Running ${cases.length} cases (${label})`);

  // field profiles for "other" (cached, one per profession) — always the real generateFieldProfile
  mkdirSync(OUT_DIR, { recursive: true });
  const profFile = path.join(OUT_DIR, exp ? 'profiles-exp.json' : 'profiles.json');
  const profiles: Record<string, string> = existsSync(profFile) ? JSON.parse(readFileSync(profFile, 'utf8')) : {};
  for (const c of cases) if (c.field === 'other' && c.fieldCustom && !profiles[c.fieldCustom]) {
    profiles[c.fieldCustom] = await ((exp ? gen : realGen) as any).generateFieldProfile(c.fieldCustom);
    console.log(`profile for ${c.fieldCustom}:\n${profiles[c.fieldCustom]}\n`);
  }
  writeFileSync(profFile, JSON.stringify(profiles, null, 2));

  let done = 0;
  const prior: Record<string, NoteCaseResult> = {};
  const rejudge = opt('--rejudge'); // path of a saved results file: re-score its notes without regenerating
  if (rejudge) for (const r of JSON.parse(readFileSync(path.join(OUT_DIR, rejudge), 'utf8')) as NoteCaseResult[]) prior[r.id] = r;
  const results = await pool(cases, 3, async (c): Promise<NoteCaseResult> => {
    const profile = c.field === 'other' ? profiles[c.fieldCustom!] : undefined;
    const base = { id: c.id, area: 'notes', field: c.field, noteType: c.noteType, inputMode: c.inputMode };
    try {
      const t0 = Date.now();
      const note = rejudge ? prior[c.id].output as Note : await (gen as any).generateNote({
        input: c.input, inputMode: c.inputMode, noteType: c.noteType, customInstruction: c.customInstruction,
        field: c.field, fieldCustom: c.fieldCustom ?? null, fieldProfile: profile ?? null, userName: USER, date: DATE,
      }) as Note;
      const ms = rejudge ? prior[c.id].ms! : Date.now() - t0;
      const noteText = realGen.noteToText(note as any);
      const { hard, soft } = detChecks(c, note, (k) => typeMap[k]?.sections ?? []);
      const j = await judgeCase(c, noteText, typeMap, fieldMap, profile);
      const pass = j.pass && hard.length === 0;
      console.log(`[${++done}/${cases.length}] ${pass ? 'PASS' : 'FAIL'} ${c.id} ${ms}ms ${JSON.stringify(j.scores)} hard=${hard.length}`);
      return {
        ...base, pass, ms, scores: j.scores, output: note, noteText, profile,
        hardIssues: hard, softIssues: soft, judgeIssues: j.issues, judgeNotes: j.notes,
        issues: [...hard.map(h => `[det] ${h}`), ...(j.pass ? [] : j.issues.map(i => `[judge ${Object.entries(j.scores).filter(([, v]) => Number(v) < 4).map(([k, v]) => `${k}=${v}`).join(',')}] ${i}`))],
      };
    } catch (e: any) {
      console.log(`[${++done}/${cases.length}] ERROR ${c.id}: ${e?.message}`);
      return { ...base, pass: false, hardIssues: [`error: ${e?.message}`], softIssues: [], judgeIssues: [], issues: [`error: ${e?.message}`] };
    }
  });

  writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${label}: ${passed}/${results.length} passed. Saved out/${label}.json`);
  if (flag('--report')) { const { buildReport } = await import('./report'); buildReport(); }
}

main().catch(e => { console.error(e); process.exit(1); });
