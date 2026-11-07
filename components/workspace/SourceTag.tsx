'use client';
import { useEffect } from 'react';

// First-touch sign-up attribution for the public pages. Remembers, for 30
// days, the first page a visitor landed on and the site that sent them
// (hostname only, e.g. "google.com", or a utm_source). Onboarding copies it
// onto the new account (app_metadata.signup_source) so we can see whether
// search, guides or outreach bring users. No third-party tracker; disclosed
// on the Privacy page.
export default function SourceTag() {
  useEffect(() => {
    if (document.cookie.split('; ').some(c => c.startsWith('ws_src='))) return;
    const url = new URL(window.location.href);
    let from = url.searchParams.get('utm_source') || '';
    if (!from && document.referrer) {
      try {
        const h = new URL(document.referrer).hostname.replace(/^www\./, '');
        if (h !== url.hostname) from = h;
      } catch { /* ignore malformed referrer */ }
    }
    const value = `${url.pathname.slice(0, 120)}|${(from || 'direct').slice(0, 60)}`;
    document.cookie = `ws_src=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax; secure`;
  }, []);
  return null;
}
