/**
 * Real-recording test: runs real meetings (AMI Meeting Corpus, CC BY 4.0,
 * University of Edinburgh) through the production pipeline and measures
 * what a pricing plan needs: file size, transcription time, Deepgram minutes,
 * transcript size vs the 200k-char cap, note-writing time, total time vs the
 * 300 s function limit, estimated cost, and note quality (LLM judge).
 *
 *   npx tsx scripts/workspace-eval/real-audio/run.ts <folder with .wav files> [case-id prefixes, comma-separated]
 *
 * Audio is converted like the recorder does (Opus 32 kbps, mono), uploaded to
 * the private bucket under a throwaway eval user, transcribed with the same
 * polish pass, then deleted. A 2.7 h file stitched from several meetings
 * tests the longest-session limit.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { setup, judge, evalUser, cleanupEvalUsers, REPORT_DIR } from '../harness';

const SRC = process.argv[2];
if (!SRC || !existsSync(SRC)) { console.error('usage: run.ts <folder with AMI .wav files>'); process.exit(1); }

// Deepgram PAYG (US$/min) and Claude Sonnet ($/M tokens), see docs/product/workspace-pricing-proposal.md
const DG_POLISH = 0.0043 + 0.0013, DG_LIVE_ROOM = 0.0048 + 0.0020 + 0.0013;
const IN_PER_M = 3, OUT_PER_M = 15, AUD = 1 / 0.65;
const MAX_INPUT_CHARS = 200_000, FUNCTION_LIMIT_S = 300;

const CACHE = path.join(os.tmpdir(), 'kith-real-audio-cache');
mkdirSync(CACHE, { recursive: true });

const LONG = ['EN2002a.Mix-Headset.wav', 'EN2002c.Mix-Headset.wav', 'TS3003c.Mix-Headset.wav', 'IS1009b.Mix-Headset.wav'];

function toOpus(inputs: string[], out: string) {
  const list = path.join(path.dirname(out), `${path.basename(out)}.txt`);
  writeFileSync(list, inputs.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ac', '1', '-c:a', 'libopus', '-b:a', '32k', out]);
}
const durationOf = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

(async () => {
  await setup();
  const { polishTranscript } = await import('../../../lib/workspace/polish');
  const { generateNote, noteToText } = await import('../../../lib/workspace/generate');
  const { userId, admin } = await evalUser('real-audio', 'general');
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'kith-real-audio-'));

  const wavs = readdirSync(SRC).filter(f => f.endsWith('.wav')).sort();
  const cases: { id: string; files: string[] }[] = wavs.map(f => ({ id: f.replace(/\..*$/, '') + (f.includes('Array') ? ' (far-field room mic)' : ''), files: [path.join(SRC, f)] }));
  if (LONG.every(f => wavs.includes(f))) cases.push({ id: 'LONG: 4 meetings stitched', files: LONG.map(f => path.join(SRC, f)) });
  // Everything stitched (~3.3 h): checks time and size near the 200k-char cap.
  if (wavs.length >= 6) cases.push({ id: `LONGEST: ${wavs.length} meetings stitched`, files: wavs.map(f => path.join(SRC, f)) });
  const only = process.argv[3]?.split(',');
  const run = only ? cases.filter(c => only.some(o => c.id.startsWith(o))) : cases;

  const rows: Record<string, unknown>[] = [];
  for (const c of run) {
    const opus = path.join(tmp, `${randomUUID()}.webm`);
    toOpus(c.files, opus);
    const minutes = durationOf(opus) / 60;
    const mb = statSync(opus).size / 1e6;
    const row: Record<string, unknown> = { case: c.id, minutes: +minutes.toFixed(1), opusMB: +mb.toFixed(1), withinBucket50MB: mb <= 50 };
    console.log(`\n▶ ${c.id}: ${row.minutes} min, ${row.opusMB} MB`);
    try {
      // Transcripts are cached (public AMI data), so re-running the writer doesn't pay Deepgram again.
      const cacheFile = path.join(CACHE, `${c.id.replace(/[^\w-]+/g, '_')}.json`);
      let transcript: string | null, seconds: number, sttS: number;
      if (existsSync(cacheFile)) {
        ({ transcript, seconds, sttS } = JSON.parse(readFileSync(cacheFile, 'utf8')));
        row.cachedTranscript = true;
      } else {
        const storagePath = `${userId}/${randomUUID()}.webm`;
        const up = await admin.storage.from('ws-audio').upload(storagePath, readFileSync(opus), { contentType: 'audio/webm' });
        if (up.error) throw new Error(`upload: ${up.error.message}`);
        const t0 = Date.now();
        ({ transcript, seconds } = await polishTranscript(admin, [{ track: 'room', path: storagePath }], 'general', 'Me'));
        sttS = (Date.now() - t0) / 1000;
        if (transcript) writeFileSync(cacheFile, JSON.stringify({ transcript, seconds, sttS }));
      }
      const text = transcript ?? '';
      row.transcribeS = +sttS.toFixed(0);
      row.deepgramMin = +(seconds / 60).toFixed(1);
      row.transcriptChars = text.length;
      row.speakers = new Set(text.split('\n').map(l => l.split(':')[0])).size;
      row.withinInputCap = text.length <= MAX_INPUT_CHARS;
      if (!text) throw new Error('empty transcript');

      const t = Date.now();
      // Same budget as processNote: 250 s from the start, and the polish pass has used sttS of it.
      const deadline = t + 250_000 - sttS * 1000;
      const note = await generateNote({ input: text.slice(0, MAX_INPUT_CHARS), inputMode: 'recorded', noteType: 'meeting_minutes', field: 'general', userName: 'Me', date: '22 October 2026', dateISO: '2026-10-22T10:00:00+11:00', deadline });
      const genS = (Date.now() - t) / 1000;
      const noteText = noteToText(note);
      row.writeS = +genS.toFixed(0);
      row.totalS = +(sttS + genS).toFixed(0);
      row.withinFunctionLimit = sttS + genS < FUNCTION_LIMIT_S;

      // Cost estimate: polish (actual Deepgram minutes) + live stream for the same length + Claude (≈ chars/4 tokens).
      const dgUsd = (seconds / 60) * (DG_POLISH + DG_LIVE_ROOM);
      const aiUsd = ((Math.min(text.length, MAX_INPUT_CHARS) + 12_000) / 4) * IN_PER_M / 1e6 + (noteText.length / 4) * OUT_PER_M / 1e6;
      row.costAUD = +((dgUsd + aiUsd) * AUD).toFixed(2);
      row.costPerHourAUD = +(((dgUsd + aiUsd) * AUD) / (minutes / 60)).toFixed(2);

      // The writer shows a spoken weekday with its derived date in brackets ("Monday (26 Oct)"), worked out from the note date.
      const judgeOnce = () => judge('Write meeting minutes from a real meeting transcript (speech-to-text, may contain errors). The minutes were written on Thursday 22 October 2026 (the note date, given to the writer). The writer resolves a spoken weekday to a date from the note date and shows it in brackets, e.g. "Monday (26 Oct)": that is allowed and NOT invented when the bracketed date is the correct day after 22 Oct 2026. A year, or a date with no spoken day or date behind it, does count as invented', {
        faithfulness: 'Every fact, decision and action is supported by the transcript; nothing invented',
        coverage: 'The main topics, decisions and actions of the meeting are captured',
        usefulness: 'Someone who missed the meeting could act on these minutes',
      }, `TRANSCRIPT (complete):\n${text.slice(0, MAX_INPUT_CHARS)}\n\nMINUTES:\n${noteText}`);
      const j = await judgeOnce().catch(judgeOnce); // the judge occasionally returns broken JSON
      row.judge = j.scores; row.pass = j.pass; row.issues = j.issues.slice(0, 3);
      console.log(row);
    } catch (e) {
      row.error = (e as Error).message;
      console.log('  ERROR', row.error);
    }
    rows.push(row);
  }

  await cleanupEvalUsers();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const md = [
    `# Eval: real recordings (${stamp})`, '',
    'Real meetings from the AMI Meeting Corpus (University of Edinburgh, CC BY 4.0), run through the production polish pass + note writer.', '',
    '| Case | Min | Opus MB | Transcribe s | Write s | Total s | Transcript chars | Speakers | Cost A$ | A$/hour | Judge (faith/cov/use) | Pass |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => {
      const j = r.judge as Record<string, number> | undefined;
      return `| ${r.case} | ${r.minutes} | ${r.opusMB} | ${r.transcribeS ?? ''} | ${r.writeS ?? ''} | ${r.totalS ?? ''}${r.withinFunctionLimit === false ? ' ⚠' : ''} | ${r.transcriptChars ?? ''}${r.withinInputCap === false ? ' ⚠' : ''} | ${r.speakers ?? ''} | ${r.costAUD ?? ''} | ${r.costPerHourAUD ?? ''} | ${j ? `${j.faithfulness}/${j.coverage}/${j.usefulness}` : r.error ?? ''} | ${r.pass === undefined ? '' : r.pass ? '✓' : '✗'} |`;
    }),
    '', '⚠ = over a production limit (200k-char input cap or 300 s function limit).', '',
    '## Judge issues', '',
    ...rows.flatMap(r => (r.issues as string[] | undefined)?.length ? [`**${r.case}**`, ...(r.issues as string[]).map(i => `- ${i}`), ''] : []),
  ].join('\n');
  const out = path.join(REPORT_DIR, `real-audio-${stamp}`);
  writeFileSync(`${out}.md`, md);
  writeFileSync(`${out}.json`, JSON.stringify(rows, null, 1));
  console.log(`\nreport → ${out}.md`);
})().catch(e => { console.error(e); process.exit(1); });
