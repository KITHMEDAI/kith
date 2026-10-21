/** Publishes the edge report: npx tsx scripts/workspace-eval/edge/finalize.ts (after run.ts). */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { report } from '../harness';
import { FINDINGS } from './findings';
const results = JSON.parse(readFileSync(path.join(__dirname, 'out', 'results.json'), 'utf8'));
report('edge', results, FINDINGS);
