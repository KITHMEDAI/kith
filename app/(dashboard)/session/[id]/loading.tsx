export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'linear-gradient(160deg,#1e0d4e,#16083a 60%,#0f2a1e)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full animate-pulse" style={{ background: 'rgba(139,92,246,0.3)' }} />
        <p className="text-purple-300/60 text-sm">Preparing session…</p>
      </div>
    </div>
  );
}
