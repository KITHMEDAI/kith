/**
 * lib/workspace/embed.ts
 *
 * Embedding helpers with no Next.js server dependencies, so they can be used
 * by API routes and by the eval harness alike.
 */
import { embedQuery } from '@/lib/embeddings';

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))]).catch(() => null);
}

/** Query embedding that never blocks search for long — null means "use keyword fallback". */
export async function embedQueryFast(q: string): Promise<number[] | null> {
  return withTimeout(embedQuery(q), 4000);
}
