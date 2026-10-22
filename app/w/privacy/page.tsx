import Link from 'next/link';

export const metadata = { title: 'Privacy' };

// Keep every statement here true to what the code does (security audit
// 2026-10-22). Change the page whenever data handling changes.

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-7 font-semibold text-slate-900">{children}</h2>;
}

export default function WorkspacePrivacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-slate-700">
      <Link href="/" className="text-violet-700 hover:underline">← Back</Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-slate-500">Kith Workspace pilot · last updated 22 October 2026</p>

      <p className="mt-4">This policy explains how Kith Workspace (&quot;Kith&quot;, &quot;we&quot;) handles personal information, in line with the Australian Privacy Principles. Kith is operated by KITH, Brookfield, Bengaluru, Karnataka 560037, India. Contact: <a href="/help" className="text-violet-700 underline">kithmedai@gmail.com</a>.</p>

      <H>What we collect</H>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li><b>Your account:</b> name, email, optional phone number, your field of work, note preferences, sign-in details (password stored only as a secure hash by our authentication provider, or your Google account if you use Google sign-in), and when you accepted these terms and confirmed recording consent.</li>
        <li><b>What you give us to write notes:</b> text you type or paste, live transcripts of recordings, and the audio of recordings (kept only briefly, see below).</li>
        <li><b>What Kith produces:</b> the notes, a search index of them, and the before/after text of edits you make (used to match your style in future notes of the same type).</li>
      </ul>
      <p className="mt-2">Notes can contain other people&apos;s personal information, including <b>sensitive information such as health or disability details</b>. You must only record or enter information you are authorised to collect and share this way, with any consent your work requires. We handle it only to provide the service to you.</p>

      <H>Where it&apos;s stored and how it&apos;s protected</H>
      <p className="mt-1">Your account, notes and recordings are stored in Australia (Sydney region) with Supabase, and the app runs on Vercel in Sydney. All data is encrypted in transit (HTTPS) and at rest by our storage provider. The text or transcript you provide is additionally encrypted by Kith before it is stored. Each account can only ever see its own notes.</p>

      <H>Recordings</H>
      <p className="mt-1">When you stop a recording, its audio is uploaded to private storage in Sydney, transcribed again in full for accuracy, and then <b>deleted</b>. If a recording can&apos;t be processed (for example the page was closed mid-upload), it is deleted automatically by a daily clean-up, so it is never kept for more than about a day. You are responsible for getting the agreement of everyone you record; Kith asks you to confirm this before recording.</p>

      <H>Service providers, including outside Australia</H>
      <p className="mt-1">To provide the service we use these providers. Some process data in the United States during this pilot (we plan to move AI processing to Australian regions):</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li><b>Anthropic</b> (USA): writes and updates notes and answers Ask questions from your input and notes. Anthropic does not train its models on this data and may keep it for a limited period (about 30 days) for safety monitoring.</li>
        <li><b>Deepgram</b> (USA): speech-to-text for live and uploaded recordings. We send every request with Deepgram&apos;s model-training opt-out.</li>
        <li><b>Voyage AI</b> (USA): turns finished notes into a search index. We use its option not to use our data for training.</li>
        <li><b>Supabase</b> (Sydney): database, sign-in and file storage. <b>Vercel</b> (Sydney functions): hosting; keeps short-lived technical request logs, not your note content.</li>
        <li><b>Resend</b> (USA): sends account emails such as your sign-up code (your email address only). <b>Google</b>: only if you choose Continue with Google (your name and email).</li>
      </ul>
      <p className="mt-2">Our small team is based in India. We access account data only when needed to provide support, keep the service secure or fix a problem, and never to read your notes for any other purpose. We don&apos;t sell personal information, use it for advertising, or add analytics or tracking to the app.</p>

      <H>How long we keep it</H>
      <p className="mt-1">Notes and edits are kept until you delete them or your account. Deleting a note removes it, its search index and its edit history immediately. Copies may remain in our providers&apos; encrypted backups for a short period (up to about 7 days) before they are overwritten.</p>

      <H>Access, correction and deletion</H>
      <p className="mt-1">You can view, edit, copy, download (print to PDF) and delete your notes in the app at any time, and update your details in Profile. To get a copy of all your data, correct something, or delete your account and everything in it, email us; we will respond within 30 days.</p>

      <H>Data breaches</H>
      <p className="mt-1">If we have a data breach that is likely to cause serious harm, we will notify you and, where required, the Office of the Australian Information Commissioner (OAIC).</p>

      <H>Questions and complaints</H>
      <p className="mt-1">Email <a href="/help" className="text-violet-700 underline">kithmedai@gmail.com</a>. We aim to reply within 5 business days and resolve complaints within 30 days. If you&apos;re not satisfied, you can complain to the OAIC at <a href="https://www.oaic.gov.au" className="text-violet-700 underline" rel="noopener noreferrer" target="_blank">oaic.gov.au</a>.</p>

      <p className="mt-8 text-slate-500">See also the <Link href="/terms" className="text-violet-700 underline">Terms of use</Link>.</p>
    </div>
  );
}
