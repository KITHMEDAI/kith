// Quality check for the Workspace note engine across fields (no DB needed).
// Run: npx tsx --env-file=.env.local scripts/workspace-test/gen-samples.ts
import { generateNote, generateFieldProfile, noteToText } from '../../lib/workspace/generate';

const samples = [
  { field: 'construction', noteType: 'construction_site_inspection', inputMode: 'typed' as const,
    input: `walked lvl 3 w/ Sarah (Apex Concrete). slab pour for zone B pushed to thurs bc rain forecast, she to confirm pump booking by tmrw 10am. east stair handrail missing on lvl 2 landing, temp barricade up but needs proper fix - told Dave (site foreman). formwork zone C looks good. 2 pallets of blocks left blocking fire exit corridor lvl1 - asked labourers to move today. elec rough-in 80% lvl 3.` },
  { field: 'pharma', noteType: 'pharma_hcp_call', inputMode: 'recorded' as const,
    input: `Speaker A: Thanks for seeing me Dr Nguyen, wanted to follow up on Cardiolex since our last visit.
Speaker B: Sure. I've started about six patients on it. Mostly fine, but one lady, Mrs T, in her seventies, came back saying she got really dizzy and had a fall at home about a week after starting.
Speaker A: Oh, I'm sorry to hear that. Is she okay?
Speaker B: Bruised, she's fine. I've stopped it for now. Also, can it be used in patients with moderate kidney impairment? I've got a few of those.
Speaker A: Let me get our medical information team to send you the renal dosing data. I'll leave the updated patient leaflet as well.
Speaker B: Great, and can you come back in a month?
Speaker A: Absolutely, I'll book in for mid November.` },
  { field: 'ndis', noteType: 'ndis_progress_note', inputMode: 'typed' as const,
    input: `took J to shops, had lunch at cafe, J paid himself (working on money skills goal). J was a bit agitated in arvo after phone call w/ brother, gave PRN, settled after 30 min. watched TV. dinner good, ate all.` },
  { field: 'general', noteType: 'meeting_minutes', inputMode: 'recorded' as const,
    input: `Speaker A: Okay let's start. Quick one today, just Priya, Tom and me. First thing, the website launch. Tom where are we?
Speaker B: Design's done, dev needs another week. So launch the 4th not the 28th.
Speaker A: Fine, let's lock the 4th. Priya can you tell the client?
Speaker C: Yep, I'll email them today. Second thing, budget's tight for ads, I think we pause the Google campaign till launch.
Speaker A: Agreed, pause it. Anything else? No? Great, thanks.` },
];

(async () => {
  const profile = await generateFieldProfile('Wedding planner');
  console.log('=== FIELD PROFILE (Wedding planner) ===\n' + profile + '\n');
  const custom = await generateNote({ input: 'call w/ Emma & Josh, venue Yarra Glen confirmed 14 Mar, 120 guests, budget 45k, worried about rain - want marquee quote, Josh allergic to shellfish tell caterer, need florist shortlist by fri', inputMode: 'typed', noteType: 'client_call', field: 'other', fieldCustom: 'Wedding planner', fieldProfile: profile, date: '21 October 2026' });
  console.log('=== CUSTOM FIELD: Wedding planner / client call ===\n' + noteToText(custom) + '\n');
  for (const s of samples) {
    const t0 = Date.now();
    const c = await generateNote({ ...s, date: '21 October 2026', userName: 'Anurag' });
    console.log(`=== ${s.field} / ${s.noteType} (${((Date.now() - t0) / 1000).toFixed(1)}s) ===\n${noteToText(c)}\n`);
  }
})().catch(e => { console.error(e); process.exit(1); });
