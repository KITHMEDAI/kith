export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded-lg bg-white/40" />
        <div className="h-9 w-36 rounded-lg bg-white/40" />
      </div>
      <div className="flex gap-3">
        <div className="h-9 w-64 rounded-lg bg-white/40" />
        <div className="h-9 w-36 rounded-lg bg-white/40" />
      </div>
      <div className="rounded-lg bg-white/40 overflow-hidden">
        <div className="h-10 bg-white/20" />
        {[0,1,2,3,4].map(i => <div key={i} className="h-14 border-t border-white/20" />)}
      </div>
    </div>
  );
}
