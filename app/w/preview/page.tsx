import { notFound } from 'next/navigation';
import samples from '@/scripts/workspace-test/preview-samples.json';
import WorkspaceNav from '@/components/workspace/WorkspaceNav';
import NewNote from '@/components/workspace/NewNote';
import NoteView from '@/components/workspace/NoteView';
import { noteTypesForField, NOTE_TYPE_MAP } from '@/lib/workspace/note-types';
import type { WsNote } from '@/lib/workspace/server';
import type { NoteContent } from '@/lib/workspace/generate';

// DEV-ONLY design preview of the real workspace components with real
// AI-generated sample notes, so UI can be checked without a database.
export default function Preview({ searchParams }: { searchParams: { view?: string; n?: string } }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const view = searchParams.view ?? 'new';
  const s = samples[Number(searchParams.n ?? 0)] ?? samples[0];
  const note: WsNote = {
    id: 'preview', title: (s.content as NoteContent).title, note_type: s.noteType, field: s.field,
    input_mode: s.inputMode as 'typed' | 'recorded', status: view === 'processing' ? 'processing' : 'completed',
    content: s.content as NoteContent, summary: (s.content as NoteContent).summary, error: null,
    duration_seconds: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  return (
    <>
      <WorkspaceNav name="Steve Agi" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:pt-10">
        {view === 'new' && (
          <NewNote firstName="Steve" fieldName="Construction / trades"
            types={noteTypesForField('construction').map(({ key, label, hint }) => ({ key, label, hint }))}
            defaultType="construction_site_inspection" keyterms={[]} />
        )}
        {(view === 'note' || view === 'processing') && <NoteView initial={note} typeLabel={NOTE_TYPE_MAP[note.note_type]?.label ?? 'Note'} />}
      </main>
    </>
  );
}
