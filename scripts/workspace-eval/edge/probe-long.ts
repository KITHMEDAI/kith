/**
 * Re-runs the 9k-word case once while capturing the raw model response, to see
 * WHY generateNote failed (truncation at max_tokens vs malformed JSON).
 *   npx tsx scripts/workspace-eval/edge/probe-long.ts
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { setup } from '../harness';
import { CASES } from './cases';

(async () => {
  await setup();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Anthropic = require('@anthropic-ai/sdk').default;
  const orig = Anthropic.Messages.prototype.create;
  let captured: any = null;
  Anthropic.Messages.prototype.create = async function (...args: any[]) {
    const res = await orig.apply(this, args);
    captured = res;
    return res;
  };
  const { generateNote } = await import('../../../lib/workspace/generate');
  const c = CASES.find(x => x.id === 'long_9k_words')!;
  const t0 = Date.now();
  let err = '';
  try { await generateNote({ input: c.input, inputMode: 'recorded', noteType: c.noteType!, field: c.field!, date: '21 October 2026' }); }
  catch (e) { err = (e as Error).message; }
  const raw = captured?.content?.find((x: any) => x.type === 'text')?.text ?? '';
  const info = { ms: Date.now() - t0, err, stop_reason: captured?.stop_reason, usage: captured?.usage, rawChars: raw.length, tail: raw.slice(-300) };
  writeFileSync(path.join(__dirname, 'out', 'probe-long.json'), JSON.stringify({ ...info, raw }, null, 1));
  console.log(info);
})().catch(e => { console.error(e); process.exit(1); });
