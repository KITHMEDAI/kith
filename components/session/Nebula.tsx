'use client';

// Ambient "listening" visual — drifting, colour-shifting clouds over black,
// with a central glow that brightens when speech is actively coming in
// (Gemini-Live style: a calm, luminous presence that's always there while
// recording, not just a decorative strip).
export default function Nebula({ active = false, label = 'Listening' }: { active?: boolean; label?: string }) {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#000' }}>
      <div className="neb neb-a" />
      <div className="neb neb-b" />
      <div className="neb neb-c" />
      <div className="neb neb-d" />
      <div className={`neb-core ${active ? 'neb-core-active' : ''}`} />

      {/* subtle star speckle */}
      <div className="neb-stars" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" style={{ animation: `neb-pulse ${active ? '0.9s' : '1.8s'} ease-in-out infinite` }} />
          {label}
        </span>
      </div>

      <style>{`
        .neb { position:absolute; border-radius:50%; filter:blur(56px); opacity:.8; mix-blend-mode:screen; }
        .neb-a { width:42%; height:42%; min-width:220px; min-height:220px; background:radial-gradient(circle, #8b5cf6, transparent 68%); top:-8%; left:-8%; animation:neb-a 10s ease-in-out infinite alternate; }
        .neb-b { width:40%; height:40%; min-width:200px; min-height:200px; background:radial-gradient(circle, #2563eb, transparent 68%); bottom:-10%; left:32%; animation:neb-b 12s ease-in-out infinite alternate; }
        .neb-c { width:38%; height:38%; min-width:190px; min-height:190px; background:radial-gradient(circle, #10b981, transparent 68%); top:-6%; right:-8%; animation:neb-c 14s ease-in-out infinite alternate; }
        .neb-d { width:30%; height:30%; min-width:160px; min-height:160px; background:radial-gradient(circle, #ec4899, transparent 70%); bottom:-8%; left:2%; animation:neb-a 16s ease-in-out infinite alternate-reverse; }
        .neb-core {
          position:absolute; top:50%; left:50%; width:38%; height:38%; min-width:180px; min-height:180px;
          transform:translate(-50%,-50%); border-radius:50%; mix-blend-mode:screen;
          background:radial-gradient(circle, rgba(255,255,255,0.18), rgba(139,92,246,0.10) 45%, transparent 72%);
          animation: neb-breathe 4s ease-in-out infinite;
          transition: opacity 0.4s ease;
        }
        .neb-core-active { animation: neb-breathe-active 1.1s ease-in-out infinite; }
        .neb-stars { position:absolute; inset:0; background-image:
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.5), transparent),
            radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,.4), transparent),
            radial-gradient(1px 1px at 45% 80%, rgba(255,255,255,.35), transparent),
            radial-gradient(1px 1px at 85% 25%, rgba(255,255,255,.4), transparent),
            radial-gradient(1px 1px at 15% 65%, rgba(255,255,255,.3), transparent),
            radial-gradient(1px 1px at 60% 15%, rgba(255,255,255,.35), transparent);
          opacity:.6; }
        @keyframes neb-a { from { transform:translate(0,0) scale(1); }   to { transform:translate(60px,40px) scale(1.35); } }
        @keyframes neb-b { from { transform:translate(0,0) scale(1.1); } to { transform:translate(-55px,-35px) scale(.85); } }
        @keyframes neb-c { from { transform:translate(0,0) scale(1); }   to { transform:translate(-45px,55px) scale(1.25); } }
        @keyframes neb-pulse { 0%,100% { opacity:1; transform:scale(1);} 50% { opacity:.4; transform:scale(.7);} }
        @keyframes neb-breathe { 0%,100% { opacity:.55; transform:translate(-50%,-50%) scale(1); } 50% { opacity:.85; transform:translate(-50%,-50%) scale(1.12); } }
        @keyframes neb-breathe-active { 0%,100% { opacity:.8; transform:translate(-50%,-50%) scale(1.05); } 50% { opacity:1; transform:translate(-50%,-50%) scale(1.25); } }
      `}</style>
    </div>
  );
}
