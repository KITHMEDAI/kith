export default function Loading() {
  return (
    <div className="p-6 max-w-4xl space-y-5 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-white/30" />
      <div className="rounded-xl bg-white/30 h-24" />
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-white/30 h-32" />
        <div className="rounded-xl bg-white/30 h-32" />
      </div>
    </div>
  );
}
