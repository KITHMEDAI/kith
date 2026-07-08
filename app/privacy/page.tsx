import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import KithLockup from '@/components/brand/KithLockup';

const BG = 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)';
const LAST_UPDATED = 'July 8, 2026';

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-foreground mt-10 mb-3">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-4">{children}</p>;
}
function LI({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-muted-foreground leading-relaxed mb-2">{children}</li>;
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div style={{ background: BG }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-purple-200/60 hover:text-white transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Kith
          </Link>
          <KithLockup markSize={24} className="text-[17px] text-white" gradientId="kith-privacy" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-6">Privacy Policy</h1>
          <p className="text-xs text-purple-200/50 mt-2">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-xl px-4 py-3 mb-8 text-xs text-amber-800 bg-amber-50 border border-amber-200">
          <strong>Draft notice:</strong> this policy was prepared to accurately describe how Kith actually works today. It has not yet been reviewed by a lawyer. Do not treat it as final legal advice — have it reviewed before relying on it for compliance purposes.
        </div>

        <P>
          This Privacy Policy explains how Kith (&ldquo;<strong>Kith</strong>&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, stores, and
          shares information through the Kith clinical workspace application (the &ldquo;Service&rdquo;). Kith is operated by
          Anurag Chaudhary, a sole proprietor based in India, until such time as a registered corporate entity is
          formed. This policy is written with reference to India&rsquo;s Digital Personal Data Protection Act, 2023
          (&ldquo;<strong>DPDP Act</strong>&rdquo;), and applies to anyone who creates a Kith account (&ldquo;<strong>Practitioner</strong>&rdquo;, &ldquo;you&rdquo;) or whose
          information a Practitioner enters into Kith as a patient/client (&ldquo;<strong>Patient</strong>&rdquo;).
        </P>

        <H2>1. Who is responsible for what</H2>
        <P>
          Kith is a tool that mental health practitioners use to manage their practice. For a Patient&rsquo;s clinical
          information, <strong>the Practitioner is the data fiduciary</strong> (the party who decides why and how the
          data is processed) — Kith acts as a <strong>data processor</strong>, handling that information only on the
          Practitioner&rsquo;s instructions and only to provide the Service. If you are a Patient with questions about
          your own clinical records, your practitioner — not Kith — is the right first point of contact, though we
          are glad to help route a request.
        </P>
        <P>
          For a Practitioner&rsquo;s own account information (name, email, phone, billing details), Kith is the data
          fiduciary.
        </P>

        <H2>2. What we collect</H2>
        <P><strong>Account &amp; practice information</strong> you provide at signup and afterward: name, work email,
          password (hashed by our authentication provider, never stored in plain text), phone number, clinic name and
          address, professional designation, and billing details processed by our payment provider.</P>
        <P><strong>Patient information entered by a Practitioner</strong>: name, contact details, date of birth,
          gender, diagnosis, therapy modality, medications, treatment goals, and any other clinical notes the
          Practitioner chooses to record.</P>
        <P><strong>Session content</strong>: audio is transcribed in real time and is not retained as an audio
          recording by Kith once transcribed (in-person sessions), except where an online session is recorded via a
          third-party meeting bot as described in Section 4, where the bot provider may briefly hold recording data
          before it is transcribed and discarded. Transcripts, AI-generated clinical notes, suggestions, and homework
          assignments are stored so the Practitioner can review and rely on them.</P>
        <P><strong>Usage and device information</strong>: log data, browser/device type, and general diagnostic
          information used to keep the Service running and secure.</P>
        <P>
          We do not knowingly collect information directly from Patients — all Patient information is entered by the
          Practitioner using the Service.
        </P>

        <H2>3. How we use information</H2>
        <ul className="list-disc pl-5 mb-4">
          <LI>To provide the core Service: transcription, AI-assisted clinical note generation, scheduling, and
            patient communication tools.</LI>
          <LI>To enforce the features and limits of your subscription plan.</LI>
          <LI>To send transactional communications (appointment reminders, billing receipts, service notices) and,
            with your permission, product updates.</LI>
          <LI>To maintain security, investigate abuse, and debug issues.</LI>
          <LI>To comply with legal obligations.</LI>
        </ul>
        <P>
          <strong>We do not sell personal data or clinical information, and we do not use Patient clinical content to
          train our own AI models.</strong> Where third-party AI providers are used (Section 4), we rely on their
          commercial API terms, which contractually exclude using submitted data to train their models.
        </P>

        <H2>4. AI processing &amp; sub-processors</H2>
        <P>Kith is built on top of the following third-party services, each of which processes a limited slice of
          data strictly to provide their part of the Service:</P>
        <ul className="list-disc pl-5 mb-4">
          <LI><strong>Anthropic (Claude)</strong> — receives the session transcript and clinical context to generate
            SOAP notes, suggestions, and homework. Does not receive account/billing information.</LI>
          <LI><strong>Deepgram</strong> — receives live microphone audio during in-person sessions to produce a
            real-time transcript.</LI>
          <LI><strong>Recall.ai</strong> — for online sessions, joins the video call as a recording bot and returns a
            transcript; retains the underlying recording only as long as needed to produce that transcript.</LI>
          <LI><strong>Google (Calendar API)</strong> — reads appointment times from a Practitioner&rsquo;s connected
            Google Calendar and, for video sessions, creates a Google Meet link. Kith never reads unrelated emails,
            documents, or personal calendar entries.</LI>
          <LI><strong>Twilio</strong> — delivers WhatsApp/SMS messages a Practitioner chooses to send to a Patient.</LI>
          <LI><strong>Resend</strong> — delivers transactional email.</LI>
          <LI><strong>Razorpay</strong> — processes subscription payments; Kith never receives or stores full card
            numbers.</LI>
          <LI><strong>Supabase</strong> — our database, authentication, and file storage provider.</LI>
          <LI><strong>Vercel</strong> — hosts the application.</LI>
        </ul>
        <P>
          Some of these providers process data on servers outside India. Where that happens, it is solely to deliver
          the specific function described above (e.g., generating a note, sending a message), under that provider&rsquo;s
          own data-processing terms.
        </P>

        <H2>5. Security</H2>
        <P>
          Data is encrypted in transit (TLS) and at rest at the infrastructure level via our database provider.
          Access to Patient data is restricted per-Practitioner using row-level security, so one Practitioner&rsquo;s
          account cannot read another&rsquo;s patients or sessions. We are working toward additional application-level
          encryption of clinical content as a further safeguard. No method of transmission or storage is 100% secure,
          and we cannot guarantee absolute security.
        </P>

        <H2>6. Data retention</H2>
        <P>
          We retain account and Patient data for as long as the Practitioner&rsquo;s account is active, since clinical
          continuity depends on historical session notes remaining available. If a Practitioner deletes their
          account (available from Settings), their account, patients, sessions, notes, and appointments are
          permanently deleted, other than records we are legally required to retain (e.g., billing records for tax
          purposes).
        </P>

        <H2>7. Your rights</H2>
        <P>Consistent with the DPDP Act, you may:</P>
        <ul className="list-disc pl-5 mb-4">
          <LI>Request a summary of the personal data we hold about you.</LI>
          <LI>Request correction or completion of inaccurate data.</LI>
          <LI>Withdraw consent and request erasure of your data, subject to Section 6.</LI>
          <LI>Raise a grievance or complaint about how your data has been handled.</LI>
        </ul>
        <P>
          Practitioners can exercise most of these rights directly from within the app (editing patient records,
          exporting notes, deleting the account). For anything else, or if you are a Patient, contact{' '}
          <a href="mailto:hello@kith.space" className="text-violet-600 hover:underline">hello@kith.space</a> and we
          will respond within a reasonable time.
        </P>

        <H2>8. Your responsibility as a Practitioner</H2>
        <P>
          Using Kith to record or transcribe a session means that session&rsquo;s audio is being processed by the
          third-party providers listed in Section 4. <strong>You are responsible for informing your patient that the
          session is being recorded and AI-assisted, and for obtaining whatever consent is required under your
          jurisdiction and professional code of conduct before you begin.</strong> Kith does not verify or manage
          patient consent on your behalf.
        </P>

        <H2>9. Children&rsquo;s data</H2>
        <P>
          Kith is intended for use by licensed/practicing mental health professionals, not by children. Patient
          records may relate to a minor if a Practitioner treats one, in which case the Practitioner is responsible
          for obtaining any parental/guardian consent required by law before entering that minor&rsquo;s information.
        </P>

        <H2>10. Changes to this policy</H2>
        <P>
          We may update this policy as the Service evolves. Material changes will be reflected by updating the
          &ldquo;Last updated&rdquo; date above, and, where appropriate, communicated directly to Practitioners.
        </P>

        <H2>11. Contact</H2>
        <P>
          Questions, requests, or grievances relating to this policy can be sent to{' '}
          <a href="mailto:hello@kith.space" className="text-violet-600 hover:underline">hello@kith.space</a>.
        </P>
      </div>
    </div>
  );
}
