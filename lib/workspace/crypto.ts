/**
 * lib/workspace/crypto.ts
 *
 * Field-level encryption for Kith Workspace (audit 2026-10-22, #11). Every
 * piece of note text is stored encrypted: the input/transcript, the generated
 * note (content, title, summary), the custom note-type description and the
 * learned style notes. Only the server can read them.
 *
 *   - `seal` / `open`: AES-256-GCM with a per-field random IV. The key is
 *     derived ONCE per process from ENCRYPTION_SECRET (lib/encryption.ts runs
 *     scrypt on every call, far too slow for a list of 200 titles). Format
 *     `e2:<base64 iv|tag|ciphertext>`. Legacy `enc:` values (lib/encryption)
 *     and old plain-text rows still open, so nothing breaks before a backfill.
 *   - `blindIndex` / `blindQuery`: keyword search without storing words. Each
 *     word is normalised and replaced by a keyed hash (HMAC) spelled in the
 *     letters a–p, so Postgres full-text search (ws_keyword_notes,
 *     ws_search_notes) still matches and ranks, but `search_text` holds no
 *     readable text.
 *
 * Encryption is optional in local dev only (no secret = plain text). In
 * production a missing secret is an error: never silently store plain text.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from 'crypto';
import { decrypt as legacyDecrypt } from '@/lib/encryption';

const PREFIX = 'e2:';
let fieldKey: Buffer | null = null;
let searchKey: Buffer | null = null;

function secret(): string | null {
  const s = process.env.ENCRYPTION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('ENCRYPTION_SECRET is not set');
  return null;
}
function keys() {
  const s = secret();
  if (!s) return null;
  fieldKey ??= scryptSync(s, 'kith-workspace-fields-v1', 32);
  searchKey ??= scryptSync(s, 'kith-workspace-search-v1', 32);
  return { field: fieldKey, search: searchKey };
}

export function seal(text: string): string {
  const k = keys();
  if (!k) return text;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k.field, iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}

export function open(stored: string | null | undefined): string {
  if (!stored) return '';
  try {
    if (stored.startsWith(PREFIX)) {
      const k = keys();
      if (!k) throw new Error('no key');
      const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
      const d = createDecipheriv('aes-256-gcm', k.field, buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
    }
    if (stored.startsWith('enc:')) return legacyDecrypt(stored.slice(4));
  } catch {
    console.error('[workspace] could not decrypt a field (key changed?)');
    return '';
  }
  return stored; // written before field encryption
}

export const sealOrNull = (t: string | null | undefined) => (t ? seal(t) : null);

// ── Blind keyword index ──────────────────────────────────────────────────────

/** Words that never help a search (also dropped from queries). */
export const STOP = new Set('a an the and or but to of in on at is are was were be been for with this that what whats which who whom whose when where why how do does did i me my mine we our you your it its any all about tell give list there have has had can could should would will from by as into than then so if not no yes get got go went much many more most last next yet up out still'.split(' '));

/** Light English normalisation, applied identically to notes and queries. */
function norm(word: string): string {
  let w = word.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]s$/, '').replace(/['’]/g, '');
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && /(?:ss|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !/(?:ss|us|is)$/.test(w)) w = w.slice(0, -1);
  return w;
}

/** Normalised search terms of a text (unique, stop words removed). */
export function terms(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  const out: string[] = [];
  for (const raw of words) {
    for (const part of raw.split('-')) {
      const w = norm(part);
      if (w.length > 1 && !STOP.has(w)) out.push(w);
    }
  }
  return out;
}

/** Keyed hash of one term, spelled with letters only so the FTS parser keeps it whole. */
function token(term: string, key: Buffer): string {
  const h = createHmac('sha256', key).update(term).digest();
  let s = '';
  for (let i = 0; i < 8; i++) s += String.fromCharCode(97 + (h[i] >> 4), 97 + (h[i] & 15));
  return s;
}

/** What goes in ws_notes.search_text: one opaque token per word (keeps word counts for ranking). */
export function blindIndex(text: string): string {
  const k = keys();
  const t = terms(text);
  return k ? t.map(w => token(w, k.search)).join(' ') : t.join(' ');
}

/** A query for the search RPCs: every term ("and") or any term ("or", websearch syntax). */
export function blindQuery(q: string, mode: 'and' | 'or'): string {
  const k = keys();
  const t = Array.from(new Set(terms(q)));
  return (k ? t.map(w => token(w, k.search)) : t).join(mode === 'or' ? ' or ' : ' ');
}
