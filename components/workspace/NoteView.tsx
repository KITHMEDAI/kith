'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Copy, Check, Printer, Pencil, Trash2, Loader2, RotateCcw, AlertTriangle, Info, OctagonAlert,
  CircleDashed, Mic, Keyboard, Sparkles, Undo2,
} from 'lucide-react';
import type { NoteContent } from '@/lib/workspace/generate';
import type { WsNote } from '@/lib/workspace/server';
import { cn } from '@/lib/utils';

const STAGES = ['Reading your input', 'Organising key points', 'Writing your note', 'Checking actions and flags'];

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function toText(c: NoteContent): string {
  const out: string[] = [c.title, '', c.summary, ''];
  c.sections.forEach(s => { out.push(s.heading); s.points.forEach(p => out.push(`• ${p}`)); out.push(''); });
  if (c.decisions.length) { out.push('Decisions'); c.decisions.forEach(d => out.push(`• ${d}`)); out.push(''); }
  if (c.action_items.length) { out.push('Action items'); c.action_items.forEach(a => out.push(`☐ ${a.task}${a.owner ? ` (${a.owner})` : ''}${a.due ? `, due ${a.due}` : ''}`)); out.push(''); }
  if (c.follow_ups.length) { out.push('Follow-ups'); c.follow_ups.forEach(f => out.push(`• ${f}`)); out.push(''); }
  if (c.flags.length) { out.push('Flags'); c.flags.forEach(f => out.push(`! ${f.text}`)); out.push(''); }
  if (c.missing_info.length) { out.push('Missing information'); c.missing_info.forEach(m => out.push(`? ${m}`)); }
  return out.join('\n').trim();
}

// Edit model: each list is edited as one-item-per-line text.
type Draft = { title: string; summary: string; sections: { heading: string; text: string }[]; actions: string; decisions: string; follow_ups: string };
const toDraft = (c: NoteContent): Draft => ({
  title: c.title, summary: c.summary,
  sections: c.sections.map(s => ({ heading: s.heading, text: s.points.join('\n') })),
  actions: c.action_items.map(a => [a.task, a.owner ?? '', a.due ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n'),
  decisions: c.decisions.join('\n'),
  follow_ups: c.follow_ups.join('\n'),
});
const lines = (t: string) => t.split('\n').map(s => s.trim()).filter(Boolean);
const fromDraft = (d: Draft, base: NoteContent): NoteContent => ({
  ...base,
  title: d.title.trim() || base.title,
  summary: d.summary.trim(),
  sections: d.sections.map(s => ({ heading: s.heading.trim(), points: lines(s.text) })).filter(s => s.heading && s.points.length),
  action_items: lines(d.actions).map(l => { const [task, owner, due] = l.split('|').map(x => x.trim()); return { task, owner: owner || null, due: due || null }; }),
  decisions: lines(d.decisions),
  follow_ups: lines(d.follow_ups),
});

const area = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

export default function NoteView({ initial, typeLabel }: { initial: WsNote; typeLabel: string }) {
  const router = useRouter();
  const [note, setNote] = useState(initial);
  const [stage, setStage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState('');
  const [revising, setRevising] = useState(false);
  const [reviseMsg, setReviseMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [undoContent, setUndoContent] = useState<NoteContent | null>(null);

  // Poll while the note is being written.
  useEffect(() => {
    if (note.status !== 'processing') return;
    const stageTimer = setInterval(() => setStage(s => Math.min(s + 1, STAGES.length - 1)), 3500);
    const poll = setInterval(async () => {
      const res = await fetch(`/api/w/notes/${note.id}`, { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        if (j.status !== 'processing') { setNote(j); router.refresh(); }
      }
    }, 1500);
    return () => { clearInterval(stageTimer); clearInterval(poll); };
  }, [note.status, note.id, router]);

  const c = note.content;

  const copy = async () => {
    if (!c) return;
    await navigator.clipboard.writeText(toText(c));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    if (!c || !draft) return;
    const content = fromDraft(draft, c);
    setSaving(true);
    const res = await fetch(`/api/w/notes/${note.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    setSaving(false);
    if (res.ok) { setNote(n => ({ ...n, content, title: content.title, summary: content.summary })); setEditing(false); router.refresh(); }
  };

  const remove = async () => {
    setBusy(true);
    await fetch(`/api/w/notes/${note.id}`, { method: 'DELETE' });
    router.replace('/notes');
    router.refresh();
  };

  const retry = async () => {
    setBusy(true);
    const res = await fetch(`/api/w/notes/${note.id}`, { method: 'POST' });
    setBusy(false);
    if (res.ok) { setStage(0); setNote(n => ({ ...n, status: 'processing', error: null })); }
  };

  const revise = async (text?: string) => {
    const r = (text ?? request).trim();
    if (!r || !c || revising) return;
    setRevising(true); setReviseMsg(null);
    const res = await fetch(`/api/w/notes/${note.id}/revise`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: r }),
    });
    const j = await res.json().catch(() => ({}));
    setRevising(false);
    if (!res.ok) { setReviseMsg({ kind: 'err', text: j.error || 'Could not update the note' }); return; }
    if (!j.changed) { setReviseMsg({ kind: 'err', text: 'No change was needed for that request.' }); return; }
    setUndoContent(c);
    setNote(n => ({ ...n, content: j.content, title: j.content.title, summary: j.content.summary }));
    setRequest('');
    setReviseMsg({ kind: 'ok', text: 'Note updated.' });
    router.refresh();
  };

  const undo = async () => {
    if (!undoContent) return;
    const prev = undoContent;
    setUndoContent(null);
    setNote(n => ({ ...n, content: prev, title: prev.title, summary: prev.summary }));
    setReviseMsg({ kind: 'ok', text: 'Change undone.' });
    await fetch(`/api/w/notes/${note.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: prev }) });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/notes" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> All notes
        </Link>
        {note.status === 'completed' && c && !editing && (
          <div className="flex items-center gap-1">
            <IconBtn onClick={copy} label={copied ? 'Copied' : 'Copy'}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</IconBtn>
            <IconBtn onClick={() => window.print()} label="PDF"><Printer className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => { setDraft(toDraft(c)); setEditing(true); }} label="Edit"><Pencil className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => setConfirmDelete(true)} label="Delete"><Trash2 className="h-4 w-4" /></IconBtn>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm print:hidden">
          <span className="text-rose-800">Delete this note permanently?</span>
          <span className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 hover:bg-rose-100">Cancel</button>
            <button onClick={remove} disabled={busy} className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </button>
          </span>
        </div>
      )}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800">{typeLabel}</span>
          <span className="flex items-center gap-1">{note.input_mode === 'recorded' ? <Mic className="h-3 w-3" /> : <Keyboard className="h-3 w-3" />}{fmtDate(note.created_at)}</span>
        </div>

        {note.status === 'processing' && (
          <div className="py-10">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              <p className="font-medium">{STAGES[stage]}…</p>
            </div>
            <div className="mt-6 space-y-3">
              {[90, 70, 80, 55, 65].map((w, i) => (
                <div key={i} className="h-3 animate-pulse rounded bg-slate-100" style={{ width: `${w}%` }} />
              ))}
            </div>
            <p className="mt-6 text-xs text-slate-400">Usually 10–20 seconds. You can leave this page; the note keeps writing.</p>
          </div>
        )}

        {note.status === 'failed' && (
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-3 font-medium">We couldn&apos;t write this note</p>
            <p className="mt-1 text-sm text-slate-500">Your input is saved. Try again.</p>
            <button onClick={retry} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Retry
            </button>
          </div>
        )}

        {note.status === 'completed' && c && !editing && (
          <>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{c.title}</h1>
            {c.summary && <p className="mt-2 leading-relaxed text-slate-700">{c.summary}</p>}

            {c.flags.length > 0 && (
              <div className="mt-5 space-y-2">
                {c.flags.map((f, i) => (
                  <div key={i} className={cn('flex gap-2 rounded-xl px-3 py-2 text-sm',
                    f.level === 'urgent' ? 'bg-rose-50 text-rose-800' : f.level === 'attention' ? 'bg-amber-50 text-amber-900' : 'bg-sky-50 text-sky-900')}>
                    {f.level === 'urgent' ? <OctagonAlert className="mt-0.5 h-4 w-4 flex-none" /> : f.level === 'attention' ? <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> : <Info className="mt-0.5 h-4 w-4 flex-none" />}
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            )}

            {c.sections.map((s, i) => (
              <section key={i} className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{s.heading}</h2>
                <ul className="mt-2 space-y-1.5">
                  {s.points.map((p, j) => <li key={j} className="flex gap-2 leading-relaxed"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-violet-400" />{p}</li>)}
                </ul>
              </section>
            ))}

            {c.decisions.length > 0 && <ListBlock title="Decisions" items={c.decisions} />}

            {c.action_items.length > 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Action items</h2>
                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {c.action_items.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                      <span className="mt-0.5 h-4 w-4 flex-none rounded border border-slate-300" />
                      <span className="flex-1">{a.task}</span>
                      {(a.owner || a.due) && <span className="text-xs text-slate-500">{[a.owner, a.due].filter(Boolean).join(' · ')}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.follow_ups.length > 0 && <ListBlock title="Follow-ups" items={c.follow_ups} />}

            {c.missing_info.length > 0 && (
              <section className="mt-6 rounded-xl bg-slate-50 p-4">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600"><CircleDashed className="h-4 w-4" /> Missing information</h2>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">{c.missing_info.map((m, i) => <li key={i}>• {m}</li>)}</ul>
              </section>
            )}

            {c.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5 print:hidden">
                {c.tags.map(t => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">#{t}</span>)}
              </div>
            )}
            <p className="mt-8 border-t border-slate-100 pt-3 text-xs text-slate-400">AI-drafted by Kith from your input. Review before relying on it.</p>
          </>
        )}

        {editing && draft && c && (
          <div className="mt-4 space-y-4">
            <input className={`${area} text-lg font-semibold`} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            <textarea className={`${area} min-h-[70px]`} value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} />
            {draft.sections.map((s, i) => (
              <div key={i}>
                <input className={`${area} mb-1 font-semibold`} value={s.heading}
                  onChange={e => { const sections = [...draft.sections]; sections[i] = { ...s, heading: e.target.value }; setDraft({ ...draft, sections }); }} />
                <textarea className={`${area} min-h-[90px]`} value={s.text}
                  onChange={e => { const sections = [...draft.sections]; sections[i] = { ...s, text: e.target.value }; setDraft({ ...draft, sections }); }} />
              </div>
            ))}
            <EditList label="Decisions (one per line)" value={draft.decisions} onChange={v => setDraft({ ...draft, decisions: v })} />
            <EditList label="Action items (task | owner | due, one per line)" value={draft.actions} onChange={v => setDraft({ ...draft, actions: v })} />
            <EditList label="Follow-ups (one per line)" value={draft.follow_ups} onChange={v => setDraft({ ...draft, follow_ups: v })} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-xl px-4 py-2 text-sm hover:bg-slate-100">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
            <p className="text-xs text-slate-400">Kith learns from your edits and writes future notes of this type more like this.</p>
          </div>
        )}
      </article>

      {note.status === 'completed' && c && !editing && (
        <section className="mt-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm print:hidden">
          <label htmlFor="revise" className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
            <Sparkles className="h-4 w-4 text-violet-600" /> Add details or ask for changes
          </label>
          <textarea
            id="revise"
            value={request}
            onChange={e => setRequest(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') revise(); }}
            disabled={revising}
            placeholder="e.g. 'Also, Sarah confirmed the pump for 7am Thursday' or 'Dave owns the handrail fix' or 'Make the action items shorter'"
            className="mt-2 min-h-[72px] w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {['Make it shorter', 'Make it more formal', 'Fix spelling and grammar'].map(s => (
                <button key={s} onClick={() => revise(s)} disabled={revising}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-violet-300 hover:text-violet-800 disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => revise()} disabled={!request.trim() || revising}
              className="flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50">
              {revising ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {revising ? 'Updating…' : 'Update note'}
            </button>
          </div>
          {reviseMsg && (
            <p className={cn('mt-2 flex items-center gap-2 text-sm', reviseMsg.kind === 'ok' ? 'text-emerald-700' : 'text-rose-700')}>
              {reviseMsg.text}
              {reviseMsg.kind === 'ok' && undoContent && (
                <button onClick={undo} className="flex items-center gap-1 font-medium text-violet-700 hover:underline"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
              )}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95" title={label}>
      {children}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <ul className="mt-2 space-y-1.5">{items.map((d, i) => <li key={i} className="flex gap-2 leading-relaxed"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-slate-400" />{d}</li>)}</ul>
    </section>
  );
}

function EditList({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <textarea className={`${area} min-h-[70px]`} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}
