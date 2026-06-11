'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client used in Client Components.
 * Handles the auth session via cookies so the server can read it too.
 */
export function getBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
