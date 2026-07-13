'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  requiredPlan: 'pro' | 'ultra';
  featureLabel: string; // e.g. "WhatsApp & SMS messaging to patients"
  children: React.ReactNode; // the visible locked trigger (icon + label)
  className?: string;
}

const PLAN_NAME: Record<Props['requiredPlan'], string> = { pro: 'Pro', ultra: 'Ultra' };
const PLAN_PRICE: Record<Props['requiredPlan'], string> = { pro: '$20/mo', ultra: '$50/mo' };

// Shared "locked feature" affordance — shows an inline upgrade card naming the
// SPECIFIC plan and price that unlocks this exact feature. Click-to-open,
// click-outside-to-close (not hover): a hover popover here has a dead zone
// between the trigger and the card below it, so moving the mouse down to
// actually click "Enable X" closes the popover first. Click keeps it open
// until the doctor either clicks the upgrade link or clicks away.
export default function LockedFeatureButton({ requiredPlan, featureLabel, children, className }: Props) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [show]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setShow(s => !s)} className={className}>
        {children}
      </button>
      {show && (
        // Centered under the trigger (not left-0) and capped to the viewport
        // width: this button shows up in narrow contexts (a ~340px-wide
        // booking dialog, a right-hand grid column), where a left-anchored
        // fixed-width card routinely overflowed past the dialog's own edge —
        // which, combined with overflow-y-auto on the scroll container above,
        // silently produced a horizontal scrollbar (see the fix there too).
        <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-64 max-w-[calc(100vw-2.5rem)] rounded-xl p-4 shadow-xl text-left"
          style={{ background: '#0f172a', border: '1px solid rgba(139,92,246,0.35)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-violet-400 flex-none" />
            <p className="text-sm font-semibold text-white">Requires {PLAN_NAME[requiredPlan]}</p>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            {featureLabel} is available on the {PLAN_NAME[requiredPlan]} plan ({PLAN_PRICE[requiredPlan]}).
          </p>
          <a href={`/settings/billing?highlight=${requiredPlan}`}
            className="block text-center rounded-lg py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            Enable {PLAN_NAME[requiredPlan]}
          </a>
        </div>
      )}
    </div>
  );
}
