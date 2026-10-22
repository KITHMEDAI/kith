import Link from 'next/link';

export const metadata = { title: 'Terms' };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-7 font-semibold text-slate-900">{children}</h2>;
}

export default function WorkspaceTerms() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-slate-700">
      <Link href="/" className="text-violet-700 hover:underline">← Back</Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Terms of use</h1>
      <p className="mt-2 text-slate-500">Kith Workspace pilot · last updated 22 October 2026</p>

      <p className="mt-4">These terms apply to your use of Kith Workspace, operated by KITH, Brookfield, Bengaluru, Karnataka 560037, India (&quot;Kith&quot;, &quot;we&quot;). By creating an account or using the service you agree to them and to our <Link href="/privacy" className="text-violet-700 underline">Privacy Policy</Link>.</p>

      <H>The service</H>
      <p className="mt-1">Kith turns recordings and typed notes into structured notes using AI, and lets you search and ask questions about your own notes. It is a pilot: features may change, and we may pause or end the pilot with notice where we can.</p>

      <H>Your responsibilities</H>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li><b>Consent and authority.</b> Get the agreement of everyone you record, and only record or enter information you are allowed to collect and share with a service like Kith (including any consent your organisation or the people involved require).</li>
        <li><b>Check every note.</b> AI can miss, mishear or misstate things. You are responsible for reviewing notes before relying on them, sharing them or filing them as records. Kith does not give medical, legal, financial or other professional advice.</li>
        <li><b>Keep your account secure.</b> Use a strong password, don&apos;t share your sign-in, and tell us straight away if you think someone else has accessed your account.</li>
      </ul>

      <H>Acceptable use</H>
      <p className="mt-1">Don&apos;t use Kith to break the law or anyone&apos;s rights, record people without the agreement the law requires, upload malicious files, try to access other people&apos;s accounts or data, probe or overload the service, get around usage limits, or resell it. We apply fair-use limits to keep costs and the service stable, and may suspend accounts that break these terms.</p>

      <H>Your content</H>
      <p className="mt-1">You own what you put into Kith and the notes it writes for you. You give us permission to store and process that content only to provide the service to you (as described in the Privacy Policy). You can delete it at any time.</p>

      <H>Availability and liability</H>
      <p className="mt-1">During the pilot the service is provided &quot;as is&quot;. We work to keep it available and your data safe, but we can&apos;t promise it will be uninterrupted or error-free. Keep your own copy of anything critical. To the extent the law allows, we are not liable for indirect or consequential loss. Nothing in these terms excludes rights you have under the Australian Consumer Law that can&apos;t be excluded.</p>

      <H>Ending your use</H>
      <p className="mt-1">You can stop using Kith and ask us to delete your account at any time. If we end the pilot, we will give you reasonable notice and a chance to copy your notes.</p>

      <H>Changes and contact</H>
      <p className="mt-1">We may update these terms; if a change is significant we will tell you in the app or by email. Questions: <a href="/help" className="text-violet-700 underline">kithmedai@gmail.com</a>.</p>
    </div>
  );
}
