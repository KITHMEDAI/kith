import KithMark from './KithMark';

// Combined logo + wordmark: the K mark IS the "K" of the name, with "ITH"
// set tight against it so it reads "KITH". Color and font-size are inherited
// from `className` (the "ITH" text), while the K is painted with the brand
// violet gradient. Gradient stops/id are tunable so the K stays visible on
// both dark and light backgrounds.
export default function KithLockup({
  markSize = 30,
  className = '',
  gradientId = 'kith-lockup-grad',
  gradientFrom = '#c4b5fd',
  gradientTo = '#7c3aed',
}: {
  markSize?: number;
  className?: string;
  gradientId?: string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  return (
    <span className={`inline-flex items-center font-bold ${className}`}>
      <KithMark size={markSize} gradient gradientId={gradientId} gradientFrom={gradientFrom} gradientTo={gradientTo} />
      {/* Pull "ITH" in to close the mark's built-in right padding so the
          letters sit flush against the K. */}
      <span className="tracking-tight" style={{ marginLeft: -markSize * 0.16 }}>ITH</span>
    </span>
  );
}
