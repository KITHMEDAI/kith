/**
 * lib/workspace/note-fields.ts
 *
 * Converts a generated note to and from its encrypted database columns
 * (see crypto.ts). Every write of note content goes through `sealNote`, every
 * read through `openNote`, so plain text never sits in the database.
 */
import { seal, open, blindIndex } from './crypto';
import { noteToText, type NoteContent } from './generate';

/** The ws_notes columns for a note's content: encrypted text + blind search index. */
export function sealNote(content: NoteContent) {
  return {
    content: seal(JSON.stringify(content)),
    title: seal(content.title),
    summary: seal(content.summary),
    search_text: blindIndex(noteToText(content)),
  };
}

/** The `content` column: an encrypted JSON string, or (old rows) the JSON itself. */
export function openContent(v: unknown): NoteContent | null {
  if (!v) return null;
  if (typeof v === 'object') return v as NoteContent;
  if (typeof v !== 'string') return null;
  try { return JSON.parse(open(v)) as NoteContent; } catch { return null; }
}

/** Decrypts whichever of title / summary / content / custom_instruction a row has. */
export function openNote<T extends { title?: unknown; summary?: unknown; content?: unknown; custom_instruction?: unknown }>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  if ('title' in row) out.title = open(row.title as string | null) || null;
  if ('summary' in row) out.summary = open(row.summary as string | null) || null;
  if ('content' in row) out.content = openContent(row.content);
  if ('custom_instruction' in row) out.custom_instruction = open(row.custom_instruction as string | null) || null;
  return out as T;
}
