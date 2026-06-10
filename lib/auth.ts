import { getServiceRoleSupabaseClient } from './supabase';

const DEFAULT_USER_EMAIL = 'local@secondbrain.app';
const DEFAULT_USER_DISPLAY_NAME = 'Local User';
const DEFAULT_USER_CLERK_ID = 'local-default-user';

export async function getDefaultUserUuid() {
  const supabase = getServiceRoleSupabaseClient();

  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEFAULT_USER_EMAIL)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Unable to lookup default user: ${selectError.message}`);
  }

  if (existingUser?.id) {
    return existingUser.id;
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_id: DEFAULT_USER_CLERK_ID,
      email: DEFAULT_USER_EMAIL,
      display_name: DEFAULT_USER_DISPLAY_NAME,
      avatar_url: '',
    })
    .select('id')
    .single();

  if (insertError || !newUser) {
    throw new Error(`Unable to create default user: ${insertError?.message ?? 'Unknown error'}`);
  }

  return newUser.id;
}
