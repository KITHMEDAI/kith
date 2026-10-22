import { requirePageProfile } from '@/lib/workspace/server';
import { noteTypesForField, NOTE_TYPE_MAP } from '@/lib/workspace/note-types';
import { FIELD_MAP, fieldLabel } from '@/lib/workspace/fields';
import NewNote from '@/components/workspace/NewNote';
import { keytermsForField } from '@/lib/workspace/keyterms';

export const metadata = { title: 'New note' };

export default async function NewNotePage() {
  const { profile: p } = await requirePageProfile();
  const types = noteTypesForField(p.field).map(({ key, label, hint }) => ({ key, label, hint }));
  const preferred = p.default_note_type && NOTE_TYPE_MAP[p.default_note_type] && types.some(t => t.key === p.default_note_type)
    ? p.default_note_type
    : FIELD_MAP[p.field]?.defaultNoteType ?? 'general';

  return (
    <NewNote
      firstName={p.name.split(' ')[0]}
      fieldName={fieldLabel(p.field, p.field_custom)}
      types={types}
      defaultType={preferred}
      keyterms={keytermsForField(p.field)}
    />
  );
}
