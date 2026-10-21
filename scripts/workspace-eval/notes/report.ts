/**
 * scripts/workspace-eval/notes/report.ts
 *
 * Builds the notes eval report from out/baseline.json (+ out/exp.json if the
 * experimental prompt was re-run) and the hand-written analysis in analysis.ts.
 *
 *   npx tsx scripts/workspace-eval/notes/report.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { report } from '../harness';
import type { NoteCaseResult } from './run';

const OUT = path.join(__dirname, 'out');
const load = (n: string): NoteCaseResult[] | null => existsSync(path.join(OUT, n)) ? JSON.parse(readFileSync(path.join(OUT, n), 'utf8')) : null;

const BUCKETS: [string, RegExp][] = [
  ['Duplicate content (section point repeats decision/action/follow-up)', /^\[det\] duplicate|repeat|redundan|restat|appears (both|in both|twice|again)|double/i],
  ['Off-template / padded headings', /unexpected heading|padding|heading/i],
  ['Owner or due date not grounded in input', /owner not grounded|due not grounded|owner without|assign(s|ed|ing)? .*owner|attribut/i],
  ['Invented / overstated facts', /invent|hallucinat|not (in|present in|stated in|supported by) the input|fabricat|overstat|presented as (fact|confirmed)|as if confirmed/i],
  ['Uncertainty lost (?/maybe/I think made definite)', /uncertain|tentative|\?|hedg|definite|confirmed/i],
  ['Date arithmetic / resolution', /\bdate\b|arithmetic|weekday|\bnext (mon|tue|wed|thu|fri)|resolved/i],
  ['Flag level / over- or under-flagging', /over-?flag|under-?flag|should be urgent|not urgent|level|trivia|missing flag|not flagged|no flag/i],
  ['Advice / diagnosis / causality language', /advice\/diagnosis|diagnos|causal|recommend/i],
  ['Wrong regulator / field framing', /NDIS Commission|SIRS|regulator|field|vocabulary|terminolog/i],
  ['Speaker attribution', /speaker/i],
  ['missing_info quality (too many / restating)', /missing_info|missing information/i],
];

function rate(rs: NoteCaseResult[], key: (r: NoteCaseResult) => string) {
  const m = new Map<string, { n: number; p: number; ms: number[] }>();
  for (const r of rs) { const k = key(r); const e = m.get(k) ?? { n: 0, p: 0, ms: [] }; e.n++; if (r.pass) e.p++; if (r.ms) e.ms.push(r.ms); m.set(k, e); }
  return Array.from(m.entries()).sort((a, b) => a[1].p / a[1].n - b[1].p / b[1].n)
    .map(([k, e]) => `| ${k} | ${e.p}/${e.n} | ${Math.round((100 * e.p) / e.n)}% | ${e.ms.length ? (e.ms.reduce((a, b) => a + b, 0) / e.ms.length / 1000).toFixed(1) : '-'}s |`).join('\n');
}
const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
function critAvg(rs: NoteCaseResult[]) {
  const keys = Array.from(new Set(rs.flatMap(r => Object.keys(r.scores ?? {}))));
  return keys.map(k => `${k} ${avg(rs.map(r => Number(r.scores?.[k])).filter(n => !isNaN(n))).toFixed(2)}`).join(' · ');
}

export function buildReport() {
  const base = load('baseline.json');
  if (!base) throw new Error('out/baseline.json missing - run run.ts first');
  const exp = load('exp.json');
  const expAll = load('exp-all.json');
  let analysis = '';
  try { analysis = require('./analysis').ANALYSIS as string; } catch { /* not written yet */ }

  const lat = base.map(r => r.ms).filter((x): x is number => !!x).sort((a, b) => a - b);
  const p = (q: number) => lat.length ? (lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] / 1000).toFixed(1) : '-';
  const detFail = base.filter(r => r.hardIssues.length).length;
  const judgeFail = base.filter(r => r.scores && Object.values(r.scores).some(v => Number(v) < 4)).length;

  const allIssues = base.flatMap(r => [...r.hardIssues.map(i => ({ id: r.id, t: `[det] ${i}` })), ...r.judgeIssues.map(i => ({ id: r.id, t: i }))]);
  const bucketRows = BUCKETS.map(([name, re]) => {
    const hits = allIssues.filter(i => re.test(i.t));
    return { name, n: hits.length, cases: new Set(hits.map(h => h.id)).size };
  }).sort((a, b) => b.cases - a.cases);

  const md: string[] = [];
  md.push('## Summary', '');
  md.push(`- **Baseline pass rate: ${base.filter(r => r.pass).length}/${base.length} (${Math.round(100 * base.filter(r => r.pass).length / base.length)}%)** — pass = every judge criterion ≥ 4 AND no hard deterministic failure.`);
  md.push(`- Judge-only pass (ignoring deterministic checks): ${base.length - judgeFail}/${base.length}. Cases with ≥1 hard deterministic failure: ${detFail}/${base.length}.`);
  md.push(`- Criterion averages: ${critAvg(base)}`);
  md.push(`- Latency (generateNote only, Sonnet 4.6, concurrency 3): avg ${(avg(lat) / 1000).toFixed(1)}s · p50 ${p(0.5)}s · p90 ${p(0.9)}s · max ${p(0.999)}s`);
  md.push(`- Judge: ${process.env.EVAL_JUDGE_MODEL || 'claude-sonnet-4-6'}; note date 21 Oct 2026 (Wed), author "Alex".`, '');
  if (exp) {
    const ids = new Set(exp.map(r => r.id));
    const baseSub = base.filter(r => ids.has(r.id));
    md.push('## Before / after (experimental prompt, `notes/exp-generate.ts`)', '');
    md.push(`Re-ran the ${exp.length} baseline failures against the experimental prompt (fixes below applied).`, '');
    md.push(`| | Baseline (same cases) | Experimental |\n|---|---|---|`);
    md.push(`| Pass | ${baseSub.filter(r => r.pass).length}/${baseSub.length} | ${exp.filter(r => r.pass).length}/${exp.length} |`);
    md.push(`| Cases with hard det. failures | ${baseSub.filter(r => r.hardIssues.length).length} | ${exp.filter(r => r.hardIssues.length).length} |`);
    md.push(`| Avg latency | ${(avg(baseSub.map(r => r.ms ?? 0)) / 1000).toFixed(1)}s | ${(avg(exp.map(r => r.ms ?? 0)) / 1000).toFixed(1)}s |`);
    const keys = Array.from(new Set(exp.flatMap(r => Object.keys(r.scores ?? {}))));
    for (const k of keys) md.push(`| ${k} | ${avg(baseSub.map(r => Number(r.scores?.[k])).filter(n => !isNaN(n))).toFixed(2)} | ${avg(exp.map(r => Number(r.scores?.[k])).filter(n => !isNaN(n))).toFixed(2)} |`);
    md.push('', 'Per case:', '', '| Case | Baseline | Exp | Remaining exp issues |\n|---|---|---|---|');
    for (const r of exp) {
      const b = base.find(x => x.id === r.id)!;
      const rem = [...r.hardIssues, ...(r.pass ? [] : r.judgeIssues)].slice(0, 2).map(s => s.replace(/\|/g, '/').slice(0, 140)).join('; ');
      md.push(`| ${r.id} | ${b.pass ? 'PASS' : 'FAIL'} | ${r.pass ? 'PASS' : 'FAIL'} | ${rem || '-'} |`);
    }
    md.push('');
  }
  if (expAll) {
    const ids = new Set(expAll.map(r => r.id));
    const baseSub = base.filter(r => ids.has(r.id));
    md.push(`Regression check — experimental prompt on ${expAll.length} baseline PASSES: ${expAll.filter(r => r.pass).length}/${expAll.length} still pass (baseline ${baseSub.filter(r => r.pass).length}/${baseSub.length}).`, '');
  }
  md.push('## Pass rate by field', '', '| Field | Pass | % | Avg latency |\n|---|---|---|---|', rate(base, r => r.field), '');
  md.push('## Pass rate by note type', '', '| Note type | Pass | % | Avg latency |\n|---|---|---|---|', rate(base, r => r.noteType), '');
  md.push('## Pass rate by input mode', '', '| Mode | Pass | % | Avg latency |\n|---|---|---|---|', rate(base, r => r.inputMode), '');
  md.push('## Issue buckets (keyword-classified, all baseline issues)', '', '| Bucket | Issues | Cases |\n|---|---|---|', ...bucketRows.map(b => `| ${b.name} | ${b.n} | ${b.cases} |`), '');
  md.push('## Lowest-scoring criteria per case', '', '| Case | Scores | Hard det. issues |\n|---|---|---|');
  for (const r of [...base].sort((a, b) => avg(Object.values(a.scores ?? {}).map(Number)) - avg(Object.values(b.scores ?? {}).map(Number))).slice(0, 25))
    md.push(`| ${r.id} | ${Object.entries(r.scores ?? {}).map(([k, v]) => `${k.slice(0, 5)} ${v}`).join(', ')} | ${r.hardIssues.length} |`);
  md.push('');
  if (analysis) md.push(analysis);
  return report('notes', base, md.join('\n'));
}

if (require.main === module) buildReport();
