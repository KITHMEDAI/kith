/**
 * Where Kith Workspace sign-ups came from: the first public page each person
 * landed on and the site that sent them (app_metadata.signup_source, written
 * at onboarding from the ws_src cookie). Accounts created before 2026-11-07
 * show as "(before tracking)". Prints emails' domains only, never full emails.
 *
 *   npx tsx --env-file=.env.workspace scripts/workspace-test/signup-sources.ts [days]
 */
import { createClient } from '@supabase/supabase-js';

const days = Number(process.argv[2] || 90);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const since = Date.now() - days * 864e5;
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  const recent = users.filter(u => new Date(u.created_at).getTime() >= since);
  const bySource = new Map<string, number>();
  console.log(`Sign-ups in the last ${days} days: ${recent.length}\n`);
  for (const u of recent.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const s = (u.app_metadata as { signup_source?: { landing: string; from: string } }).signup_source;
    const key = s ? `${s.from}  →  ${s.landing}` : '(before tracking or not onboarded)';
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
    console.log(`${u.created_at.slice(0, 10)}  @${(u.email ?? '').split('@')[1] ?? '?'}  ${key}`);
  }
  console.log('\nBy source:');
  for (const [k, n] of [...bySource].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
}

main().catch(e => { console.error(e); process.exit(1); });
