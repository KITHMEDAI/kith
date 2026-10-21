/**
 * Edge-case eval for generateNote() + API-level input validation.
 *   npx tsx scripts/workspace-eval/edge/run.ts
 * Generations are cached in out/gen-<id>.json (delete to regenerate).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { setup, judge, pool, type CaseResult } from '../harness';
import { CASES } from './cases';
import { DATE_CTX } from '../recording/judging';

const OUT = path.join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });
const DATE = '21 October 2026';

// Mirror of app/api/w/notes/route.ts:22 and components/workspace/NewNote.tsx:89 word checks.
const serverAccepts = (input: string) => !(String(input ?? '').trim().split(/\s+/).length < 3);
const clientAccepts = (transcript: string) => !(transcript.split(/\s+/).length < 4);

(async () => {
  await setup();
  const { generateNote, noteToText } = await import('../../../lib/workspace/generate');

  const results = await pool(CASES, 4, async (c): Promise<CaseResult> => {
    const cache = path.join(OUT, `gen-${c.id}.json`);
    let note: any, ms = 0, error: string | null = null;
    if (existsSync(cache)) ({ note, ms, error } = JSON.parse(readFileSync(cache, 'utf8')));
    else {
      const t0 = Date.now();
      try {
        note = await generateNote({ input: c.input, inputMode: c.inputMode ?? 'typed', noteType: c.noteType ?? 'general', field: c.field ?? 'general', customInstruction: c.customInstruction, date: DATE });
      } catch (e) { error = (e as Error).message; }
      ms = Date.now() - t0;
      writeFileSync(cache, JSON.stringify({ note, ms, error }, null, 1));
    }
    if (error || !note) return { id: c.id, area: 'edge', pass: false, issues: [`generateNote threw: ${error}`], ms };
    const text = noteToText(note);
    writeFileSync(path.join(OUT, `note-${c.id}.txt`), text);
    const problems = c.checks?.(text, note) ?? [];
    const j = await judge(`Edge case "${c.id}" for an AI note-taker (note date given to model: ${DATE}). Input mode: ${c.inputMode ?? 'typed'}; field: ${c.field ?? 'general'}; note type: ${c.noteType ?? 'general'}${c.customInstruction ? `; user's custom note description: "${c.customInstruction}"` : ''}.
${DATE_CTX}
Listing genuinely useful gaps in missing_info, and neutral review flags required by the field (safety, food safety, adverse events, incidents), are expected behaviour, not inventions; penalise only invented FACTS, advice the speaker did not give, or padding.`, {
      faithfulness: 'No facts, numbers, names, diagnoses or advice beyond the input (translation/format normalisation is fine).',
      expected_behaviour: `The note does what a careful professional tool should here: ${c.expect}`,
    }, `INPUT:\n${c.input.length > 6000 ? c.input.slice(0, 3000) + '\n[... middle omitted for the judge ...]\n' + c.input.slice(-3000) : c.input}\n\nNOTE:\n${text}`);
    const pass = j.pass && problems.length === 0;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${c.id} ${JSON.stringify(j.scores)} ${problems.join('; ')} (${ms} ms)`);
    return { id: c.id, area: 'edge', pass, scores: j.scores, issues: [...problems.map(p => `[check] ${p}`), ...j.issues], ms, output: { group: c.group, note, chars: c.input.length, words: c.input.split(/\s+/).length, judgeNotes: j.notes } };
  });

  // API-level validation probes (no network): what the current checks let through.
  const probes: [string, string][] = [
    ['empty', ''], ['two words', 'hello there'], ['3 emoji', '🙂 🙂 🙂'], ['3 punctuation', '. . .'],
    ['labels only (recorded)', 'Speaker A: ok'], ['labels + 1 word', 'Speaker A: hi\nSpeaker B: yes'],
    ['4 MB paste', 'word '.repeat(800_000)],
  ];
  const validation = probes.map(([name, s]) => ({ name, chars: s.length, server: serverAccepts(s), client: clientAccepts(s) }));
  writeFileSync(path.join(OUT, 'validation.json'), JSON.stringify(validation, null, 1));
  writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`);
  console.table(validation);
})().catch(e => { console.error(e); process.exit(1); });
