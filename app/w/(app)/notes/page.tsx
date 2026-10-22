import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requirePageProfile } from '@/lib/workspace/server';
import { openNote } from '@/lib/workspace/note-fields';
import { NOTE_TYPES } from '@/lib/workspace/note-types';
import NotesList, { type NoteRow } from '@/components/workspace/NotesList';

export const metadata = { title: 'Notes' };

const COLS = 'id, title, summary, note_type, input_mode, status, created_at';

// Search lives in NotesList (POST /api/w/search), so queries never reach the URL.
export default async function NotesPage() {
  const { userId } = await requirePageProfile();
  const { data } = await createServerSupabaseClient().from('ws_notes').select(COLS)
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(200);
  const rows = ((data ?? []) as NoteRow[]).map(r => openNote(r)); // titles/summaries are encrypted at rest
  const typeLabels = Object.fromEntries(NOTE_TYPES.map(t => [t.key, t.label]));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <Link href="/" className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          <Plus className="h-4 w-4" /> New
        </Link>
      </div>
      <NotesList initial={rows} typeLabels={typeLabels} />
    </div>
  );
}
