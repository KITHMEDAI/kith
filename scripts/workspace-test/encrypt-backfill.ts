/**
 * One-off: encrypt Kith Workspace notes written before field-level encryption
 * (audit 2026-10-22, #11). Run AFTER migration 004 and the deploy.
 *
 *   npx tsx --env-file=.env.workspace --env-file=.env.workspace.generated scripts/workspace-test/encrypt-backfill.ts          # dry run
 *   npx tsx --env-file=.env.workspace --env-file=.env.workspace.generated scripts/workspace-test/encrypt-backfill.ts --apply
 *
 * Per note: title/summary/content → encrypted, search_text → blind index,
 * custom_instruction and plain-text input → encrypted. Legacy `enc:` inputs
 * are already encrypted and left as they are. Idempotent.
 */
import { createClient } from '@supabase/supabase-js';
import { seal, open } from '../../lib/workspace/crypto';
import { sealNote, openContent } from '../../lib/workspace/note-fields';

const APPLY = process.argv.includes('--apply');
if (!process.env.ENCRYPTION_SECRET) { console.error('ENCRYPTION_SECRET missing (.env.workspace.generated)'); process.exit(1); }
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const isSealed = (v: unknown) => typeof v === 'string' && v.startsWith('e2:');

async function main() {
  let seen = 0, changed = 0, failed = 0;
  for (let from = 0; ; from += 200) {
    const { data, error } = await admin.from('ws_notes')
      .select('id, title, summary, content, custom_instruction, input_enc')
      .order('created_at').range(from, from + 199);
    if (error) throw new Error(error.message);
    for (const n of data ?? []) {
      seen++;
      const patch: Record<string, unknown> = {};
      const content = openContent(n.content);
      if (content && !isSealed(n.content)) Object.assign(patch, sealNote(content));
      else if (!content && ((n.title && !isSealed(n.title)) || (n.summary && !isSealed(n.summary)))) {
        patch.title = n.title ? seal(open(n.title)) : null;
        patch.summary = n.summary ? seal(open(n.summary)) : null;
      }
      if (n.custom_instruction && !isSealed(n.custom_instruction)) patch.custom_instruction = seal(open(n.custom_instruction));
      if (n.input_enc && !isSealed(n.input_enc) && !n.input_enc.startsWith('enc:')) patch.input_enc = seal(n.input_enc);
      if (!Object.keys(patch).length) continue;
      changed++;
      if (!APPLY) continue;
      const { error: e } = await admin.from('ws_notes').update(patch).eq('id', n.id);
      if (e) { failed++; console.error(`  ${n.id}: ${e.message}`); }
    }
    if (!data || data.length < 200) break;
  }
  console.log(`${seen} notes, ${changed} need encrypting${APPLY ? `, ${changed - failed} updated, ${failed} failed` : ' (dry run: add --apply)'}`);
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
