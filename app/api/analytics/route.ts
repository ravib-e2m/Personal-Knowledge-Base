import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getDefaultUserUuid } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userUuid = await getDefaultUserUuid();
    const supabase = getServiceRoleSupabaseClient();

    // 1. Get documents count & storage size
    const { data: docs, error: docsErr } = await supabase
      .from('documents')
      .select('file_size')
      .eq('user_id', userUuid);

    if (docsErr) {
      return NextResponse.json({ error: docsErr.message }, { status: 500 });
    }

    const docsCount = docs.length;
    const storageUsed = docs.reduce((sum, doc) => sum + doc.file_size, 0);

    // 2. Get notes count
    const { count: notesCount, error: notesErr } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userUuid);

    if (notesErr) {
      return NextResponse.json({ error: notesErr.message }, { status: 500 });
    }

    // 3. Get queries count (search history)
    const { count: queriesCount, error: queriesErr } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userUuid);

    if (queriesErr) {
      return NextResponse.json({ error: queriesErr.message }, { status: 500 });
    }

    // 4. Get active chats count
    const { count: chatsCount, error: chatsErr } = await supabase
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userUuid);

    if (chatsErr) {
      return NextResponse.json({ error: chatsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      documentsCount: docsCount,
      notesCount: notesCount || 0,
      queriesCount: queriesCount || 0,
      chatsCount: chatsCount || 0,
      storageUsed, // in bytes
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
