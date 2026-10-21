// Verifies the Sydney Supabase project is ready for Kith Workspace.
// Run: npx tsx scripts/workspace-test/setup-check.ts
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file: string) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map(m => [m![1], m![2].replace(/^['"]|['"]$/g, '')]));
}

(async () => {
  const ws = loadEnv('.env.workspace') as Record<string, string>;
  const prod = loadEnv('.env.local') as Record<string, string>;
  const url = ws.NEXT_PUBLIC_SUPABASE_URL, anon = ws.NEXT_PUBLIC_SUPABASE_ANON_KEY, service = ws.SUPABASE_SERVICE_ROLE_KEY;
  const ok = (b: unknown, msg: string) => console.log(`${b ? '✅' : '❌'} ${msg}`);

  ok(url && anon && service, '.env.workspace has URL, anon key and service_role key');
  if (!url || !anon || !service) process.exit(1);
  ok(url !== prod.NEXT_PUBLIC_SUPABASE_URL, 'points at a DIFFERENT project from kith.space');
  if (url === prod.NEXT_PUBLIC_SUPABASE_URL) process.exit(1);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  for (const t of ['ws_profiles', 'ws_notes', 'ws_note_edits']) {
    const { error } = await admin.from(t).select('*', { head: true, count: 'exact' });
    ok(!error, `table ${t}${error ? `: ${error.message}` : ''}`);
  }
  const zero = JSON.stringify(new Array(1024).fill(0));
  const { error: rpc1 } = await admin.rpc('ws_search_notes', { p_user_id: '00000000-0000-0000-0000-000000000000', p_query_embedding: zero, p_query_text: 'test', p_limit: 1 });
  ok(!rpc1, `function ws_search_notes${rpc1 ? `: ${rpc1.message}` : ''}`);
  const { error: rpc2 } = await admin.rpc('ws_keyword_notes', { p_user_id: '00000000-0000-0000-0000-000000000000', p_query_text: 'test', p_limit: 1 });
  ok(!rpc2, `function ws_keyword_notes${rpc2 ? `: ${rpc2.message}` : ''}`);

  // RLS: the anon key must NOT see anything without a signed-in user.
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: leak } = await anonClient.from('ws_notes').select('id').limit(1);
  ok(!leak || leak.length === 0, 'row-level security blocks anonymous reads');
})();
