import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Placeholder URL used in mock mode — Supabase client is constructed but never
// actually called, so these dummy values are safe.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Next.js's App Router extends global fetch() to cache GET requests by
// default. supabase-js's REST calls are plain fetches with no cache option
// set, so without this override Next silently caches PostgREST responses —
// a page can keep serving the data that existed on its FIRST ever request
// (e.g. "0 patients") forever after, even though the underlying rows changed.
// Force every Supabase call to bypass that cache.
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components — only works in Server Actions/Route Handlers
          }
        },
      },
      global: { fetch: noStoreFetch },
    }
  );
}

export function createServiceRoleClient() {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
      global: { fetch: noStoreFetch },
    }
  );
}
