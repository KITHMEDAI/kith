export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 rounded-lg bg-white/40" />
        <div className="h-9 w-40 rounded-lg bg-white/40" />
      </div>
      <div className="flex gap-2 border-b border-white/20 pb-0">
        {[0,1,2,3].map(i => <div key={i} className="h-8 w-20 rounded-t-lg bg-white/40" />)}
      </div>
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-white/30" />
        <div className="rounded-lg bg-white/40 overflow-hidden">
          {[0,1,2].map(i => <div key={i} className="h-16 border-t border-white/20 first:border-0" />)}
        </div>
      </div>
    </div>
  );
}
