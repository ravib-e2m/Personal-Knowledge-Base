import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) {
    console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  return url;
}

function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!key) {
    console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase client operations may fail.');
  }
  return key;
}

function getSupabaseServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) {
    console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Server-only Supabase operations will fail.');
  }
  return key;
}

/**
 * Creates a Supabase client that respects RLS by attaching the user's Clerk token
 */
export function createSupabaseUserClient(clerkToken?: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: clerkToken
        ? {
            Authorization: `Bearer ${clerkToken}`,
          }
        : {},
    },
  });
}

/**
 * Creates a standard anon Supabase client
 */
export function getAnonSupabaseClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey());
}

/**
 * Creates a Supabase client using the service role key (bypasses RLS)
 * ONLY use this on the server side for system operations (like user creation/onboarding sync)
 */
export function getServiceRoleSupabaseClient() {
  const serviceKey = getSupabaseServiceKey();
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined. Service role client cannot be initialized.');
  }
  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
