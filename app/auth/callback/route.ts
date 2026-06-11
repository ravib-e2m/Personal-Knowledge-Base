import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

/**
 * OAuth / email-confirmation callback.
 * Supabase redirects here with a `?code=...` which we exchange for a session
 * cookie, then forward the user to the dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await getServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('OAuth code exchange failed:', error.message);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
