// Kith brand mark: a letter "K" whose upper diagonal stroke is a microphone.
// By default it inherits color from `currentColor`. Pass `gradient` to paint it
// in the brand violet gradient (#c4b5fd → #7c3aed) used by the original logo.
export default function KithMark({
  className,
  size = 28,
  gradient = false,
  gradientId = 'kith-mark-grad',
  gradientFrom = '#c4b5fd',
  gradientTo = '#7c3aed',
}: {
  className?: string;
  size?: number;
  gradient?: boolean;
  gradientId?: string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const paint = gradient ? `url(#${gradientId})` : 'currentColor';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {gradient && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
      )}

      {/* Vertical stem of the K */}
      <rect x="6.5" y="5" width="4" height="22" rx="2" fill={paint} />

      {/* Lower diagonal arm of the K */}
      <line x1="10" y1="16.5" x2="23" y2="27" stroke={paint} strokeWidth="4" strokeLinecap="round" />

      {/* Upper diagonal arm = microphone capsule (the "/" of the K) */}
      <g transform="rotate(45 17 11)">
        <rect x="13.5" y="3.5" width="7" height="15" rx="3.5" fill={paint} />
        {/* Mic grill lines */}
        <line x1="15.2" y1="7" x2="18.8" y2="7" stroke="white" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="15.2" y1="9.2" x2="18.8" y2="9.2" stroke="white" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="15.2" y1="11.4" x2="18.8" y2="11.4" stroke="white" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </svg>
  );
}
