// Prints a one-time local sign-in URL for a TEST account (no email sent).
// Run: npx tsx scripts/workspace-test/test-login-link.ts [email]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.workspace', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m![1], m![2]])) as Record<string, string>;
(async () => {
  const email = process.argv[2] || 'workspace-test@kith.space';
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => null);
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  console.log(`http://localhost:8090/api/w/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink`);
})();
