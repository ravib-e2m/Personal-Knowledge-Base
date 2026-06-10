import { getServiceRoleSupabaseClient } from './supabase';

/**
 * Ensures a Clerk user is synced to our local database and returns their local UUID.
 */
export async function getOrCreateUser(
  clerkUserId: string,
  email: string,
  name: string = '',
  avatarUrl: string = ''
): Promise<string> {
  const supabase = getServiceRoleSupabaseClient();

  // Try to find the user in our local DB
  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkUserId)
    .maybeSingle();

  if (existingUser) {
    return existingUser.id;
  }

  // User doesn't exist, create profile sync record
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkUserId,
      email: email,
      display_name: name || email.split('@')[0],
      avatar_url: avatarUrl,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating user profile in Supabase:', insertError);
    
    // In case of race conditions, query one more time
    const { data: retryUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .maybeSingle();
      
    if (retryUser) {
      return retryUser.id;
    }
    
    throw new Error(`User synchronization failed: ${insertError.message}`);
  }

  return newUser.id;
}
