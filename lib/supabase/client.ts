import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export function createClientSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Alias used in session page
export { createClientSupabaseClient as createClient };
