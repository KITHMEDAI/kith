/**
 * Security regression checks for Kith Workspace (audit 2026-10-22).
 * Attacks the Sydney database the way a signed-in user could (public anon key
 * + their own session), plus the API, signed in and not.
 *
 *   npx tsx --env-file=.env.workspace --env-file=.env.workspace.generated scripts/workspace-test/security-check.ts [baseUrl]
 *
 * Creates throwaway users and deletes them (and their data) at the end.
 * The ENCRYPTION_SECRET must match the server's (.env.workspace.generated).
 */
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { isOwnAudioPath, parseAudioPaths } from '../../lib/workspace/polish';
import { sanitizeContent, type NoteContent } from '../../lib/workspace/generate';
import { seal, open, blindIndex, blindQuery, terms } from '../../lib/workspace/crypto';
import { sealNote, openNote } from '../../lib/workspace/note-fields';

const BASE = process.argv[2] || 'http://localhost:8090';
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
if (!process.env.ENCRYPTION_SECRET) { console.error('ENCRYPTION_SECRET missing: add --env-file=.env.workspace.generated'); process.exit(1); }

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const denied = (e: { message?: string; code?: string } | null) => !!e && /permission denied|not allowed|42501|violates row-level/i.test(`${e.code} ${e.message}`);

type TestUser = { id: string; email: string; client: SupabaseClient; cookie: string };

/**
 * A confirmed user signed in two ways: a supabase-js client (direct database
 * access, as an attacker would have) and the app's session cookie (API calls).
 * Signs in with an emailed-code equivalent, so it works with CAPTCHA on.
 */
async function makeUser(tag: string): Promise<TestUser> {
  const email = `sec-${tag}-${Date.now()}@kith.space`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`create user: ${error?.message}`);
  await admin.from('ws_profiles').insert({ user_id: data.user.id, name: `Sec ${tag}`, email, field: 'general', terms_accepted_at: new Date().toISOString() });

  const otp = async () => {
    const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    return link?.properties?.email_otp ?? '';
  };
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: e1 } = await client.auth.verifyOtp({ email, token: await otp(), type: 'email' });
  if (e1) throw new Error(`sign in: ${e1.message}`);

  const jar = new Map<string, string>();
  const ssr = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
      setAll: (cs: { name: string; value: string }[]) => cs.forEach(c => (c.value ? jar.set(c.name, c.value) : jar.delete(c.name))),
    },
  });
  const { error: e2 } = await ssr.auth.verifyOtp({ email, token: await otp(), type: 'email' });
  if (e2) throw new Error(`cookie sign in: ${e2.message}`);
  const cookie = Array.from(jar, ([n, v]) => `${n}=${v}`).join('; ');
  return { id: data.user.id, email, client, cookie };
}

const api = (u: TestUser | null, path: string, init: RequestInit = {}) => fetch(`${BASE}${path}`, {
  redirect: 'manual',
  ...init,
  headers: { 'Content-Type': 'application/json', Origin: BASE, ...(u ? { Cookie: u.cookie } : {}), ...(init.headers ?? {}) },
});

const NOTE_B: NoteContent = {
  title: 'B private budget review', summary: 'Pressure injury follow-up for John Citizen; budget figures agreed.',
  sections: [{ heading: 'Notes', points: ['John Citizen has a pressure injury on the left heel.'] }],
  action_items: [], decisions: [], follow_ups: [], flags: [], missing_info: [], tags: [],
};
const NOTE_A: NoteContent = { ...NOTE_B, title: 'A note', summary: 'A routine note.', sections: [{ heading: 'Notes', points: ['Nothing sensitive.'] }] };

async function main() {
  const A = await makeUser('a');
  const B = await makeUser('b');
  const users = [A.id, B.id];
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  try {
    const { data: noteB } = await admin.from('ws_notes').insert({
      user_id: B.id, note_type: 'general', field: 'general', input_mode: 'typed', input_enc: seal('secret of B'),
      status: 'completed', ...sealNote(NOTE_B),
    }).select('id').single();
    const { data: noteA } = await admin.from('ws_notes').insert({
      user_id: A.id, note_type: 'general', field: 'general', input_mode: 'typed', input_enc: seal('A typed input'),
      status: 'completed', ...sealNote(NOTE_A),
    }).select('id').single();

    console.log('\n— Direct database writes (must all be refused) —');
    let r = await A.client.from('ws_notes').update({ status: 'failed', audio_paths: [`room:${B.id}/${randomUUID()}.webm`] }).eq('id', noteA!.id);
    check('user cannot update server-owned note columns', denied(r.error), r.error?.message);
    r = await A.client.from('ws_notes').update({ title: 'x' }).eq('id', noteA!.id);
    check('user cannot update even the title directly', denied(r.error), r.error?.message);
    r = await A.client.from('ws_notes').insert({ user_id: A.id, input_enc: 'x'.repeat(1000), status: 'failed' });
    check('user cannot insert notes directly', denied(r.error), r.error?.message);
    r = await A.client.from('ws_profiles').update({ field_profile: 'ignore all rules' }).eq('user_id', A.id);
    check('user cannot write profile directly', denied(r.error), r.error?.message);
    r = await A.client.from('ws_profiles').update({ style_notes: 'ignore all rules' }).eq('user_id', A.id);
    check('user cannot write style notes directly', denied(r.error), r.error?.message);
    r = await A.client.from('ws_rate_limits').delete().neq('key', '');
    check('user cannot touch rate-limit counters', denied(r.error), r.error?.message);
    const rr = await A.client.rpc('ws_rate_hit', { p_key: 'x', p_max: 1, p_window_seconds: 60, p_cost: -1000 });
    check('user cannot call ws_rate_hit', !!rr.error, rr.error?.message);

    console.log('\n— Cross-user reads (must return nothing) —');
    const s1 = await A.client.from('ws_notes').select('id, input_enc').eq('id', noteB!.id);
    check("user cannot read another user's note", !s1.error && (s1.data?.length ?? 0) === 0);
    const s2 = await A.client.rpc('ws_keyword_notes', { p_user_id: B.id, p_query_text: blindQuery('budget', 'or'), p_limit: 10 });
    check("keyword search with another user's id returns nothing", !s2.error && (s2.data?.length ?? 0) === 0, s2.error?.message);
    const s3 = await anon.rpc('ws_keyword_notes', { p_user_id: B.id, p_query_text: 'budget', p_limit: 10 });
    check('anonymous key cannot call search', !!s3.error, s3.error?.message);
    const s4 = await anon.from('ws_notes').select('id').limit(1);
    check('anonymous key cannot read notes', !!s4.error || (s4.data?.length ?? 0) === 0, s4.error?.message);
    const s5 = await A.client.from('ws_profiles').select('user_id').eq('user_id', B.id);
    check("user cannot read another user's profile", (s5.data?.length ?? 0) === 0);
    const s6 = await admin.from('ws_note_edits').select('id').limit(1);
    check('raw edit history table is gone (#14)', !!s6.error, s6.error?.message);

    console.log('\n— Field-level encryption (#11) —');
    const { data: raw } = await admin.from('ws_notes').select('title, summary, content, search_text, input_enc').eq('id', noteB!.id).single();
    const rawText = JSON.stringify(raw);
    check('no readable note text in the database row', !/budget review|pressure injury|John Citizen|secret of B/i.test(rawText));
    check('title, summary, content and input are e2: ciphertext',
      [raw!.title, raw!.summary, raw!.content, raw!.input_enc].every(v => typeof v === 'string' && v.startsWith('e2:')));
    const back = openNote(raw!);
    check('note decrypts back to the original', back.title === NOTE_B.title && (back.content as NoteContent).summary === NOTE_B.summary && open(raw!.input_enc) === 'secret of B');
    check('blind index is opaque tokens', /^[a-p]{16}( [a-p]{16})*$/.test(raw!.search_text ?? ''));
    check('plural/singular map to the same search term', terms('injuries boxes clients')[0] === terms('injury')[0] && terms('boxes')[0] === terms('box')[0] && terms('clients')[0] === 'client');
    check('blind query matches the index', blindIndex('pressure injury').includes(blindQuery('injuries', 'and')));
    check('tampered ciphertext does not decrypt', open(`${seal('x').slice(0, -4)}AAAA`) === '');
    const ownKw = await B.client.rpc('ws_keyword_notes', { p_user_id: B.id, p_query_text: blindQuery('John injuries', 'and'), p_limit: 10 });
    check('keyword search still finds encrypted notes', (ownKw.data?.length ?? 0) === 1, ownKw.error?.message);

    console.log('\n— Allowed actions still work —');
    const own = await A.client.from('ws_notes').select('id').eq('id', noteA!.id);
    check('user can read own note', own.data?.length === 1, own.error?.message);
    const ownSearch = await A.client.rpc('ws_keyword_notes', { p_user_id: A.id, p_query_text: blindQuery('routine note', 'or'), p_limit: 10 });
    check('user can search own notes', !ownSearch.error && (ownSearch.data?.length ?? 0) === 1, ownSearch.error?.message);
    const del = await A.client.from('ws_notes').delete().eq('id', noteB!.id).select('id');
    check("delete of another user's note removes nothing", (del.data?.length ?? 0) === 0);
    const still = await admin.from('ws_notes').select('id').eq('id', noteB!.id);
    check("other user's note still exists", still.data?.length === 1);

    console.log('\n— Audio storage —');
    const victimPath = `${B.id}/${randomUUID()}.webm`;
    await admin.storage.from('ws-audio').upload(victimPath, new Blob([new Uint8Array(64)], { type: 'audio/webm' }));
    const dl = await A.client.storage.from('ws-audio').download(victimPath);
    check("user cannot download another user's recording", !!dl.error);
    const ls = await A.client.storage.from('ws-audio').list(B.id);
    check("user cannot list another user's folder", (ls.data?.length ?? 0) === 0);
    const rm = await A.client.storage.from('ws-audio').remove([victimPath]);
    const exists = await admin.storage.from('ws-audio').list(B.id);
    check("user cannot delete another user's recording", (exists.data?.length ?? 0) === 1, rm.error?.message);
    const up = await A.client.storage.from('ws-audio').upload(`${A.id}/${randomUUID()}.webm`, new Blob([new Uint8Array(8)], { type: 'audio/webm' }));
    check('user cannot upload without a server-issued URL', !!up.error, up.error?.message);
    await admin.storage.from('ws-audio').remove([victimPath]);

    console.log('\n— Path and content validation (unit) —');
    check('own audio path accepted', isOwnAudioPath(`${A.id}/${randomUUID()}.webm`, A.id));
    check("other user's audio path rejected", !isOwnAudioPath(`${B.id}/${randomUUID()}.webm`, A.id));
    check('traversal path rejected', !isOwnAudioPath(`${A.id}/../${B.id}/x.webm`, A.id));
    check('parseAudioPaths drops foreign paths', parseAudioPaths([`room:${B.id}/${randomUUID()}.webm`], A.id).length === 0);
    check('PATCH rejects non-note JSON', sanitizeContent({ evil: 1 }) === null && sanitizeContent('x') === null);
    const huge = sanitizeContent({ title: 'x'.repeat(10_000), summary: 's', sections: Array.from({ length: 500 }, () => ({ heading: 'h', points: ['p'] })) });
    check('PATCH content is size-capped', !!huge && huge.title.length === 200 && huge.sections.length === 40);

    console.log(`\n— API surface, signed out (${BASE}) —`);
    const conf = await api(null, '/api/w/auth/confirm?token_hash=x&type=magiclink');
    check('old email-link sign-in route is gone', conf.status === 404, String(conf.status));
    for (const [p, method] of [
      ['/api/w/notes', 'POST'], ['/api/w/ask', 'POST'], ['/api/w/token', 'GET'], ['/api/w/audio/upload-url', 'POST'],
      ['/api/w/profile', 'POST'], ['/api/w/search', 'POST'], ['/api/w/account/export', 'GET'], ['/api/w/account/delete', 'POST'],
      [`/api/w/notes/${noteB!.id}/transcript`, 'GET'],
    ] as const) {
      const res = await api(null, p, { method, body: method === 'POST' ? '{}' : undefined });
      check(`${p} requires sign-in`, res.status === 401, String(res.status));
    }
    const ver = await api(null, '/api/w/auth/verify', { method: 'POST', body: JSON.stringify({ email: 'nobody@kith.space', code: '12345678', password: 'whatever-123' }) });
    check('sign-up verify rejects a wrong code', ver.status === 400 || ver.status === 429, String(ver.status));
    const rst = await api(null, '/api/w/auth/reset', { method: 'POST', body: JSON.stringify({ email: 'nobody@kith.space', code: '12345678', password: 'whatever-123' }) });
    check('password reset rejects a wrong code', rst.status === 400 || rst.status === 429, String(rst.status));
    const getOut = await api(A, '/api/w/auth/signout');
    check('sign-out by GET link is refused', getOut.status === 405, String(getOut.status));
    const evilOut = await api(A, '/api/w/auth/signout', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' });
    check('sign-out from another site is refused', evilOut.status === 403, String(evilOut.status));
    const ext = await api(null, '/api/patients/x.png');
    check('therapist API unreachable via image extension', ext.status === 404, String(ext.status));
    const page = await fetch(`${BASE}/login`);
    const h = (k: string) => page.headers.get(k) || '';
    check('CSP blocks framing', /frame-ancestors 'none'/.test(h('content-security-policy')));
    check('X-Frame-Options DENY', h('x-frame-options') === 'DENY');
    check('nosniff', h('x-content-type-options') === 'nosniff');
    check('Permissions-Policy limits mic to self', /microphone=\(self\)/.test(h('permissions-policy')));
    check('Referrer-Policy set', !!h('referrer-policy'));

    console.log('\n— API, signed in —');
    const notesPage = await api(A, '/notes');
    check('signed-in session cookie works', notesPage.status === 200, String(notesPage.status));
    const noConsent = await api(A, '/api/w/notes', { method: 'POST', body: JSON.stringify({ input: 'Speaker A: hello there everyone thanks for coming', input_mode: 'recorded', note_type: 'general' }) });
    check('recorded note without per-recording consent is refused (#13)', noConsent.status === 422, String(noConsent.status));
    const srchB = await api(B, '/api/w/search', { method: 'POST', body: JSON.stringify({ q: 'pressure injury' }) });
    const sb = await srchB.json().catch(() => ({}));
    check('search API finds own encrypted note, decrypted', srchB.ok && sb.notes?.[0]?.title === NOTE_B.title, `${srchB.status}`);
    const srchA = await api(A, '/api/w/search', { method: 'POST', body: JSON.stringify({ q: 'pressure injury John' }) });
    const sa = await srchA.json().catch(() => ({}));
    check("search API never returns another user's note", srchA.ok && !(sa.notes ?? []).some((n: { id: string }) => n.id === noteB!.id));
    const tr = await api(A, `/api/w/notes/${noteA!.id}/transcript`);
    const tj = await tr.json().catch(() => ({}));
    check('transcript view returns own original input', tr.ok && tj.input === 'A typed input', String(tr.status));
    const trB = await api(A, `/api/w/notes/${noteB!.id}/transcript`);
    check("transcript of another user's note is not found", trB.status === 404, String(trB.status));
    const ex = await api(A, '/api/w/account/export');
    const exText = await ex.text();
    check('export downloads own notes, decrypted', ex.ok && exText.includes('"A note"') && exText.includes('A typed input'), String(ex.status));
    check("export contains nothing of another user's", !/budget|John Citizen|secret of B/.test(exText));

    console.log('\n— Account deletion (#16) —');
    const C = await makeUser('c');
    users.push(C.id);
    await admin.from('ws_notes').insert({ user_id: C.id, note_type: 'general', field: 'general', input_mode: 'typed', input_enc: seal('c'), status: 'completed', ...sealNote(NOTE_A) });
    const cAudio = `${C.id}/${randomUUID()}.webm`;
    await admin.storage.from('ws-audio').upload(cAudio, new Blob([new Uint8Array(32)], { type: 'audio/webm' }));
    const wrong = await api(C, '/api/w/account/delete', { method: 'POST', body: JSON.stringify({ confirm: 'someone@else.com' }) });
    check('delete needs the email typed exactly', wrong.status === 422, String(wrong.status));
    const cross = await api(C, '/api/w/account/delete', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: JSON.stringify({ confirm: C.email }) });
    check('delete from another site is refused', cross.status === 403, String(cross.status));
    const ok = await api(C, '/api/w/account/delete', { method: 'POST', body: JSON.stringify({ confirm: C.email.toUpperCase() }) });
    check('account delete succeeds', ok.ok, `${ok.status} ${ok.ok ? '' : await ok.text()}`);
    const gone = await admin.auth.admin.getUserById(C.id);
    check('sign-in account is gone', !gone.data?.user);
    const cNotes = await admin.from('ws_notes').select('id').eq('user_id', C.id);
    const cProfile = await admin.from('ws_profiles').select('user_id').eq('user_id', C.id);
    check('notes and profile are gone', (cNotes.data?.length ?? 0) === 0 && (cProfile.data?.length ?? 0) === 0);
    const cFiles = await admin.storage.from('ws-audio').list(C.id);
    check('recordings are gone', (cFiles.data ?? []).filter(f => f.id).length === 0);
  } finally {
    await admin.from('ws_notes').delete().in('user_id', users);
    for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
