'use client';

import { useEffect, useRef } from 'react';

// Cloudflare Turnstile widget (see lib/workspace/captcha.ts). Renders nothing
// when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset. Tokens are single-use: call
// the `reset` handed to onReady after each submit.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error('captcha script')); };
    document.head.appendChild(s);
  });
  return loading;
}

export default function Turnstile({ onToken, onReady }: { onToken: (token: string) => void; onReady?: (reset: () => void) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let id: string | null = null;
    let gone = false;
    loadScript().then(() => {
      if (gone || !el.current || !window.turnstile) return;
      id = window.turnstile.render(el.current, {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: 'interaction-only',
        callback: (t: string) => cb.current(t),
        'expired-callback': () => cb.current(''),
        'error-callback': () => cb.current(''),
      });
      onReady?.(() => { if (id) { cb.current(''); window.turnstile?.reset(id); } });
    }).catch(() => {});
    return () => { gone = true; if (id) window.turnstile?.remove(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={el} className="flex justify-center" />;
}
