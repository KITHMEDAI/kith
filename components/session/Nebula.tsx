'use client';

// Animated nebula for the "listening" state — drifting purple/blue/green clouds
// over a pitch-black background. Pure CSS; no deps.
export default function Nebula({ height = 150, label = 'Listening' }: { height?: number; label?: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height, background: '#000' }}>
      <div className="neb neb-a" />
      <div className="neb neb-b" />
      <div className="neb neb-c" />
      <div className="neb neb-d" />

      {/* subtle star speckle */}
      <div className="neb-stars" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80">
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" style={{ animation: 'neb-pulse 1.4s ease-in-out infinite' }} />
          {label}
        </span>
      </div>

      <style>{`
        .neb { position:absolute; border-radius:50%; filter:blur(42px); opacity:.85; mix-blend-mode:screen; }
        .neb-a { width:240px; height:240px; background:radial-gradient(circle, #8b5cf6, transparent 68%); top:-60px; left:-30px; animation:neb-a 9s ease-in-out infinite alternate; }
        .neb-b { width:220px; height:220px; background:radial-gradient(circle, #2563eb, transparent 68%); bottom:-70px; left:38%; animation:neb-b 11s ease-in-out infinite alternate; }
        .neb-c { width:200px; height:200px; background:radial-gradient(circle, #10b981, transparent 68%); top:-20px; right:-40px; animation:neb-c 13s ease-in-out infinite alternate; }
        .neb-d { width:160px; height:160px; background:radial-gradient(circle, #6d28d9, transparent 70%); bottom:-30px; left:5%; animation:neb-a 15s ease-in-out infinite alternate; }
        .neb-stars { position:absolute; inset:0; background-image:
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.5), transparent),
            radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,.4), transparent),
            radial-gradient(1px 1px at 45% 80%, rgba(255,255,255,.35), transparent),
            radial-gradient(1px 1px at 85% 25%, rgba(255,255,255,.4), transparent);
          opacity:.6; }
        @keyframes neb-a { from { transform:translate(0,0) scale(1); }   to { transform:translate(60px,40px) scale(1.35); } }
        @keyframes neb-b { from { transform:translate(0,0) scale(1.1); } to { transform:translate(-55px,-35px) scale(.85); } }
        @keyframes neb-c { from { transform:translate(0,0) scale(1); }   to { transform:translate(-45px,55px) scale(1.25); } }
        @keyframes neb-pulse { 0%,100% { opacity:1; transform:scale(1);} 50% { opacity:.4; transform:scale(.7);} }
      `}</style>
    </div>
  );
}
