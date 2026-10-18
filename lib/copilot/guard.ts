/**
 * lib/copilot/guard.ts
 *
 * The live call copilot (/copilot) is a LOCAL-ONLY founder tool: it hands the
 * browser the Deepgram key and reads private partnership docs from disk. It
 * must never be reachable on kith.space, so every copilot route checks this
 * first and 404s otherwise.
 */
export function copilotAllowed(req: Request): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const host = req.headers.get('host') || '';
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}
