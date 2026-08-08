/**
 * lib/embeddings.ts
 *
 * Voyage AI client for semantic search over session notes (see migration
 * 016_notes_semantic_search.sql). Mirrors the mock-fallback pattern used
 * everywhere else in this codebase (lib/claude.ts's anthropic(), lib/recall.ts's
 * RECALL_MOCK) — with no VOYAGE_API_KEY set, embed() returns a deterministic
 * local vector instead of calling the real API, so the whole notes-search
 * pipeline (write path, backfill, hybrid search) is fully buildable and
 * testable without a Voyage account or any patient data ever leaving this
 * machine.
 *
 * IMPORTANT: Voyage AI requires a signed BAA before any real patient note
 * text is sent to it in production (same requirement Recall.ai had — see
 * project notes). Until VOYAGE_API_KEY is set in the environment, this file
 * only ever produces local mock vectors — nothing here can leak PHI.
 */
import { USE_MOCK } from './mock';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';
const VOYAGE_MODEL = 'voyage-4-lite';
export const EMBEDDING_DIMENSIONS = 1024;

export const EMBEDDINGS_MOCK = USE_MOCK || !VOYAGE_API_KEY;

// ── Deterministic local fallback ───────────────────────────────────────────
// A hashing-trick bag-of-words vector: each token hashes into one of
// EMBEDDING_DIMENSIONS buckets. This is NOT a real semantic embedding — two
// notes about "anxiety" and "GAD" won't be recognised as related the way a
// trained model would — but shared-vocabulary notes do get a genuinely
// higher cosine similarity than unrelated ones, which is enough to exercise
// and validate the whole storage/ranking/search pipeline end-to-end before a
// real Voyage account exists. Swap in the real API by setting
// VOYAGE_API_KEY — no other code changes needed.
const MOCK_STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'is', 'was', 'for', 'with', 'this', 'that', 'her', 'his', 'their', 'she', 'he', 'they']);

function mockEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(t => t.length >= 3 && !MOCK_STOPWORDS.has(t));
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[hash % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Real Voyage AI call ─────────────────────────────────────────────────────
// input_type differs for indexed content vs. a live search query — Voyage
// prepends a retrieval-optimised prefix internally when set, improving
// asymmetric (short query vs. long document) matching. Embeddings from
// different input_types remain comparable to each other.
//
// Retries on 429 with backoff: new Voyage accounts without a payment method
// on file are capped at 3 requests/minute, so a handful of notes generated
// in quick succession (or a backfill run) will legitimately hit the limit —
// this isn't an error condition to just give up on, it clears on its own a
// few seconds later. Respects Retry-After when Voyage sends one.
async function voyageEmbed(texts: string[], inputType: 'query' | 'document', attempt = 1): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: inputType,
      output_dimension: EMBEDDING_DIMENSIONS,
    }),
  });
  if (res.status === 429 && attempt <= 4) {
    const retryAfterHeader = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader * 1000
      : attempt * 20_000; // no header — 3 RPM means ~20s/request is the safe floor
    await res.text(); // drain the body before retrying
    await sleep(waitMs);
    return voyageEmbed(texts, inputType, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Voyage embeddings request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const rows: Array<{ embedding: number[] }> = json.data ?? json.embeddings ?? [];
  return rows.map(r => r.embedding ?? r);
}

async function embed(texts: string[], inputType: 'query' | 'document'): Promise<number[][]> {
  if (EMBEDDINGS_MOCK) return texts.map(mockEmbed);
  return voyageEmbed(texts, inputType);
}

/** Embed note content that will be stored and searched against later. */
export async function embedDocument(text: string): Promise<number[]> {
  const [vector] = await embed([text], 'document');
  return vector;
}

/** Embed a clinician's live search query — same vector space as embedDocument. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], 'query');
  return vector;
}

// ── Compose the searchable text for a session ──────────────────────────────
// Same composed string feeds both the embedding and the tsvector keyword
// index (see migration), so semantic and keyword search always cover
// identical content. Strips the AI note's **highlight** markup — that's
// presentation, not content, and would just add noise to token matching.
export interface NoteTextSource {
  session_summary?: string | null;
  soap_note?: Record<string, unknown> | null;
  key_points?: string[] | null;
  manual_notes?: string | null;
  homework_assigned?: string | null;
  session_tags?: string[] | null;
}

export function composeNoteText(session: NoteTextSource): string {
  const parts: string[] = [];
  if (session.session_summary) parts.push(session.session_summary);
  if (session.soap_note) {
    const fields = Object.values(session.soap_note).filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (fields.length) parts.push(fields.join(' '));
  }
  if (session.key_points?.length) parts.push(session.key_points.join(' '));
  if (session.homework_assigned) parts.push(session.homework_assigned);
  if (session.manual_notes) parts.push(session.manual_notes);
  if (session.session_tags?.length) parts.push(session.session_tags.join(' '));
  return parts.join('\n').replace(/\*\*/g, '').trim();
}

// ── Public: embed a session's current note content and store it ───────────
// Best-effort by design — callers should never let a search-indexing failure
// fail note generation or a note edit. Takes a Supabase service-role client
// (typed loosely, same convention as lib/claude.ts's `client: any`) so it
// has no import-cycle dependency on any one caller's client setup.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function embedAndStoreNote(sessionId: string, service: any): Promise<void> {
  const { data: session } = await service
    .from('sessions')
    .select('session_summary, soap_note, key_points, manual_notes, homework_assigned, session_tags')
    .eq('id', sessionId)
    .single();
  if (!session) return;

  const text = composeNoteText(session as NoteTextSource);
  if (!text) return;

  const vector = await embedDocument(text);
  const { error } = await service
    .from('sessions')
    .update({ embedding: vector, search_text: text })
    .eq('id', sessionId);
  if (error) throw new Error(`Failed to store note embedding: ${error.message}`);
}
