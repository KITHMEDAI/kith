/**
 * Australian accent × noisy room eval.
 *
 * Each dialogue (scripts.json, Australian neural voices from synth.py) is run
 * at three noise levels (clean / busy 15 dB / loud 5 dB) through the same
 * Deepgram pre-recorded settings as the production polish pass
 * (lib/workspace/polish.ts) → note writer → judge against the script.
 * Measures word error rate, whether the hard words survive (place names,
 * medicines, Aussie slang, numbers), speaker separation, and note quality.
 *
 *   python scripts/workspace-eval/aus-noise/synth.py <AMI folder>
 *   npx tsx scripts/workspace-eval/aus-noise/run.ts               # field keyterms, notes + judge
 *   npx tsx scripts/workspace-eval/aus-noise/run.ts --stt-only    # transcription only (no Anthropic spend)
 *   add --user-terms to also boost the names a user would save on their profile (USER_TERMS)
 *
 * Deepgram responses are cached in out/ per keyterm list, so re-runs don't re-bill.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setup, pool, REPORT_DIR } from '../harness';
import { judgeStt, judgeControl, NOTE_DATE } from '../recording/judging';
import { normalise, align, speakerAccuracy, type Tok } from '../recording/wer';

interface Script { id: string; field: string; noteType: string; speakers: Record<string, string>; turns: [string, string][] }
const DIR = __dirname;
const OUT = path.join(DIR, 'out');
mkdirSync(OUT, { recursive: true });
const scripts: Script[] = JSON.parse(readFileSync(path.join(DIR, 'scripts.json'), 'utf8'));
const LEVELS = ['clean', 'busy', 'loud'] as const;

// Words that matter most in Australian care notes and that STT often gets wrong.
const HARD: Record<string, string[]> = {
  shift_summary: ['arvo', 'parramatta', 'hydrotherapy', 'panadol', 'servo', 'toastie', 'centrelink', 'voltaren', '545', 'chuffed'],
  home_visit: ['crook', 'brekkie', 'weet-bix', 'cuppa', 'coversyl', 'broncos', 'woolies', 'milo', 'kowalski'],
  incident_report: ['woolloongabba', 'graze', 'vanity', 'mehta', 'leanne', 'kylie', 'non-slip'],
  team_meeting: ['toowoomba', 'gatton', 'fortnight', 'arvo', 'jacinta', 'ahmed', 'screening', 'casuals'],
};

/**
 * What a user would type into "Names & terms" on their profile for these
 * dialogues: the people and places they work with. Brands and services come
 * from the field list (keyterms.ts), not from here.
 */
const USER_TERMS: Record<string, string[]> = {
  shift_summary: ['Darren', 'Jess', 'Liam', 'Parramatta'],
  home_visit: ['Kowalski', 'Broncos'],
  incident_report: ['Woolloongabba', 'Mehta', 'Leanne', 'Kylie', 'Tom', 'Priya', 'Sam'],
  team_meeting: ['Toowoomba', 'Gatton', 'Jacinta', 'Ahmed'],
};
const args = process.argv.slice(2);
const STT_ONLY = args.includes('--stt-only');
const WITH_USER_TERMS = args.includes('--user-terms');

async function transcribe(file: string, keyterms: string[]): Promise<any> {
  const tag = createHash('sha256').update(keyterms.join('|')).digest('hex').slice(0, 8);
  const cache = path.join(OUT, `dg-${path.basename(file, '.wav')}-${tag}.json`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
  // Same parameters as polish.ts transcribeFile (track "room").
  const qs = new URLSearchParams({ model: 'nova-3', language: 'en', smart_format: 'true', punctuate: 'true', utterances: 'true', utt_split: '0.8', diarize: 'true', mip_opt_out: 'true' });
  keyterms.forEach(k => qs.append('keyterm', k));
  const res = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
    method: 'POST', headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'audio/wav' }, body: readFileSync(file),
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${await res.text()}`);
  const json = await res.json();
  writeFileSync(cache, JSON.stringify(json, null, 1));
  return json;
}

const LABEL = (n: number) => `Speaker ${String.fromCharCode(65 + Math.min(n, 25))}`;

(async () => {
  await setup();
  const { generateNote, noteToText } = await import('../../../lib/workspace/generate');
  const { keytermsForField, MAX_KEYTERMS } = await import('../../../lib/workspace/keyterms');
  console.log(`mode: ${STT_ONLY ? 'stt only' : 'stt + notes'}, ${WITH_USER_TERMS ? 'field + user terms' : 'field terms'}`);

  const jobs = scripts.flatMap(sc => LEVELS.map(level => ({ sc, level })));
  const rows = await pool(jobs, 3, async ({ sc, level }) => {
    const file = path.join(DIR, 'audio', `${sc.id}.${level}.wav`);
    const keyterms = keytermsForField(sc.field, WITH_USER_TERMS ? USER_TERMS[sc.id] : []).slice(0, MAX_KEYTERMS);
    const dg = await transcribe(file, keyterms);
    const utts: any[] = dg.results?.utterances ?? [];
    const transcript = utts.map(u => `${LABEL(u.speaker ?? 0)}: ${u.transcript}`).join('\n');
    const scriptText = sc.turns.map(([s, t]) => `${sc.speakers[s]}: ${t}`).join('\n');

    const ref: Tok[] = sc.turns.flatMap(([s, t]) => normalise(t).map(w => ({ w, spk: s })));
    const hyp: Tok[] = utts.flatMap(u => normalise(u.transcript).map(w => ({ w, spk: String(u.speaker ?? 0) })));
    const a = align(ref, hyp);
    const spk = speakerAccuracy(ref, hyp, a.pairs);
    const low = transcript.toLowerCase();
    const hard = HARD[sc.id] ?? [];
    const missed = hard.filter(h => !low.includes(h));

    let j = { scores: {} as Record<string, number>, pass: false, issues: [] as string[] };
    let ctrl;
    if (!STT_ONLY) {
      const note = await generateNote({ input: transcript, inputMode: 'recorded', noteType: sc.noteType, field: sc.field, userName: 'Me', date: NOTE_DATE, dateISO: '2026-10-21T15:00:00+11:00', userTerms: WITH_USER_TERMS ? USER_TERMS[sc.id] : [] });
      j = await judgeStt(scriptText, transcript, noteToText(note));
    }
    if (!STT_ONLY && level === 'clean') {
      const perfect = sc.turns.map(([s, t]) => `Speaker ${s}: ${t}`).join('\n');
      const cn = await generateNote({ input: perfect, inputMode: 'recorded', noteType: sc.noteType, field: sc.field, userName: 'Me', date: NOTE_DATE, dateISO: '2026-10-21T15:00:00+11:00' });
      ctrl = await judgeControl(scriptText, perfect, noteToText(cn));
    }
    const r = {
      id: sc.id, level, wer: +(a.wer * 100).toFixed(1), speakers: spk.hypSpeakers, spkAcc: +(spk.accuracy * 100).toFixed(1),
      hardFound: `${hard.length - missed.length}/${hard.length}`, missed, sttErrors: a.errors.slice(0, 15),
      judge: j.scores, pass: j.pass, issues: j.issues.slice(0, 4), control: ctrl?.scores,
    };
    console.log(`${sc.id} [${level}] WER ${r.wer}%  hard ${r.hardFound}  spk ${r.spkAcc}% (${r.speakers})${STT_ONLY ? '' : `  judge ${JSON.stringify(j.scores)} ${j.pass ? 'PASS' : 'FAIL'}`}`);
    return r;
  });

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const avg = (lv: string, k: 'wer' | 'spkAcc') => {
    const xs = rows.filter(r => r.level === lv).map(r => r[k]);
    return (xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1);
  };
  const md = [
    `# Eval: Australian accent × noisy room (${stamp})`, '',
    'Australian neural voices (Natasha, William) reading NDIS / aged-care dialogues, at three noise levels, through the production Deepgram settings and note writer. Background noise is real meeting chatter (AMI, CC BY 4.0) plus traffic-style rumble for "loud".', '',
    `Keyterms: ${WITH_USER_TERMS ? 'field vocabulary + simulated per-user names & terms' : 'field vocabulary only'}.${STT_ONLY ? ' Transcription only (no notes written or judged).' : ''}`, '',
    `**Hard words kept: ${rows.reduce((n, r) => n + Number(r.hardFound.split('/')[0]), 0)}/${rows.reduce((n, r) => n + Number(r.hardFound.split('/')[1]), 0)}**`, '',
    '| Level | Avg word error rate | Avg speaker accuracy | Notes passed |', '|---|---|---|---|',
    ...LEVELS.map(lv => `| ${lv} | ${avg(lv, 'wer')}% | ${avg(lv, 'spkAcc')}% | ${rows.filter(r => r.level === lv && r.pass).length}/${rows.filter(r => r.level === lv).length} |`),
    '', '| Dialogue | Level | WER | Hard words kept | Missed | Speakers found / accuracy | Judge (faith/cov/spk/stt) | Pass | Control (perfect transcript) |', '|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.id} | ${r.level} | ${r.wer}% | ${r.hardFound} | ${r.missed.join(', ') || '—'} | ${r.speakers} / ${r.spkAcc}% | ${STT_ONLY ? '—' : `${r.judge.faithfulness}/${r.judge.coverage}/${r.judge.speaker_attribution}/${r.judge.stt_robustness}`} | ${STT_ONLY ? '—' : r.pass ? '✓' : '✗'} | ${r.control ? `${r.control.faithfulness}/${r.control.coverage}/${r.control.speaker_attribution}` : ''} |`),
    '', '## Transcription errors and judge issues', '',
    ...rows.flatMap(r => [`**${r.id} [${r.level}]**: ${r.sttErrors.join(', ') || 'no word errors'}`, ...r.issues.map((i: string) => `- ${i}`), '']),
  ].join('\n');
  const out = path.join(REPORT_DIR, `aus-noise-${stamp}${STT_ONLY ? '-stt' : ''}${WITH_USER_TERMS ? '-userterms' : ''}`);
  writeFileSync(`${out}.md`, md);
  writeFileSync(`${out}.json`, JSON.stringify(rows, null, 1));
  console.log(`\nreport → ${out}.md`);
})().catch(e => { console.error(e); process.exit(1); });
