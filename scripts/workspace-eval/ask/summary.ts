import { FINDINGS } from './findings';
/** Builds the extra markdown for the ask eval report (stats tables + before/after). */
import type { Question } from './questions';

type R = { id: string; category: string; pass: boolean; recall: number | null; ms?: number; semantic: boolean; refused: boolean; scores?: Record<string, number>; issues: string[]; output?: any };

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '-');
const quant = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function buildMarkdown(results: { main: R[]; proto: R[]; v3?: R[] }, cache: any, questions: Question[]) {
  const m = results.main;
  const cats = Array.from(new Set(questions.map(q => q.category)));
  const lines: string[] = [FINDINGS, '', '## Pass rate by category (v1 = current lib/workspace/ask.ts)', '', '| Category | Pass | Avg recall | Proto v2 pass (subset) |', '|---|---|---|---|'];
  for (const c of cats) {
    const rs = m.filter(r => r.category === c);
    const rec = rs.map(r => r.recall).filter((x): x is number => x !== null);
    const pr = results.proto.filter(r => r.category === c);
    lines.push(`| ${c} | ${rs.filter(r => r.pass).length}/${rs.length} (${pct(rs.filter(r => r.pass).length, rs.length)}) | ${rec.length ? mean(rec).toFixed(2) : 'n/a'} | ${pr.length ? `${pr.filter(r => r.pass).length}/${pr.length}` : '-'} |`);
  }
  const rec = m.map(r => r.recall).filter((x): x is number => x !== null);
  const ms = m.map(r => r.ms ?? 0);
  lines.push('', `**Overall v1: ${m.filter(r => r.pass).length}/${m.length}.** Retrieval recall (answerable Qs, expected source notes in the 8 retrieved): mean ${mean(rec).toFixed(2)}, full recall on ${rec.filter(x => x === 1).length}/${rec.length}.`);
  lines.push(`Semantic path used on ${m.filter(r => r.semantic).length}/${m.length} questions (queries were paced 21s apart because the Voyage key is capped at 3 req/min).`);
  lines.push(`Latency (askOnce end-to-end, non-streaming): p50 ${(quant(ms, 0.5) / 1000).toFixed(1)}s, p95 ${(quant(ms, 0.95) / 1000).toFixed(1)}s, max ${(Math.max(...ms) / 1000).toFixed(1)}s.`);
  const crit = ['groundedness', 'correctness', 'citation_accuracy', 'refusal_correctness'];
  lines.push('', '| Criterion | v1 avg | v2 avg (subset) | v1 avg on same subset |', '|---|---|---|---|');
  const subset = new Set(results.proto.map(r => r.id));
  for (const k of crit) {
    const a = (rs: R[]) => mean(rs.map(r => r.scores?.[k]).filter((x): x is number => typeof x === 'number')).toFixed(2);
    lines.push(`| ${k} | ${a(m)} | ${results.proto.length ? a(results.proto) : '-'} | ${a(m.filter(r => subset.has(r.id)))} |`);
  }
  if (cache.kwsim) {
    const ks = cache.kwsim as { id: string; v1Path: string; v1Recall: number; v2Recall: number }[];
    lines.push('', '## Degraded mode: retrieval when Voyage is rate-limited (zero-cost simulation)', '',
      `When the query embedding times out (4s) — which is what happens for any 4th+ question in a minute on this Voyage key — v1 falls back to \`ws_keyword_notes(question)\`. That uses \`websearch_to_tsquery\`, which ANDs every word of the question, so it matched anything on only ${ks.filter(k => k.v1Path === 'keyword').length}/${ks.length} questions; the rest fell through to "6 most recent notes".`,
      '', `| | v1 keyword fallback | v2 OR-keyword (proto) |`, '|---|---|---|',
      `| mean recall | ${mean(ks.map(k => k.v1Recall)).toFixed(2)} | ${mean(ks.map(k => k.v2Recall)).toFixed(2)} |`,
      `| full recall | ${ks.filter(k => k.v1Recall === 1).length}/${ks.length} | ${ks.filter(k => k.v2Recall === 1).length}/${ks.length} |`);
  }
  if (results.proto.length) {
    lines.push('', '## Prototype v2 before/after (same questions)', '', '| Question | v1 | v2 |', '|---|---|---|');
    for (const p of results.proto) { const v1 = m.find(r => r.id === p.id); lines.push(`| ${p.id} | ${v1?.pass ? 'pass' : 'FAIL'} | ${p.pass ? 'pass' : 'FAIL'} |`); }
  }
  if (results.v3?.length) {
    lines.push('', '## Prototype v3 (v2 + send all notes when the corpus is small + 3 extra rules) on every v1/v2 failure', '', '| Question | v1 | v2 | v3 | v3 issues |', '|---|---|---|---|---|');
    for (const p of results.v3) {
      const v1 = m.find(r => r.id === p.id); const v2 = results.proto.find(r => r.id === p.id);
      lines.push(`| ${p.id} | ${v1?.pass ? 'pass' : 'FAIL'} | ${v2 ? (v2.pass ? 'pass' : 'FAIL') : '-'} | ${p.pass ? 'pass' : 'FAIL'} | ${p.issues.slice(0, 2).join('; ').replace(/\|/g, '/').slice(0, 300)} |`);
    }
    lines.push('', `v3 latency: p50 ${(quant(results.v3.map(r => r.ms ?? 0), 0.5) / 1000).toFixed(1)}s, max ${(Math.max(...results.v3.map(r => r.ms ?? 0)) / 1000).toFixed(1)}s (11 notes in context).`);
  }
  lines.push('', '## All v1 answers (failures first)', '');
  for (const r of [...m].sort((a, b) => Number(a.pass) - Number(b.pass))) {
    const o = r.output;
    lines.push(`<details><summary>${r.pass ? 'PASS' : 'FAIL'} ${r.id} (${r.category}) — ${o.q}</summary>`, '',
      `Expected: ${o.expect}`, '', `Retrieved: ${o.retrieved.join(', ')} | cited: ${o.cited.join(', ') || '-'} | expected: ${o.expectedSources.join(', ') || '-'} | recall ${r.recall ?? 'n/a'} | ${((r.ms ?? 0) / 1000).toFixed(1)}s | semantic=${r.semantic}`, '',
      '```', o.answer, '```', '', r.issues.map(i => `- ${i}`).join('\n'), '', '</details>', '');
  }
  return lines.join('\n');
}
