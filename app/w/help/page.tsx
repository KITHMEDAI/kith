import HelpContact from '@/components/workspace/HelpContact';

export const metadata = { title: 'Help & support' };

// Public help page. Uses copy + "Open in Gmail" (web compose) instead of a
// mailto: link, which on many PCs launches an unexpected mail app or a
// browser profile picker.
export default function HelpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <a href="/" className="text-sm text-violet-700 hover:underline">← Back</a>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Help &amp; support</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Questions, feedback, a bug, or a note that didn&apos;t come out right? Email us and include what you were doing.
        We usually reply within a day.
      </p>
      <HelpContact email="kithmedai@gmail.com" />
      <div className="mt-8 space-y-3 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">Quick answers</h2>
        <p><b className="text-slate-800">Recording a meeting:</b> use Chrome or Edge on a computer, choose <i>Online meeting</i>, pick the meeting tab and tick &ldquo;Also share tab audio&rdquo;. Headphones give the cleanest result.</p>
        <p><b className="text-slate-800">Fixing a note:</b> type what to add or change in &ldquo;Add details or ask for changes&rdquo; under the note, or use Edit.</p>
        <p><b className="text-slate-800">Your data:</b> notes are stored in Australia (Sydney); recordings are deleted right after transcription. See <a href="/privacy" className="text-violet-700 underline">Privacy</a>.</p>
      </div>
    </div>
  );
}
