export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-white/40" />
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-24 rounded-lg bg-white/40" />)}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="h-56 rounded-lg bg-white/40" />
        <div className="h-56 rounded-lg bg-white/40" />
      </div>
    </div>
  );
}
