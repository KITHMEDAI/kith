/**
 * lib/note-fields.ts
 *
 * Shared field order/labels for the two note formats a therapist can pick
 * at signup (SOAP vs EMDR — see supabase/migrations/015_note_format.sql).
 * Both formats are stored in the same `sessions.soap_note` JSONB column;
 * detectNoteFormat() tells them apart by checking for EMDR's `target` key,
 * since the two field sets never overlap.
 */
export type NoteFormat = 'soap' | 'emdr';

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
};

export function detectNoteFormat(note: Record<string, unknown> | null | undefined): NoteFormat {
  return note && 'target' in note ? 'emdr' : 'soap';
}
