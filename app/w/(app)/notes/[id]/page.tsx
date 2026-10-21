import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NOTE_TYPE_MAP } from '@/lib/workspace/note-types';
import NoteView from '@/components/workspace/NoteView';
import type { WsNote } from '@/lib/workspace/server';

export const metadata = { title: 'Note' };

export default async function NotePage({ params }: { params: { id: string } }) {
  const { data } = await createServerSupabaseClient().from('ws_notes')
    .select('id, title, note_type, field, input_mode, status, content, summary, error, duration_seconds, created_at, updated_at')
    .eq('id', params.id).maybeSingle();
  if (!data) notFound();
  const note = data as WsNote;
  return <NoteView initial={note} typeLabel={NOTE_TYPE_MAP[note.note_type]?.label ?? 'Note'} />;
}
