/**
 * Recording-path eval: TTS dialogue → Deepgram pre-recorded (same params as the
 * live recorder) → "Speaker A: ..." transcript → generateNote → judge vs script.
 *
 *   powershell -ExecutionPolicy Bypass -File scripts/workspace-eval/recording/synth.ps1
 *   npx tsx scripts/workspace-eval/recording/run.ts
 *
 * Deepgram responses are cached in out/ so re-runs don't re-bill. A control note
 * is also generated from the PERFECT script transcript, to separate STT errors
 * from note-model errors.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { setup, pool, type CaseResult } from '../harness';
import { judgeStt, judgeControl, NOTE_DATE } from './judging';
import { normalise, align, speakerAccuracy, type Tok } from './wer';

interface Script { id: string; field: string; noteType: string; speakers: Record<string, string>; turns: [string, string][] }
const DIR = __dirname;
const OUT = path.join(DIR, 'out');
mkdirSync(OUT, { recursive: true });
const scripts: Script[] = JSON.parse(readFileSync(path.join(DIR, 'scripts.json'), 'utf8'));

// Same keyterms + params as hooks/useRealTimeTranscript.ts (buildWsUrl).
const CLINICAL_KEYTERMS = ['sertraline', 'escitalopram', 'fluoxetine', 'venlafaxine', 'clonazepam', 'olanzapine', 'lithium', 'bupropion', 'mirtazapine', 'SSRI', 'SNRI',
  'anxiety', 'depression', 'bipolar', 'schizophrenia', 'psychosis', 'OCD', 'PTSD', 'ADHD', 'panic attack', 'insomnia', 'anhedonia', 'dissociation', 'rumination', 'hypomania', 'suicidal ideation', 'self-harm',
  'CBT', 'DBT', 'EMDR', 'behavioural activation', 'exposure therapy', 'cognitive restructuring', 'mindfulness', 'grounding'];
const PARAMS = 'model=nova-3&language=multi&diarize=true&smart_format=true&utterances=true&utt_split=1.5&filler_words=false' +
  CLINICAL_KEYTERMS.map(t => `&keyterm=${encodeURIComponent(t)}`).join('');

async function transcribe(id: string): Promise<any> {
  const cache = path.join(OUT, `dg-${id}.json`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
  const audio = readFileSync(path.join(DIR, 'audio', `${id}.wav`));
  const res = await fetch(`https://api.deepgram.com/v1/listen?${PARAMS}`, {
    method: 'POST',
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'audio/wav' },
    body: audio,
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${await res.text()}`);
  const json = await res.json();
  writeFileSync(cache, JSON.stringify(json, null, 1));
  return json;
}

const LABEL = (n: number) => `Speaker ${({ 0: 'A', 1: 'B', 2: 'C', 3: 'D' } as Record<number, string>)[n] ?? String.fromCharCode(65 + n)}`;

(async () => {
  await setup();
  if (!process.env.DEEPGRAM_API_KEY) throw new Error('DEEPGRAM_API_KEY missing');
  const { generateNote, noteToText } = await import('../../../lib/workspace/generate');

  const rows: { id: string; wer: number; spk: number; spkWord: number; hypSpk: number; errs: string[]; ctrl?: CaseResult }[] = [];

  const results = await pool(scripts, 3, async (sc): Promise<CaseResult> => {
    const t0 = Date.now();
    const dg = await transcribe(sc.id);
    const utts: any[] = dg.results?.utterances ?? [];
    // App-format transcript: one line per utterance, label = raw diarizer index (as the live hook does).
    const transcript = utts.map(u => `${LABEL(u.speaker ?? 0)}: ${u.transcript}`).join('\n');
    const scriptText = sc.turns.map(([s, t]) => `${sc.speakers[s]}: ${t}`).join('\n');
    const perfect = sc.turns.map(([s, t]) => `Speaker ${s}: ${t}`).join('\n');

    // WER + speaker accuracy
    const ref: Tok[] = sc.turns.flatMap(([s, t]) => normalise(t).map(w => ({ w, spk: s })));
    const hypUtt: Tok[] = utts.flatMap(u => normalise(u.transcript).map(w => ({ w, spk: String(u.speaker ?? 0) })));
    const hypWord: Tok[] = utts.flatMap(u => (u.words ?? []).flatMap((w: any) => normalise(w.punctuated_word ?? w.word).map(x => ({ w: x, spk: String(w.speaker ?? 0) }))));
    const a = align(ref, hypUtt);
    const sp = speakerAccuracy(ref, hypUtt, a.pairs);
    const aw = align(ref, hypWord);
    const spw = speakerAccuracy(ref, hypWord, aw.pairs);

    // Generations are cached in out/gen-<id>.json so re-runs only re-judge.
    const genCache = path.join(OUT, `gen-${sc.id}.json`);
    let gen: { note: any; noteText: string; ctrlText: string };
    if (existsSync(genCache)) gen = JSON.parse(readFileSync(genCache, 'utf8'));
    else {
      const [note, ctrlNote] = await Promise.all([
        generateNote({ input: transcript, inputMode: 'recorded', noteType: sc.noteType, field: sc.field, date: NOTE_DATE }),
        generateNote({ input: perfect, inputMode: 'recorded', noteType: sc.noteType, field: sc.field, date: NOTE_DATE }),
      ]);
      gen = { note, noteText: noteToText(note), ctrlText: noteToText(ctrlNote) };
      writeFileSync(genCache, JSON.stringify(gen, null, 1));
    }
    const { note, noteText, ctrlText } = gen;
    writeFileSync(path.join(OUT, `note-${sc.id}.txt`), `TRANSCRIPT
${transcript}

NOTE (from STT)
${noteText}

NOTE (control, perfect transcript)
${ctrlText}`);

    const j = await judgeStt(scriptText, transcript, noteText);
    const jc = await judgeControl(scriptText, perfect, ctrlText);

    rows.push({ id: sc.id, wer: a.wer, spk: sp.accuracy, spkWord: spw.accuracy, hypSpk: sp.hypSpeakers, errs: a.errors,
      ctrl: { id: sc.id + ':control', area: 'recording', pass: jc.pass, scores: jc.scores, issues: jc.issues } });
    console.log(`${sc.id}: WER ${(a.wer * 100).toFixed(1)}%  spk ${(sp.accuracy * 100).toFixed(1)}% (word-level ${(spw.accuracy * 100).toFixed(1)}%, ${sp.hypSpeakers} spk)  judge ${JSON.stringify(j.scores)} ctrl ${JSON.stringify(jc.scores)}`);
    return {
      id: sc.id, area: 'recording', pass: j.pass, scores: j.scores, issues: j.issues, ms: Date.now() - t0,
      output: { wer: a.wer, sub: a.sub, del: a.del, ins: a.ins, refWords: a.refWords, speakerAcc: sp.accuracy, speakerAccWordLevel: spw.accuracy,
        hypSpeakers: sp.hypSpeakers, sttErrors: a.errors, transcript, note, control: { scores: jc.scores, issues: jc.issues, pass: jc.pass }, judgeNotes: j.notes },
    };
  });

  writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(rows, null, 1));
  const totRef = results.reduce((s, r) => s + (r.output as any).refWords, 0);
  const totErr = results.reduce((s, r) => { const o = r.output as any; return s + o.sub + o.del + o.ins; }, 0);
  const md = [
    '## Metrics', '',
    `Pooled WER: **${(100 * totErr / totRef).toFixed(1)}%** over ${totRef} reference words.`, '',
    '| Case | WER | Speaker acc (utterance label) | Speaker acc (word) | #spk | Judge (STT note) | Control (perfect transcript) |', '|---|---|---|---|---|---|---|',
    ...rows.sort((x, y) => x.id.localeCompare(y.id)).map(r => {
      const res = results.find(x => x.id === r.id)!;
      return `| ${r.id} | ${(r.wer * 100).toFixed(1)}% | ${(r.spk * 100).toFixed(1)}% | ${(r.spkWord * 100).toFixed(1)}% | ${r.hypSpk} | ${Object.values(res.scores ?? {}).join('/')} | ${Object.values(r.ctrl?.scores ?? {}).join('/')} |`;
    }),
    '', 'Judge columns: faithfulness/coverage/speaker_attribution/stt_robustness; control: faithfulness/coverage/speaker_attribution.', '',
    '## STT errors per case (normalised; a→b = substitution, -x deletion, +x insertion)', '',
    ...rows.map(r => `- **${r.id}**: ${r.errs.slice(0, 40).join(', ') || '(none)'}`),
    '', '## Control-run issues', '',
    ...rows.flatMap(r => (r.ctrl?.issues ?? []).map(i => `- ${r.id}: ${i}`)),
  ].join('\n');
  writeFileSync(path.join(OUT, 'metrics.md'), md);
  writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  console.log('wrote out/results.json + out/metrics.md; run finalize.ts to publish the report');
})().catch(e => { console.error(e); process.exit(1); });
