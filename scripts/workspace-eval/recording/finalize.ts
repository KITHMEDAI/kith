/** Publishes the recording report: npx tsx scripts/workspace-eval/recording/finalize.ts (after run.ts). */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { report } from '../harness';
import { FINDINGS } from './findings';
const out = path.join(__dirname, 'out');
const results = JSON.parse(readFileSync(path.join(out, 'results.json'), 'utf8'));
report('recording', results, FINDINGS + '\n' + readFileSync(path.join(out, 'metrics.md'), 'utf8'));
