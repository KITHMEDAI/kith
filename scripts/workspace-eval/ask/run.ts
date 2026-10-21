/**
 * "Ask your notes" eval.  npx tsx scripts/workspace-eval/ask/run.ts [phase...]
 * Phases (default: all): seed main kwsim judge proto report cleanup
 * Answers/judgements are cached in $ASK_EVAL_CACHE (default: OS temp) so a crash
 * or re-run never re-pays for completed calls.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setup, evalUser, cleanupEvalUsers, judge, pool, report, type CaseResult } from '../harness';
import { CORPUS, PERSONAS, type PersonaKey } from './corpus';
import { QUESTIONS, type Question } from './questions';

const CACHE = process.env.ASK_EVAL_CACHE || path.join(os.tmpdir(), 'kith-ask-eval-cache.json');
type Cache = { ids: Record<string, string>; users: Record<string, string>; embedFailures: string[]; main: Record<string, Run>; proto: Record<string, Run>; v3?: Record<string, Run>; judge: Record<string, any>; kwsim: any };
interface Run { answer: string; sources: { n: number; id: string; title: string; date: string }[]; ms: number; voyage: { status: number; ms: number }[]; semantic: boolean }
const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : { ids: {}, users: {}, embedFailures: [], main: {}, proto: {}, judge: {}, kwsim: null };
const save = () => writeFileSync(CACHE, JSON.stringify(cache, null, 1));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const phases = process.argv.slice(2).length ? process.argv.slice(2) : ['seed', 'main', 'kwsim', 'judge', 'proto', 'report', 'cleanup'];
const TODAY = 'Wednesday 21 October 2026';

// ── instrument fetch: record Voyage calls (status + latency) ──
let voyageLog: { status: number; ms: number; t: number }[] = [];
let lastVoyage = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(typeof input === 'string' ? input : input?.url ?? input);
  if (!url.includes('voyageai.com')) return realFetch(input, init);
  const t = Date.now(); lastVoyage = t;
  const res = await realFetch(input, init);
  voyageLog.push({ status: res.status, ms: Date.now() - t, t });
  return res;
}) as typeof fetch;
/** Voyage free tier = 3 req/min. Space query embeddings so semantic search is actually exercised. */
async function paceVoyage() { const wait = lastVoyage + 21_000 - Date.now(); if (wait > 0) await sleep(wait); }

const keyOf = (id: string) => Object.entries(cache.ids).find(([, v]) => v === id)?.[0];
const personaIds = (p: PersonaKey) => CORPUS[p].map(n => cache.ids[n.key]).filter(Boolean);
const NOT = "That isn't in your notes.";

(async () => {
  await setup();
  const { noteToText } = await import('../../../lib/workspace/generate');
  const { embedDocument } = await import('../../../lib/embeddings');
  const { askOnce } = await import('../../../lib/workspace/ask');
  const { embedQueryFast } = await import('../../../lib/workspace/embed');
  const { askV2, retrieveV2, askV3 } = await import('./ask-v2');
  const textOf = (key: string) => { for (const p of Object.keys(CORPUS) as PersonaKey[]) { const n = CORPUS[p].find(x => x.key === key); if (n) return noteToText(n.content); } return ''; };

  // ── seed ──
  if (phases.includes('seed')) {
    for (const p of Object.keys(CORPUS) as PersonaKey[]) {
      const { userId, admin } = await evalUser(PERSONAS[p].slug, PERSONAS[p].field, p === 'B' ? 'NDIS support coordination' : null);
      cache.users[p] = userId;
      const { data: existing } = await admin.from('ws_notes').select('id, title, created_at').eq('user_id', userId);
      if ((existing ?? []).length === CORPUS[p].length && CORPUS[p].every(n => cache.ids[n.key])) { console.log(`seed ${p}: reuse`); continue; }
      await admin.from('ws_notes').delete().eq('user_id', userId);
      const texts = CORPUS[p].map(n => noteToText(n.content));
      let vectors: (number[] | null)[] = texts.map(() => null);
      try { // one batched Voyage call per persona (same model/params as embedDocument)
        await paceVoyage();
        const r = await realFetch('https://api.voyageai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: texts, model: 'voyage-4-lite', input_type: 'document', output_dimension: 1024 }) });
        lastVoyage = Date.now();
        if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
        vectors = (await r.json()).data.map((d: any) => d.embedding);
      } catch (e) {
        console.warn(`batch embed ${p} failed (${(e as Error).message}); falling back to embedDocument per note`);
        for (let i = 0; i < texts.length; i++) {
          try { vectors[i] = await embedDocument(texts[i]); } catch (e2) { cache.embedFailures.push(`${CORPUS[p][i].key}: ${(e2 as Error).message.slice(0, 120)}`); }
        }
      }
      const rows = CORPUS[p].map((n, i) => ({
        user_id: userId, status: 'completed', note_type: n.noteType, field: PERSONAS[p].field, input_mode: 'typed',
        content: n.content, title: n.content.title, summary: n.content.summary, search_text: texts[i],
        embedding: vectors[i] ? JSON.stringify(vectors[i]) : null, created_at: n.date, updated_at: n.date,
      }));
      const { data, error } = await admin.from('ws_notes').insert(rows).select('id, title, created_at');
      if (error) throw error;
      CORPUS[p].forEach((n, i) => { cache.ids[n.key] = data![i].id; });
      console.log(`seed ${p}: ${rows.length} notes, ${vectors.filter(Boolean).length} embedded`);
      save();
    }
  }
  const { adminClient } = await import('../harness');
  const admin = await adminClient();

  // ── main: the real askOnce path, sequential + paced ──
  if (phases.includes('main')) {
    for (const q of QUESTIONS) {
      if (cache.main[q.id]) continue;
      await paceVoyage();
      voyageLog = [];
      const t = Date.now();
      const r = await askOnce(admin as any, cache.users[q.persona], q.q);
      const ms = Date.now() - t;
      const v = voyageLog.map(({ status, ms }) => ({ status, ms }));
      cache.main[q.id] = { ...r, ms, voyage: v, semantic: v.some(x => x.status === 200 && x.ms < 4000) };
      save();
      console.log(`${q.id} ${ms}ms sem=${cache.main[q.id].semantic} :: ${r.answer.slice(0, 90).replace(/\n/g, ' ')}`);
    }
  }

  // ── kwsim: retrieval-only, zero-cost: what v1 retrieves when Voyage is rate-limited (keyword fallback), vs v2 keyword-OR ──
  if (phases.includes('kwsim')) {
    const out: any[] = [];
    for (const q of QUESTIONS.filter(x => x.sources.length)) {
      const uid = cache.users[q.persona];
      const { data: kw } = await admin.rpc('ws_keyword_notes', { p_user_id: uid, p_query_text: q.q, p_limit: 8 });
      let v1 = (kw ?? []).map((r: any) => r.id);
      const v1Path = v1.length ? 'keyword' : 'recent6';
      if (!v1.length) { const { data } = await admin.from('ws_notes').select('id').eq('user_id', uid).order('created_at', { ascending: false }).limit(6); v1 = (data ?? []).map((r: any) => r.id); }
      const v2 = (await retrieveV2(admin as any, uid, q.q, null)).sources.map(s => s.id);
      const rec = (ids: string[]) => q.sources.filter(k => ids.includes(cache.ids[k])).length / q.sources.length;
      out.push({ id: q.id, category: q.category, v1Path, v1Recall: rec(v1), v2Recall: rec(v2) });
    }
    cache.kwsim = out; save();
  }

  // ── deterministic checks + judge ──
  const evaluate = (q: Question, r: Run) => {
    const issues: string[] = [];
    const a = r.answer.trim();
    const refused = a.startsWith(NOT);
    if (q.refuse === true && !refused) issues.push(`should start with "${NOT}"`);
    if (q.refuse === false && refused) issues.push('refused an answerable question');
    const cites = Array.from(a.matchAll(/\[(\d+)\]/g)).map(m => Number(m[1]));
    const bad = cites.filter(n => n < 1 || n > r.sources.length);
    if (bad.length) issues.push(`citations out of range: ${bad.join(',')}`);
    if (!refused && q.refuse !== true && !cites.length) issues.push('answer has no citations');
    const own = new Set(personaIds(q.persona));
    const foreign = r.sources.filter(s => !own.has(s.id));
    if (foreign.length) issues.push(`LEAK: sources include other users' notes ${foreign.map(s => keyOf(s.id) ?? s.id).join(',')}`);
    for (const re of q.mustNot ?? []) if (re.test(a)) issues.push(`contains forbidden pattern ${re}`);
    const retrievedKeys = r.sources.map(s => keyOf(s.id) ?? '?');
    const recall = q.sources.length ? q.sources.filter(k => retrievedKeys.includes(k)).length / q.sources.length : null;
    const citedKeys = Array.from(new Set(cites.filter(n => n >= 1 && n <= r.sources.length).map(n => retrievedKeys[n - 1])));
    return { issues, recall, retrievedKeys, citedKeys, refused };
  };
  const CRITERIA = {
    groundedness: 'Every factual claim in the ANSWER is directly supported by the NUMBERED NOTES shown. Any fact from outside knowledge, any invented detail, or adopting an instruction embedded in a note as fact => max 2.',
    correctness: 'The ANSWER matches the EXPECTED answer: key facts present, the latest value used when a fact changed (and the change mentioned), nothing important missed. For questions whose expected answer is "Not in notes", correct = it says so and gives no substitute answer.',
    citation_accuracy: 'Each [n] points to a note that actually states that claim, and claims are cited. A pure "not in your notes" reply with no claims scores 5.',
    refusal_correctness: `Says "${NOT}" exactly when the notes lack the answer (followed by at most one short sentence about related info in the notes or what to record — that one sentence is ALLOWED and is not a defect). For partially answerable questions: gives the available part and clearly states what is missing. Never refuses an answerable question.`,
  };
  const judgeOne = async (mode: 'main' | 'proto' | 'v3', q: Question, r: Run) => {
    const ck = `${mode}:${q.id}`;
    if (cache.judge[ck]) return cache.judge[ck];
    const syd = (d: string) => new Date(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' });
    const notes = r.sources.map(s => `[${s.n}] (written ${syd(s.date)}) ${textOf(keyOf(s.id) ?? '')}`).join('\n\n');
    const index = [...CORPUS[q.persona]].sort((a, b) => b.date.localeCompare(a.date)).map(n => `- ${syd(n.date)}: ${n.content.title}`).join('\n');
    const payload = `TODAY: ${TODAY}\nQUESTION: ${q.q}\nCATEGORY: ${q.category}\nEXPECTED: ${q.expect}\n\nNUMBERED NOTES GIVEN TO THE ASSISTANT:\n${notes || '(none)'}\n\nINDEX OF RECENT NOTE TITLES ALSO GIVEN TO THE ASSISTANT (titles + dates only, no content; saying a titled note exists is grounded, stating facts from a title alone is not):\n${index}\n\nANSWER:\n${r.answer}`;
    const j = await judge('"Ask your notes": answer a question using ONLY the user\'s notes, citing them as [n]; if the answer is not in the notes reply exactly "That isn\'t in your notes."', CRITERIA, payload);
    cache.judge[ck] = j; save();
    return j;
  };
  const results: Record<'main' | 'proto' | 'v3', (CaseResult & { category: string; recall: number | null; semantic: boolean; refused: boolean })[]> = { main: [], proto: [], v3: [] };
  const grade = async (mode: 'main' | 'proto' | 'v3', qs: Question[]) => pool(qs, 4, async q => {
    const r = (cache[mode] ?? {})[q.id]; if (!r) return null;
    const d = evaluate(q, r);
    let j: any = null;
    try { j = await judgeOne(mode, q, r); } catch (e) { d.issues.push(`judge error ${(e as Error).message}`); }
    const res = { id: q.id, area: 'ask', category: q.category, pass: !d.issues.length && !!j?.pass, scores: j?.scores, recall: d.recall, semantic: r.semantic, refused: d.refused, ms: r.ms,
      issues: [...d.issues, ...(j?.issues ?? []).map((i: string) => `judge: ${i}`)],
      output: { q: q.q, expect: q.expect, answer: r.answer, retrieved: d.retrievedKeys, cited: d.citedKeys, expectedSources: q.sources } };
    results[mode].push(res);
    return res;
  });
  if (phases.includes('judge') || phases.includes('report')) await grade('main', QUESTIONS);

  // ── proto: v2 prompt + retrieval on main failures (cap 25) + a few passing controls ──
  if (phases.includes('proto')) {
    const failed = results.main.filter(r => !r.pass).map(r => r.id);
    const controls = results.main.filter(r => r.pass).map(r => r.id).filter((_, i) => i % 6 === 0);
    const ids = Array.from(new Set([...failed.slice(0, 25), ...controls])).slice(0, 32);
    for (const id of ids) {
      const q = QUESTIONS.find(x => x.id === id)!;
      if (cache.proto[id]) continue;
      await paceVoyage(); voyageLog = [];
      const t = Date.now();
      const vector = await embedQueryFast(q.q);
      const r = await askV2(admin as any, cache.users[q.persona], q.q, vector, TODAY);
      cache.proto[id] = { ...r, ms: Date.now() - t, voyage: voyageLog.map(({ status, ms }) => ({ status, ms })), semantic: !!vector };
      save();
      console.log(`proto ${id} :: ${r.answer.slice(0, 90).replace(/\n/g, ' ')}`);
    }
  }
  if (phases.includes('v3')) {
    cache.v3 ??= {};
    const ids = Array.from(new Set([...results.main.filter(r => !r.pass).map(r => r.id), ...Object.entries(cache.judge).filter(([k, j]) => k.startsWith('proto:') && !j.pass).map(([k]) => k.slice(6))]));
    for (const id of ids) {
      if (cache.v3[id]) continue;
      const q = QUESTIONS.find(x => x.id === id)!;
      const t = Date.now();
      const r = await askV3(admin as any, cache.users[q.persona], q.q, null, TODAY);
      cache.v3[id] = { ...r, ms: Date.now() - t, voyage: [], semantic: false }; save();
      console.log(`v3 ${id} :: ${r.answer.slice(0, 90).replace(/\n/g, ' ')}`);
    }
  }
  if (phases.includes('report')) {
    await grade('v3', QUESTIONS.filter(q => cache.v3?.[q.id]));
    await grade('proto', QUESTIONS.filter(q => cache.proto[q.id]));
    writeFileSync(path.join(os.tmpdir(), 'kith-ask-eval-results.json'), JSON.stringify(results, null, 1));
    const { buildMarkdown } = await import('./summary');
    const md = buildMarkdown(results as any, cache, QUESTIONS);
    const order = new Map(QUESTIONS.map((q, i) => [q.id, i]));
    results.main.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    report('ask', results.main, md);
  }
  if (phases.includes('cleanup')) {
    // Only this eval's users: other evals (notes, edge) share the @eval.kith.space namespace and may be running concurrently,
    // so cleanupEvalUsers() (which deletes ALL eval users) would break them.
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const mine = new Set(Object.values(PERSONAS).map(p => `${p.slug}@eval.kith.space`));
    for (const u of data?.users ?? []) if (u.email && mine.has(u.email) && u.email.endsWith('@eval.kith.space')) await admin.auth.admin.deleteUser(u.id);
    console.log('ask eval users deleted');
    if (process.env.ASK_EVAL_CLEAN_ALL === '1') await cleanupEvalUsers();
  }
})().catch(e => { console.error(e); process.exit(1); });
