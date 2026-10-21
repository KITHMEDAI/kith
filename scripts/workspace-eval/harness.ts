/**
 * scripts/workspace-eval/harness.ts
 *
 * Shared test harness for Kith Workspace quality evals. Every eval area
 * (notes, ask, recording/edge cases) uses these helpers so results are graded
 * and reported the same way.
 *
 * IMPORTANT: call `await setup()` BEFORE dynamically importing any app module
 * (lib/workspace/*, lib/supabase/*) — those read env vars at import time.
 *
 *   import { setup, judge, report } from '../harness';
 *   await setup();
 *   const { generateNote } = await import('../../../lib/workspace/generate');
 *
 * Run any eval with:  npx tsx scripts/workspace-eval/<area>/run.ts
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..');
export const REPORT_DIR = path.join(ROOT, 'docs', 'product', 'eval-reports');

function parseEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map(m => [m![1], m![2].replace(/^['"]|['"]$/g, '')]));
}

/** Loads AI keys from .env.local, then the SYDNEY workspace DB keys over them. */
export async function setup() {
  const local = parseEnv(path.join(ROOT, '.env.local'));
  const ws = parseEnv(path.join(ROOT, '.env.workspace'));
  const gen = parseEnv(path.join(ROOT, '.env.workspace.generated'));
  if (!ws.NEXT_PUBLIC_SUPABASE_URL) throw new Error('.env.workspace missing — evals must never touch the kith.space DB');
  if (ws.NEXT_PUBLIC_SUPABASE_URL === local.NEXT_PUBLIC_SUPABASE_URL) throw new Error('workspace DB == prod DB, refusing');
  Object.assign(process.env, local, ws, gen, { NEXT_PUBLIC_EDITION: 'workspace', NEXT_PUBLIC_USE_MOCK: 'false' });
}

/** Service-role client for the Sydney workspace DB (tests only). */
export async function adminClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/** Creates (or reuses) an eval user with an onboarded profile. Emails end in @eval.kith.space. */
export async function evalUser(slug: string, field = 'general', fieldCustom: string | null = null) {
  const admin = await adminClient();
  const email = `${slug}@eval.kith.space`;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list?.users.find(u => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: `Eval-${Math.random().toString(36).slice(2)}A1!`, email_confirm: true });
    if (error) throw error;
    user = data.user!;
  }
  await admin.from('ws_profiles').upsert({ user_id: user.id, name: `Eval ${slug}`, email, field, field_custom: fieldCustom });
  return { userId: user.id, email, admin };
}

/** Deletes every @eval.kith.space user (and, via cascade, their notes). */
export async function cleanupEvalUsers() {
  const admin = await adminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email?.endsWith('@eval.kith.space')) await admin.auth.admin.deleteUser(u.id);
}

export interface JudgeResult { scores: Record<string, number>; pass: boolean; issues: string[]; notes?: string }

const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || 'claude-sonnet-4-6';

/**
 * LLM-as-judge. `criteria` maps criterion → description; each is scored 1–5.
 * pass = every score ≥ passMark. Judge is told to be strict and cite concrete issues.
 */
export async function judge(task: string, criteria: Record<string, string>, payload: string, passMark = 4): Promise<JudgeResult> {
  const { anthropic } = await import('../../lib/claude');
  const client = anthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY missing');
  const res = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1200,
    system: `You are a strict QA evaluator for an AI note-taking product used by professionals. Grade harshly: a single invented fact is a hallucination and caps faithfulness at 2. Return ONLY JSON.`,
    messages: [{
      role: 'user',
      content: `TASK UNDER TEST: ${task}

CRITERIA (score each 1-5, 5 = flawless):
${Object.entries(criteria).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

MATERIAL:
${payload}

Return JSON: {"scores": {${Object.keys(criteria).map(k => `"${k}": n`).join(', ')}}, "issues": ["concrete problem, quoting the output"], "notes": "one line"}`,
    }],
  });
  const raw = res.content.find((c: { type: string }) => c.type === 'text')?.text ?? '{}';
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const scores = json.scores ?? {};
  return { scores, issues: json.issues ?? [], notes: json.notes, pass: Object.values(scores).every((s) => Number(s) >= passMark) };
}

/** Runs async tasks with limited concurrency (keeps API rate limits happy). */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

export interface CaseResult { id: string; area: string; pass: boolean; scores?: Record<string, number>; issues: string[]; ms?: number; output?: unknown }

/** Writes <area>-<stamp>.json (full) and .md (summary) to docs/product/eval-reports/. */
export function report(area: string, results: CaseResult[], extraMarkdown = '') {
  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const base = path.join(REPORT_DIR, `${area}-${stamp}`);
  writeFileSync(`${base}.json`, JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.pass).length;
  const critKeys = Array.from(new Set(results.flatMap(r => Object.keys(r.scores ?? {}))));
  const avg = (k: string) => {
    const v = results.map(r => r.scores?.[k]).filter((x): x is number => typeof x === 'number');
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
  };
  const md = [
    `# Eval: ${area} (${stamp})`, '',
    `**${passed}/${results.length} passed**`, '',
    critKeys.length ? `| Criterion | Avg (1-5) |\n|---|---|\n${critKeys.map(k => `| ${k} | ${avg(k)} |`).join('\n')}` : '', '',
    '## Failures', '',
    ...results.filter(r => !r.pass).map(r => `### ${r.id}\n${r.issues.map(i => `- ${i}`).join('\n') || '- (no detail)'}\n`),
    extraMarkdown,
  ].join('\n');
  writeFileSync(`${base}.md`, md);
  console.log(`\n${area}: ${passed}/${results.length} passed → ${path.relative(ROOT, base)}.md`);
  return `${base}.md`;
}
