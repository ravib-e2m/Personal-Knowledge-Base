import { getServiceRoleSupabaseClient } from './supabase';
import { getServerSupabaseClient } from './supabase-server';

/**
 * Thrown when there is no authenticated Supabase session on the request.
 * API routes translate this into a 401 response.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Resolves the application-level user UUID (the `users.id` primary key) for the
 * currently authenticated Supabase Auth user.
 *
 * On first login the Supabase Auth user is synced into the local `users` table.
 * The `users.clerk_id` column is reused to store the Supabase Auth user id
 * (`auth.users.id`) so we don't need a schema migration.
 *
 * Every API route calls this, which guarantees per-user data isolation: a user
 * can only ever see rows whose `user_id` matches their own resolved UUID.
 */
export async function getCurrentUserUuid(): Promise<string> {
  const supabaseAuth = await getServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  const authUserId = user.id;
  const email = user.email || `${authUserId}@users.noauth`;
  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    email.split('@')[0];
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    '';

  // Use the service-role client to upsert/lookup the profile row (bypasses RLS).
  const admin = getServiceRoleSupabaseClient();

  const { data: existing, error: selectError } = await admin
    .from('users')
    .select('id')
    .eq('clerk_id', authUserId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Unable to lookup user profile: ${selectError.message}`);
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: insertError } = await admin
    .from('users')
    .insert({
      clerk_id: authUserId,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select('id')
    .single();

  if (insertError || !created) {
    throw new Error(`Unable to create user profile: ${insertError?.message ?? 'Unknown error'}`);
  }

  return created.id;
}

/**
 * Maps a thrown error to an appropriate HTTP status + message body.
 * Returns 401 for auth failures, 500 otherwise.
 */
export function authErrorResponse(err: unknown): { status: number; body: { error: string } } {
  if (err instanceof UnauthorizedError) {
    return { status: 401, body: { error: 'Not authenticated. Please sign in.' } };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { status: 500, body: { error: message } };
}
