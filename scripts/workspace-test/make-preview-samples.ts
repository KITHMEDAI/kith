// Writes real AI-generated sample notes for the dev-only /preview page.
// Run: npx tsx --env-file=.env.local scripts/workspace-test/make-preview-samples.ts
import { writeFileSync } from 'node:fs';
import { generateNote } from '../../lib/workspace/generate';

const inputs = [
  { noteType: 'construction_site_inspection', field: 'construction', inputMode: 'typed' as const,
    input: `walked lvl 3 w/ Sarah (Apex Concrete). slab pour zone B pushed to thurs bc rain, she to confirm pump booking by tmrw 10am. east stair handrail missing lvl 2 landing, temp barricade up, told Dave (foreman) to fix. formwork zone C good. 2 pallets of blocks blocking fire exit corridor lvl1 - labourers to move today. elec rough-in 80% lvl 3.` },
  { noteType: 'meeting_minutes', field: 'general', inputMode: 'recorded' as const,
    input: `Speaker A: Quick one, Priya, Tom and me. Website launch, Tom?\nSpeaker B: Design done, dev needs a week. Launch the 4th not the 28th.\nSpeaker A: Lock the 4th. Priya, tell the client?\nSpeaker C: I'll email today. Budget's tight, pause Google ads till launch?\nSpeaker A: Agreed, pause it.` },
];
(async () => {
  const out = [];
  for (const i of inputs) out.push({ ...i, content: await generateNote({ ...i, date: '21 October 2026', userName: 'Anurag' }) });
  writeFileSync('scripts/workspace-test/preview-samples.json', JSON.stringify(out, null, 2));
  console.log('ok', out.map(o => o.content.title));
})();
