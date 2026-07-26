import type { Metadata } from 'next';
import Link from 'next/link';
import KithLockup from '@/components/brand/KithLockup';
import SoapFormatterTool from '@/components/tools/SoapFormatterTool';

const title = 'Free SOAP & EMDR Note Formatter — Kith';
const description =
  'Paste rough session notes or a transcript excerpt and get back a structured SOAP or EMDR note instantly. Free, no signup required.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: 'https://kith.space/soap-formatter', siteName: 'Kith', type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

const BG = 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)';

export default function SoapFormatterPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: BG }}>
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 max-w-4xl mx-auto">
        <Link href="/">
          <KithLockup markSize={26} className="text-[18px] tracking-[0.04em] text-white"
            gradientId="kith-soap-tool" gradientFrom="#e9d5ff" gradientTo="#a78bfa" />
        </Link>
        <Link href="/register" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-purple-50 transition-colors shadow-sm">
          Get started free
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-6 pb-20 flex flex-col items-center">
        <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-purple-200 mb-6"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
          Free tool · No signup
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight mb-4 max-w-xl text-balance">
          Turn rough notes into a clean SOAP or EMDR note
        </h1>
        <p className="text-center text-sm sm:text-base text-purple-200/70 mb-10 max-w-lg">
          Paste what you jotted down (or a rough transcript excerpt) and see it structured
          into SOAP, or into target/SUD/VOC/phase for EMDR — the same AI that runs inside Kith.
        </p>

        <SoapFormatterTool />
      </div>
    </div>
  );
}
