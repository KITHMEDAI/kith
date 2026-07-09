import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Kith — AI Clinical Workspace for Therapists';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)',
          position: 'relative',
        }}
      >
        {/* Glow accents, matching the homepage hero */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            left: -80,
            width: 420,
            height: 420,
            borderRadius: '50%',
            backgroundImage: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
            opacity: 0.5,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            right: -60,
            width: 420,
            height: 420,
            borderRadius: '50%',
            backgroundImage: 'radial-gradient(circle, #10b981, transparent 70%)',
            opacity: 0.4,
            display: 'flex',
          }}
        />

        {/* Logo mark */}
        <svg width="120" height="120" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="112" fill="#1e0d4e" />
          <rect x="82" y="72" width="46" height="200" rx="20" fill="#c4b5fd" />
          <line x1="122" y1="185" x2="248" y2="270" stroke="#c4b5fd" strokeWidth="44" strokeLinecap="round" />
          <g transform="rotate(45 168 110)">
            <rect x="148" y="46" width="48" height="118" rx="24" fill="#c4b5fd" />
          </g>
        </svg>

        {/* Wordmark */}
        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 72,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.02em',
          }}
        >
          KITH
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 32,
            color: '#c4b5fd',
            textAlign: 'center',
          }}
        >
          AI Clinical Workspace for Therapists
        </div>
      </div>
    ),
    { ...size }
  );
}
