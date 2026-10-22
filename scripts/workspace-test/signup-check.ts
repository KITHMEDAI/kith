/**
 * End-to-end check of email-code sign-up, password reset and "sign out
 * everywhere" (security audit 2026-10-22), using Resend's test inbox. The
 * emailed code can't be read here, so the test asks Supabase for a fresh code
 * the same way the server does.
 *
 *   npx tsx --env-file=.env.workspace scripts/workspace-test/signup-check.ts [baseUrl]
 *
 * With CAPTCHA switched on (Turnstile keys set), steps that need a CAPTCHA
 * token are reported as SKIP rather than failing.
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
const skip = (n: string, why: string) => console.log(`SKIP  ${n}  (${why})`);
const post = (p: string, body: object, headers: Record<string, string> = {}) =>
  fetch(`${BASE}${p}`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const isCaptcha = (m = '') => /captcha|security check/i.test(m);

/** Signs in with a password: a client, an error, or 'captcha' when Supabase demands a CAPTCHA token. */
async function signIn(password: string) {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email: EMAIL, password });
  return { client: c, error: error?.message, captcha: isCaptcha(error?.message) };
}

/** True when the session cookie gets past sign-in (a new account is sent to onboarding). */
async function signedIn(cookie: string) {
  const r = await fetch(`${BASE}/notes`, { redirect: 'manual', headers: { Cookie: cookie } });
  return r.status === 200 || (r.status === 307 && !/\/login/.test(r.headers.get('location') || ''));
}

async function userId(): Promise<string | undefined> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find(u => u.email === EMAIL)?.id;
}
// The cookies a browser would keep from a response (drops deletions like `name=; Max-Age=0`).
const cookieOf = (res: Response) => {
  const jar = new Map<string, string>();
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const [name, value] = [pair.slice(0, i), pair.slice(i + 1)];
    if (!value || /max-age=0(?:;|$)/i.test(c)) jar.delete(name); else jar.set(name, value);
  }
  return Array.from(jar, ([n, v]) => `${n}=${v}`).join('; ');
};

async function main() {
  const old = await userId();
  if (old) await admin.auth.admin.deleteUser(old);
  // Re-runnable: clear this test address's own rate-limit counters.
  await admin.from('ws_rate_limits').delete().like('key', `%${EMAIL}%`);

  // 1. Request a code: account exists but is unconfirmed, with a password nobody knows.
  let res = await post('/api/w/auth/signup', { email: EMAIL });
  let j = await res.json();
  if (isCaptcha(j.error)) { skip('sign-up flow', 'CAPTCHA is on'); process.exit(0); }
  check('sign-up sends a code', res.ok && j.ok, `${res.status} ${JSON.stringify(j)}`);
  const attackerPw = 'attacker-chosen-pw-1';
  const s0 = await signIn(attackerPw);
  if (s0.captcha) skip('nobody can sign in before the code is verified', 'CAPTCHA is on');
  else check('nobody can sign in before the code is verified', !!s0.error, s0.error);

  // 2. Wrong code is refused.
  res = await post('/api/w/auth/verify', { email: EMAIL, code: '00000000', password: 'owner-password-123' });
  check('wrong code refused', res.status === 400, String(res.status));

  // 3. Right code (fresh one, as the server would email) sets the owner's password.
  const { data: link } = await admin.auth.admin.generateLink({ type: 'signup', email: EMAIL, password: randomBytes(24).toString('base64url') });
  const ownerPw = `owner-${randomBytes(8).toString('hex')}`;
  res = await post('/api/w/auth/verify', { email: EMAIL, code: link?.properties?.email_otp ?? '', password: ownerPw });
  check('right code verifies and signs in', res.ok, `${res.status} ${await res.text()}`);
  check('verify sets a session cookie', /sb-[a-z0-9]+-auth-token/.test(res.headers.get('set-cookie') || ''));
  check('and that session is live (lands on onboarding, not sign-in)', await signedIn(cookieOf(res)));
  const s1 = await signIn(ownerPw);
  const captchaOn = s1.captcha;
  if (captchaOn) skip('password checks', 'Supabase CAPTCHA is on: password sign-in needs a token');
  else {
    check('owner can sign in with their password', !s1.error, s1.error);
    check('no other password works', !!(await signIn(attackerPw)).error);
  }

  // 4. Existing account: same response (no enumeration), nothing changes.
  res = await post('/api/w/auth/signup', { email: EMAIL });
  j = await res.json();
  check('existing email gets the identical response', res.ok && j.ok === true, `${res.status}`);
  if (!captchaOn) check('existing account unchanged', !(await signIn(ownerPw)).error);

  // 5. Password reset: same answer for unknown emails; the code sets a new
  //    password and signs out every other device.
  res = await post('/api/w/auth/reset', { email: EMAIL });
  j = await res.json();
  check('reset sends a code', res.ok && j.ok, `${res.status} ${JSON.stringify(j)}`);
  const unknown = await post('/api/w/auth/reset', { email: `nobody-${Date.now()}@kith.space` });
  const uj = await unknown.json();
  check('reset gives unknown emails the identical response', unknown.ok && uj.message === j.message);
  res = await post('/api/w/auth/reset', { email: EMAIL, code: '00000000', password: 'new-password-123' });
  check('reset with a wrong code is refused', res.status === 400, String(res.status));

  const { data: rec } = await admin.auth.admin.generateLink({ type: 'recovery', email: EMAIL });
  const newPw = `new-${randomBytes(8).toString('hex')}`;
  res = await post('/api/w/auth/reset', { email: EMAIL, code: rec?.properties?.email_otp ?? '', password: newPw });
  check('right reset code sets the new password', res.ok, `${res.status}`);
  const resetCookie = cookieOf(res);
  check('reset leaves this browser signed in', await signedIn(resetCookie));
  if (!captchaOn) {
    check('new password works', !(await signIn(newPw)).error);
    check('old password no longer works', !!(await signIn(ownerPw)).error);
    const { error: refresh } = await s1.client.auth.refreshSession();
    check('reset signed out the other device', !!refresh, refresh?.message);
  }

  // 6. Sign out everywhere (POST from this site) revokes every session.
  const other = captchaOn ? null : await signIn(newPw);
  res = await fetch(`${BASE}/api/w/auth/signout`, {
    method: 'POST', redirect: 'manual',
    headers: { Origin: BASE, Cookie: resetCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'scope=global',
  });
  check('sign out everywhere redirects to sign-in', res.status === 303 && /\/login\?signedout=all/.test(res.headers.get('location') || ''), `${res.status} ${res.headers.get('location')}`);
  if (other && !other.error) {
    const { error: refresh } = await other.client.auth.refreshSession();
    check('every other session was revoked', !!refresh, refresh?.message);
  }

  const id = await userId();
  if (id) await admin.auth.admin.deleteUser(id);
  console.log(fail ? `\n${fail} failed` : '\nall passed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
