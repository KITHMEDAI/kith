import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, ChevronRight, Search } from 'lucide-react';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { embedQuery } from '@/lib/embeddings';

interface NoteSession {
  id: string;
  session_number: number;
  started_at: string;
  session_summary: string | null;
  patient: { display_name: string; diagnosis: string[] } | null;
}

const SESSION_COLUMNS = 'id, session_number, started_at, session_summary, patient:patients(display_name, diagnosis)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSession(s: any): NoteSession {
  return { ...s, patient: Array.isArray(s.patient) ? s.patient[0] : s.patient };
}

function relativeDate(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function NotesPage({ searchParams }: { searchParams: { patient?: string; q?: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) redirect('/register');

  const service = createServiceRoleClient();
  const q = searchParams.q?.trim();
  let sessions: NoteSession[];

  if (q) {
    // Two independent match paths, merged: an exact patient-name lookup
    // ("find Maria's notes" — note content never contains the patient's
    // real name, see lib/claude.ts's initials-only rule, so this can't be
    // covered by content search) and hybrid semantic+keyword search over
    // the actual note content (search_session_notes RPC, see migration
    // 016_notes_semantic_search.sql). Name matches surface first — that's a
    // precise filter intent — followed by content matches in ranked order.
    const [nameMatches, contentMatches] = await Promise.all([
      (async () => {
        const { data: patients } = await service
          .from('patients')
          .select('id')
          .eq('therapist_id', therapist.id)
          .ilike('display_name', `%${q}%`);
        const patientIds = (patients ?? []).map((p: { id: string }) => p.id);
        if (patientIds.length === 0) return [] as NoteSession[];

        let nameQuery = service
          .from('sessions')
          .select(SESSION_COLUMNS)
          .eq('therapist_id', therapist.id)
          .eq('status', 'completed')
          .not('soap_note', 'is', null)
          .in('patient_id', patientIds)
          .order('started_at', { ascending: false })
          .limit(100);
        if (searchParams.patient) nameQuery = nameQuery.eq('patient_id', searchParams.patient);

        const { data } = await nameQuery;
        return (data ?? []).map(normalizeSession);
      })(),
      (async () => {
        const queryEmbedding = await embedQuery(q);
        const { data: ranked, error } = await service.rpc('search_session_notes', {
          p_therapist_id: therapist.id,
          p_query_embedding: queryEmbedding,
          p_query_text: q,
          p_patient_id: searchParams.patient ?? null,
          p_limit: 100,
        });
        if (error) {
          console.warn('[Kith] notes search RPC failed:', error.message);
          return [] as NoteSession[];
        }
        const orderedIds: string[] = (ranked ?? []).map((r: { id: string }) => r.id);
        if (orderedIds.length === 0) return [] as NoteSession[];

        const { data } = await service.from('sessions').select(SESSION_COLUMNS).in('id', orderedIds);
        const byId = new Map((data ?? []).map((s) => [s.id, normalizeSession(s)]));
        return orderedIds.map(id => byId.get(id)).filter((s): s is NoteSession => !!s);
      })(),
    ]);

    const seen = new Set<string>();
    sessions = [...nameMatches, ...contentMatches].filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  } else {
    let query = service
      .from('sessions')
      .select(SESSION_COLUMNS)
      .eq('therapist_id', therapist.id)
      .eq('status', 'completed')
      .not('soap_note', 'is', null)
      .order('started_at', { ascending: false })
      .limit(100);
    if (searchParams.patient) query = query.eq('patient_id', searchParams.patient);

    const { data } = await query;
    sessions = (data ?? []).map(normalizeSession);
  }

  return (
    <div className="page-enter space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Session Notes</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {sessions.length} {sessions.length === 1 ? 'note' : 'notes'} generated
          </p>
        </div>
        <form method="GET" className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              name="q"
              defaultValue={searchParams.q}
              placeholder="Search patient, topic, or note content…"
              className="pl-9 pr-4 py-2 rounded-lg border border-input bg-white/70 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-400 w-64"
            />
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-white/40 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="grid grid-cols-[2fr_1.2fr_2.5fr_40px] gap-4 px-5 py-2.5 border-b border-purple-200/50">
          {['Patient', 'Session', 'Summary', ''].map(h => (
            <span key={h} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">{h}</span>
          ))}
        </div>

        {sessions.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-[13px] font-medium text-muted-foreground">
              {q ? `No notes matching "${q}"` : 'No notes yet'}
            </p>
            {!q && <p className="text-[12px] text-muted-foreground/60 mt-1">Complete a session to generate AI clinical notes</p>}
          </div>
        ) : (
          sessions.map((s, i) => (
            <Link key={s.id} href={`/notes/${s.id}`}
              className={`grid grid-cols-[2fr_1.2fr_2.5fr_40px] gap-4 items-center px-5 py-3.5 hover:bg-white/40 transition-colors ${i < sessions.length - 1 ? 'border-b border-purple-200/30' : ''}`}>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{s.patient?.display_name || '—'}</p>
                <p className="text-[12px] text-muted-foreground/70 truncate">{s.patient?.diagnosis?.slice(0, 2).join(', ')}</p>
              </div>
              <div>
                <p className="text-[13px] text-foreground/70">Session #{s.session_number}</p>
                <p className="text-[12px] text-muted-foreground/70">{relativeDate(s.started_at)}</p>
              </div>
              <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
                {s.session_summary || 'Notes available'}
              </p>
              <div className="flex justify-end">
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
