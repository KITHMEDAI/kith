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

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div style={{ background: BG }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-purple-200/60 hover:text-white transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Kith
          </Link>
          <KithLockup markSize={24} className="text-[17px] text-white" gradientId="kith-terms" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-6">Terms of Service</h1>
          <p className="text-xs text-purple-200/50 mt-2">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-xl px-4 py-3 mb-8 text-xs text-amber-800 bg-amber-50 border border-amber-200">
          <strong>Draft notice:</strong> these terms were prepared to accurately describe how Kith actually works
          today. They have not yet been reviewed by a lawyer. Do not treat them as final legal advice — have them
          reviewed before relying on them for compliance purposes.
        </div>

        <P>
          These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) govern your use of Kith, a clinical workspace
          application for mental health practitioners (the &ldquo;<strong>Service</strong>&rdquo;), operated by Anurag
          Chaudhary, a sole proprietor based in India (&ldquo;<strong>Kith</strong>&rdquo;, &ldquo;we&rdquo;). By creating an account, you
          agree to these Terms and to our <Link href="/privacy" className="text-violet-600 hover:underline">Privacy
          Policy</Link>.
        </P>

        <H2>1. Who can use Kith</H2>
        <P>
          Kith is intended for licensed or practicing mental health professionals (therapists, psychologists,
          counsellors, psychiatrists, and similar) managing their own patients/clients. You must be at least 18 years
          old and legally able to enter into these Terms. You are responsible for holding whatever professional
          license or qualification your jurisdiction requires to provide the clinical services you document in Kith
          — Kith does not verify professional credentials.
        </P>

        <H2>2. Your account</H2>
        <P>
          You are responsible for the accuracy of the information you provide, for keeping your login credentials
          confidential, and for all activity under your account. Tell us immediately if you suspect unauthorised
          access.
        </P>

        <H2>3. What Kith is — and isn&rsquo;t</H2>
        <P>
          Kith transcribes sessions and uses AI to draft clinical notes, suggestions, and homework based on that
          transcript. <strong>AI-generated content is a draft for your professional review, not a finished clinical
          record and not a substitute for your own clinical judgment.</strong> You are responsible for reviewing,
          correcting, and finalising anything Kith generates before relying on it or sharing it with a patient or
          colleague. Kith does not provide medical or psychiatric advice, does not diagnose, and does not replace
          your professional responsibilities to your patients.
        </P>

        <H2>4. Recording &amp; patient consent</H2>
        <P>
          Kith records and transcribes sessions at your direction — either via your device&rsquo;s microphone
          (in-person sessions) or via a bot that joins an online video call. <strong>You are solely responsible for
          informing your patient that the session will be recorded and processed by AI tools, and for obtaining any
          consent required by your jurisdiction, licensing body, or professional code of conduct before you begin.
          </strong> Do not use Kith to record a session where you have not obtained the consent you are legally or
          professionally required to obtain.
        </P>

        <H2>5. Subscription plans &amp; billing</H2>
        <P>
          Kith offers a Free plan and paid plans (currently Pro and Ultra) with different session limits, durations,
          and features, described on our <Link href="/#pricing" className="text-violet-600 hover:underline">pricing
          page</Link>. Paid plans are billed in advance on a recurring basis through our payment processor, Razorpay,
          and renew automatically until cancelled. You can cancel anytime from Settings — your plan remains active
          until the end of the current billing period, after which your account reverts to the Free plan&rsquo;s
          limits rather than being locked out. We do not provide prorated refunds for early cancellation, except
          where required by law.
        </P>

        <H2>6. Acceptable use</H2>
        <P>You agree not to:</P>
        <ul className="list-disc pl-5 mb-4">
          <LI>Use Kith for any patient without the consent described in Section 4.</LI>
          <LI>Attempt to reverse-engineer, scrape, or interfere with the Service or its security.</LI>
          <LI>Use the Service for any unlawful purpose or in a way that infringes anyone else&rsquo;s rights.</LI>
          <LI>Share your account credentials with anyone else.</LI>
        </ul>

        <H2>7. Data ownership</H2>
        <P>
          As between you and Kith, you (or your practice) own the clinical data you and your patients generate
          through the Service — Kith processes it on your behalf as described in our Privacy Policy and does not
          claim ownership over it. You can export or delete your data at any time; see our Privacy Policy for
          details.
        </P>

        <H2>8. Disclaimers</H2>
        <P>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT TRANSCRIPTION OR AI-GENERATED CONTENT WILL BE ERROR-FREE OR THAT
          THE SERVICE WILL BE UNINTERRUPTED. YOU ARE RESPONSIBLE FOR REVIEWING ALL AI-GENERATED CONTENT BEFORE
          RELYING ON IT, PER SECTION 3.
        </P>

        <H2>9. Limitation of liability</H2>
        <P>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, KITH WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR
          CONSEQUENTIAL DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
          OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12
          MONTHS BEFORE THE CLAIM AROSE.
        </P>

        <H2>10. Termination</H2>
        <P>
          You may stop using Kith and delete your account at any time from Settings. We may suspend or terminate an
          account that violates these Terms, misuses the Service, or where required by law, with notice where
          reasonably possible.
        </P>

        <H2>11. Changes to these Terms</H2>
        <P>
          We may update these Terms as the Service evolves. Material changes will be reflected by updating the
          &ldquo;Last updated&rdquo; date above, and, where appropriate, communicated directly to you.
        </P>

        <H2>12. Governing law</H2>
        <P>
          These Terms are governed by the laws of India, without regard to conflict-of-law principles. Any dispute
          arising from these Terms or the Service will be subject to the exclusive jurisdiction of the courts of
          India.
        </P>

        <H2>13. Contact</H2>
        <P>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:hello@kith.space" className="text-violet-600 hover:underline">hello@kith.space</a>.
        </P>
      </div>
    </div>
  );
}
