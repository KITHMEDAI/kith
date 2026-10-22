/**
 * Security regression checks for Kith Workspace (audit 2026-10-22).
 * Attacks the Sydney database the way a signed-in user could (public anon key
 * + their own session), plus the API's unauthenticated surface.
 *
 *   npx tsx --env-file=.env.workspace scripts/workspace-test/security-check.ts [baseUrl]
 *
 * Creates two throwaway users and deletes them (and their data) at the end.
 */
import { randomBytes, randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isOwnAudioPath, parseAudioPaths } from '../../lib/workspace/polish';
import { sanitizeContent } from '../../lib/workspace/generate';

const BASE = process.argv[2] || 'http://localhost:8090';
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const denied = (e: { message?: string; code?: string } | null) => !!e && /permission denied|not allowed|42501|violates row-level/i.test(`${e.code} ${e.message}`);

async function makeUser(tag: string): Promise<{ id: string; client: SupabaseClient }> {
  const email = `sec-${tag}-${Date.now()}@kith.space`;
  const password = randomBytes(18).toString('base64url');
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`create user: ${error?.message}`);
  await admin.from('ws_profiles').insert({ user_id: data.user.id, name: `Sec ${tag}`, email, field: 'general' });
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw new Error(`sign in: ${e2.message}`);
  return { id: data.user.id, client };
}

async function main() {
  const A = await makeUser('a');
  const B = await makeUser('b');
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  try {
    const { data: noteB } = await admin.from('ws_notes').insert({
      user_id: B.id, note_type: 'general', field: 'general', input_mode: 'typed', input_enc: 'secret of B',
      status: 'completed', title: 'B private', search_text: 'B private budget figures', content: { title: 'B private' },
    }).select('id').single();
    const { data: noteA } = await admin.from('ws_notes').insert({
      user_id: A.id, note_type: 'general', field: 'general', input_mode: 'typed', input_enc: 'A input',
      status: 'completed', title: 'A note', search_text: 'A note', content: { title: 'A note' },
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
    r = await A.client.from('ws_note_edits').insert({ note_id: noteB!.id, user_id: A.id, note_type: 'general', before_text: 'a', after_text: 'b' });
    check('user cannot insert edit rows', denied(r.error), r.error?.message);
    r = await A.client.from('ws_rate_limits').delete().neq('key', '');
    check('user cannot touch rate-limit counters', denied(r.error), r.error?.message);
    const rr = await A.client.rpc('ws_rate_hit', { p_key: 'x', p_max: 1, p_window_seconds: 60, p_cost: -1000 });
    check('user cannot call ws_rate_hit', !!rr.error, rr.error?.message);

    console.log('\n— Cross-user reads (must return nothing) —');
    const s1 = await A.client.from('ws_notes').select('id, input_enc').eq('id', noteB!.id);
    check("user cannot read another user's note", !s1.error && (s1.data?.length ?? 0) === 0);
    const s2 = await A.client.rpc('ws_keyword_notes', { p_user_id: B.id, p_query_text: 'budget', p_limit: 10 });
    check("keyword search with another user's id returns nothing", !s2.error && (s2.data?.length ?? 0) === 0, s2.error?.message);
    const s3 = await anon.rpc('ws_keyword_notes', { p_user_id: B.id, p_query_text: 'budget', p_limit: 10 });
    check('anonymous key cannot call search', !!s3.error, s3.error?.message);
    const s4 = await anon.from('ws_notes').select('id').limit(1);
    check('anonymous key cannot read notes', !!s4.error || (s4.data?.length ?? 0) === 0, s4.error?.message);
    const s5 = await A.client.from('ws_profiles').select('user_id').eq('user_id', B.id);
    check("user cannot read another user's profile", (s5.data?.length ?? 0) === 0);

    console.log('\n— Allowed actions still work —');
    const own = await A.client.from('ws_notes').select('id').eq('id', noteA!.id);
    check('user can read own note', own.data?.length === 1, own.error?.message);
    const ownSearch = await A.client.rpc('ws_keyword_notes', { p_user_id: A.id, p_query_text: 'note', p_limit: 10 });
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

    console.log(`\n— API surface (${BASE}) —`);
    const conf = await fetch(`${BASE}/api/w/auth/confirm?token_hash=x&type=magiclink`, { redirect: 'manual' });
    check('old email-link sign-in route is gone', conf.status === 404, String(conf.status));
    for (const p of ['/api/w/notes', '/api/w/ask', '/api/w/token', '/api/w/audio/upload-url', '/api/w/profile']) {
      const res = await fetch(`${BASE}${p}`, { method: p === '/api/w/token' ? 'GET' : 'POST', body: p === '/api/w/token' ? undefined : '{}', headers: { 'Content-Type': 'application/json' } });
      check(`${p} requires sign-in`, res.status === 401, String(res.status));
    }
    const ver = await fetch(`${BASE}/api/w/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@kith.space', code: '12345678', password: 'whatever-123' }) });
    check('sign-up verify rejects a wrong code', ver.status === 400 || ver.status === 429, String(ver.status));
    const page = await fetch(`${BASE}/login`);
    const h = (k: string) => page.headers.get(k) || '';
    check('CSP blocks framing', /frame-ancestors 'none'/.test(h('content-security-policy')));
    check('X-Frame-Options DENY', h('x-frame-options') === 'DENY');
    check('nosniff', h('x-content-type-options') === 'nosniff');
    check('Permissions-Policy limits mic to self', /microphone=\(self\)/.test(h('permissions-policy')));
    check('Referrer-Policy set', !!h('referrer-policy'));
  } finally {
    await admin.from('ws_notes').delete().in('user_id', [A.id, B.id]);
    await admin.auth.admin.deleteUser(A.id);
    await admin.auth.admin.deleteUser(B.id);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
