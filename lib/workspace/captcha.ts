/**
 * lib/workspace/captcha.ts
 *
 * Cloudflare Turnstile for Kith Workspace's account forms (audit #19).
 * Off until both keys are set (NEXT_PUBLIC_TURNSTILE_SITE_KEY for the widget,
 * TURNSTILE_SECRET_KEY here), so nothing breaks before it is configured.
 *
 *   - Our own routes that create accounts or send codes (sign-up, password
 *     reset) verify the token here: they use the admin API, which Supabase's
 *     own CAPTCHA check doesn't cover.
 *   - Password sign-in goes straight to Supabase from the browser, so it is
 *     protected by Supabase's native CAPTCHA (Auth → Attack Protection →
 *     Turnstile, same secret); the form passes the token as `captchaToken`.
 */
export const CAPTCHA_ENABLED = !!process.env.TURNSTILE_SECRET_KEY;

/** True when the token is valid (or CAPTCHA is not configured). */
export async function verifyCaptcha(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token || token.length > 4096) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const j = await res.json() as { success?: boolean };
    return j.success === true;
  } catch {
    console.warn('[workspace] captcha verification unavailable');
    return false;
  }
}
