export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-7 w-24 rounded-lg bg-white/40" />
      <div className="space-y-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="rounded-lg bg-white/40 p-4 space-y-2">
            <div className="h-4 w-48 rounded bg-white/30" />
            <div className="h-3 w-full rounded bg-white/20" />
            <div className="h-3 w-2/3 rounded bg-white/20" />
          </div>
        ))}
      </div>
    </div>
  );
}
