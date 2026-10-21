import Link from 'next/link';

export const metadata = { title: 'Privacy' };

export default function WorkspacePrivacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-slate-700">
      <Link href="/" className="text-violet-700 hover:underline">← Back</Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Privacy</h1>
      <p className="mt-2 text-slate-500">Kith Workspace pilot · last updated October 2026</p>

      <h2 className="mt-6 font-semibold text-slate-900">What we store</h2>
      <p className="mt-1">Your name, email, optional phone number, your field, and the notes you create (the text or transcript you provide and the note Kith writes from it).</p>

      <h2 className="mt-6 font-semibold text-slate-900">Where it&apos;s stored</h2>
      <p className="mt-1">Your account and notes are stored in Australia (Sydney region), encrypted in transit and at rest. Your input text/transcript is additionally encrypted at the application level.</p>

      <h2 className="mt-6 font-semibold text-slate-900">Processing outside Australia</h2>
      <p className="mt-1">During this pilot, AI note writing (Anthropic), live speech-to-text (Deepgram) and search indexing (Voyage AI) are processed by providers in the United States. These providers do not use your data to train their models. We plan to move this processing to Australian regions. Please don&apos;t enter information you are not permitted to process this way.</p>

      <h2 className="mt-6 font-semibold text-slate-900">Recording consent</h2>
      <p className="mt-1">You are responsible for getting the agreement of everyone you record. Kith asks you to confirm this before your first recording.</p>

      <h2 className="mt-6 font-semibold text-slate-900">Your control</h2>
      <p className="mt-1">You can edit or delete any note at any time. To delete your account and all data, email <a href="/help" className="text-violet-700 underline">kithmedai@gmail.com</a>.</p>

      <h2 className="mt-6 font-semibold text-slate-900">Help &amp; contact</h2>
      <p className="mt-1">Questions, feedback or problems: <a href="/help" className="text-violet-700 underline">kithmedai@gmail.com</a>. Business: KITH, Brookfield, Bengaluru, Karnataka 560037, India.</p>
    </div>
  );
}
