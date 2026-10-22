/**
 * End-to-end check of email-code sign-up (security audit 2026-10-22), using
 * Resend's test inbox. The emailed code can't be read here, so the test asks
 * Supabase for a fresh code the same way the server does.
 *
 *   npx tsx --env-file=.env.workspace scripts/workspace-test/signup-check.ts [baseUrl]
 */
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const BASE = process.argv[2] || 'http://localhost:8090';
const EMAIL = 'delivered@resend.dev';
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const anon = () => createClient(URL_, ANON, { auth: { persistSession: false } });

let fail = 0;
const check = (n: string, ok: boolean, d = '') => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const post = (p: string, body: object) => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function userId(): Promise<string | undefined> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find(u => u.email === EMAIL)?.id;
}

async function main() {
  const old = await userId();
  if (old) await admin.auth.admin.deleteUser(old);

  // 1. Request a code: account exists but is unconfirmed, with a password nobody knows.
  let res = await post('/api/w/auth/signup', { email: EMAIL });
  let j = await res.json();
  check('sign-up sends a code', res.ok && j.ok, `${res.status} ${JSON.stringify(j)}`);
  const attackerPw = 'attacker-chosen-pw-1';
  const s0 = await anon().auth.signInWithPassword({ email: EMAIL, password: attackerPw });
  check('nobody can sign in before the code is verified', !!s0.error, s0.error?.message);

  // 2. Wrong code is refused.
  res = await post('/api/w/auth/verify', { email: EMAIL, code: '00000000', password: 'owner-password-123' });
  check('wrong code refused', res.status === 400, String(res.status));

  // 3. Right code (fresh one, as the server would email) sets the owner's password.
  const { data: link } = await admin.auth.admin.generateLink({ type: 'signup', email: EMAIL, password: randomBytes(24).toString('base64url') });
  const code = link?.properties?.email_otp ?? '';
  const ownerPw = `owner-${randomBytes(8).toString('hex')}`;
  res = await post('/api/w/auth/verify', { email: EMAIL, code, password: ownerPw });
  check('right code verifies and signs in', res.ok, `${res.status} ${await res.text()}`);
  check('verify sets a session cookie', /sb-[a-z0-9]+-auth-token/.test(res.headers.get('set-cookie') || ''));
  const s1 = await anon().auth.signInWithPassword({ email: EMAIL, password: ownerPw });
  check('owner can sign in with their password', !s1.error, s1.error?.message);
  const s2 = await anon().auth.signInWithPassword({ email: EMAIL, password: attackerPw });
  check('no other password works', !!s2.error);

  // 4. Existing account: same response (no enumeration), nothing changes.
  res = await post('/api/w/auth/signup', { email: EMAIL });
  j = await res.json();
  check('existing email gets the identical response', res.ok && j.ok === true, `${res.status}`);
  const s3 = await anon().auth.signInWithPassword({ email: EMAIL, password: ownerPw });
  check('existing account unchanged', !s3.error);

  const id = await userId();
  if (id) await admin.auth.admin.deleteUser(id);
  console.log(fail ? `\n${fail} failed` : '\nall passed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
