// Seeds realistic notes into an EXISTING Kith Workspace account (the user must
// have signed up and finished onboarding first), so "Ask your notes" and
// search have something to work with in a demo.
// Run: npx tsx --env-file=.env.local scripts/workspace-test/seed-demo.ts you@example.com
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { generateNote, noteToText } from '../../lib/workspace/generate';
import { embedDocument } from '../../lib/embeddings';
import { seal } from '../../lib/workspace/crypto';
import { sealNote } from '../../lib/workspace/note-fields';

// .env.workspace.generated holds the workspace ENCRYPTION_SECRET: notes are
// stored encrypted exactly as the app stores them.
const ws = Object.fromEntries(['.env.workspace', '.env.workspace.generated'].map(f => (existsSync(f) ? readFileSync(f, 'utf8') : '')).join('\n')
  .split(/\r?\n/).map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m![1], m![2].replace(/^['"]|['"]$/g, '')])) as Record<string, string>;

const DEMO = [
  { daysAgo: 6, noteType: 'construction_site_inspection', input: `walked lvl 3 w/ Sarah (Apex Concrete). slab pour zone B pushed to thurs bc rain, she to confirm pump booking by tmrw 10am. east stair handrail missing lvl 2 landing, temp barricade up, told Dave (foreman) to fix. 2 pallets of blocks blocking fire exit corridor lvl1 - labourers to move today. elec rough-in 80% lvl 3.` },
  { daysAgo: 5, noteType: 'construction_toolbox', input: `toolbox talk 7am, topic working at heights + the lvl 2 handrail issue. attendees: Dave, Mick, Raj, Tommo, 2 x Apex guys. reminded harness inspection before use, no one on edge without guardrail or harness. Raj asked about the scissor lift being out of service - hire co coming Friday. Mick raised poor lighting stairwell B.` },
  { daysAgo: 4, noteType: 'client_call', input: `call w/ Megan (client rep, Harbourview Developments). she's worried about the 1 week slip from rain. explained zone B now Thurs, overall program still OK if pour goes ahead. she wants weekly photo update every Mon. asked for variation pricing for upgraded lobby tiles by next Wed. also raised the neighbour noise complaint - we'll keep start at 7am not 6:30.` },
  { daysAgo: 3, noteType: 'meeting_minutes', input: `site coord meeting. present: me, Dave, Sarah (Apex), Lisa (electrical), Ken (plumbing). decisions: zone B pour Thurs 6am confirmed, pump booked. plumbing rough-in lvl 3 to start Monday after elec. lighting in stairwell B to be fixed by Lisa by Wed. risk: concrete supply tight next 2 weeks, Sarah to lock in trucks. Ken needs updated drawings rev C.` },
  { daysAgo: 2, noteType: 'incident_report', input: `near miss approx 2:15pm lvl 1 loading bay. pallet slipped off forklift tines while unloading blocks, landed about 1m from labourer (Tommo). no injury. forklift driver Mick. ground was uneven/wet. area cordoned, stopped unloading, Dave notified. need to check forklift attachment and fix bay surface.` },
  { daysAgo: 1, noteType: 'construction_site_diary', input: `fine weather 22 deg. on site: 14 workers - Apex 5, electrical 3, plumbing 2, our crew 4. zone B slab poured 6am-11am, all good, curing. 3 truck deliveries concrete. scissor lift replaced by hire co. lvl 2 handrail fixed and signed off by Dave. visitor: Megan from Harbourview 2pm, took photos.` },
];

(async () => {
  const email = process.argv[2];
  if (!email) { console.error('Usage: seed-demo.ts <email of an onboarded workspace user>'); process.exit(1); }
  if (!ws.NEXT_PUBLIC_SUPABASE_URL) { console.error('.env.workspace missing'); process.exit(1); }
  if (!ws.ENCRYPTION_SECRET) { console.error('.env.workspace.generated (ENCRYPTION_SECRET) missing'); process.exit(1); }
  process.env.ENCRYPTION_SECRET = ws.ENCRYPTION_SECRET;
  const admin = createClient(ws.NEXT_PUBLIC_SUPABASE_URL, ws.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: profile } = await admin.from('ws_profiles').select('*').eq('email', email).maybeSingle();
  if (!profile) { console.error(`No onboarded workspace profile for ${email}`); process.exit(1); }

  for (const d of DEMO) {
    const created = new Date(Date.now() - d.daysAgo * 86400_000);
    const content = await generateNote({
      input: d.input, inputMode: 'typed', noteType: d.noteType, field: 'construction',
      userName: profile.name, date: created.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
    const text = noteToText(content);
    let embedding: string | null = null;
    try { embedding = JSON.stringify(await embedDocument(text)); } catch { /* keyword search still works */ }
    const { error } = await admin.from('ws_notes').insert({
      user_id: profile.user_id, note_type: d.noteType, field: 'construction', input_mode: 'typed',
      input_enc: seal(d.input), status: 'completed', ...sealNote(content), embedding, created_at: created.toISOString(), updated_at: created.toISOString(),
    });
    console.log(error ? `❌ ${error.message}` : `✅ ${content.title}`);
  }
})();
