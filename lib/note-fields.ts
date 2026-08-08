/**
 * lib/note-fields.ts
 *
 * Single source of truth for every note format a therapist can pick at
 * signup or in Settings — field layout (NOTE_FIELDS), format detection
 * (detectNoteFormat), and the UI metadata (NOTE_FORMAT_META) both selector
 * screens render from. All formats are stored in the same
 * `sessions.soap_note` JSONB column; detectNoteFormat() tells them apart by
 * checking for a field name unique to each format.
 *
 * Adding a 5th format later means one new entry in each of the three
 * exports below, plus a matching schema in lib/claude.ts's NOTE_SCHEMAS —
 * nothing in the UI or rendering pages needs to change, they all read from
 * this registry.
 */
import type { NoteFormat } from '@/types';

export type { NoteFormat };

export const NOTE_FIELDS: Record<NoteFormat, { key: string; label: string }[]> = {
  soap: [
    { key: 'subjective', label: 'Subjective' },
    { key: 'objective', label: 'Objective' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'plan', label: 'Plan' },
  ],
  emdr: [
    { key: 'target', label: 'Target Processed' },
    { key: 'sud_voc', label: 'SUD → VOC' },
    { key: 'cognitions', label: 'Negative → Positive Cognition' },
    { key: 'phase_plan', label: 'Phase & Next Session' },
  ],
  dap: [
    { key: 'data', label: 'Data' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'plan', label: 'Plan' },
  ],
  birp: [
    { key: 'behavior', label: 'Behavior' },
    { key: 'intervention', label: 'Intervention' },
    { key: 'response', label: 'Response' },
    { key: 'plan', label: 'Plan' },
  ],
};

// label/description are for the format-picker UI (register + settings pages
// map over this instead of hardcoding buttons per format); shortLabel is for
// inline headers referring to a single already-generated note (e.g. "SOAP
// Note" above that note's fields, or a copy/export header) — singular,
// Title Case, distinct from label's plural picker-button phrasing.
export const NOTE_FORMAT_META: Record<NoteFormat, { label: string; shortLabel: string; description: string }> = {
  soap: { label: 'SOAP notes', shortLabel: 'SOAP Note', description: 'Subjective, Objective, Assessment, Plan' },
  emdr: { label: 'EMDR notes', shortLabel: 'EMDR Note', description: 'Target, SUD/VOC, cognitions, phase — EMDR-trained practice' },
  dap: { label: 'DAP notes', shortLabel: 'DAP Note', description: 'Data, Assessment, Plan — simpler, high-volume practices' },
  birp: { label: 'BIRP notes', shortLabel: 'BIRP Note', description: 'Behavior, Intervention, Response, Plan — common insurance/agency requirement' },
};

// Ordered so the most format-specific keys are checked first — DAP's
// "assessment"/"plan" overlap with SOAP's, so it must be identified by its
// own unique "data" key, same idea as EMDR's "target". None of the four
// formats' unique keys collide with each other.
const FORMAT_DETECTION_ORDER: { format: NoteFormat; uniqueKey: string }[] = [
  { format: 'emdr', uniqueKey: 'target' },
  { format: 'birp', uniqueKey: 'behavior' },
  { format: 'dap', uniqueKey: 'data' },
];

export function detectNoteFormat(note: Record<string, unknown> | null | undefined): NoteFormat {
  if (!note) return 'soap';
  for (const { format, uniqueKey } of FORMAT_DETECTION_ORDER) {
    if (uniqueKey in note) return format;
  }
  return 'soap';
}
