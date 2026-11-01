import { ImageResponse } from 'next/og';

// Link preview for Kith Workspace pages (served at /opengraph-image via the
// workspace rewrite). The therapist edition keeps app/opengraph-image.tsx.
export const runtime = 'edge';
export const alt = 'Kith Workspace: talk for two minutes, get the note';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const uses = ['NDIS shift notes', 'Aged care notes', 'Incident reports', 'Site diaries', 'Handovers', 'Meeting minutes'];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '72px 80px', backgroundImage: 'linear-gradient(160deg, #1e0d4e 0%, #16083a 60%, #0f2a1e 100%)', color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: '#c4b5fd' }}>Kith Workspace</div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          Talk for two minutes. Get the note.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 40, gap: 14 }}>
          {uses.map(u => (
            <div key={u} style={{ display: 'flex', fontSize: 26, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}>{u}</div>
          ))}
        </div>
        <div style={{ display: 'flex', marginTop: 44, fontSize: 26, color: '#a7f3d0' }}>AI note taker · Built in Australia · Free during early access</div>
      </div>
    ),
    { ...size },
  );
}
