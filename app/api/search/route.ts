import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getCurrentUserUuid } from '@/lib/auth';
import { generateEmbedding } from '@/lib/openai';

// GET search results OR search history
export async function GET(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'search'; // 'search' or 'history'
    const supabase = getServiceRoleSupabaseClient();

    if (mode === 'history') {
      const { data: history, error: historyErr } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyErr) {
        return NextResponse.json({ error: historyErr.message }, { status: 500 });
      }
      return NextResponse.json(history);
    }

    const query = searchParams.get('query') || '';
    const collectionId = searchParams.get('collectionId') || null;
    const sourceType = searchParams.get('sourceType') || null; // 'pdf', 'url', 'note'
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    // 1. Generate Query embedding
    const queryEmbedding = await generateEmbedding(query);

    // 2. Invoke hybrid search RPC
    const { data: results, error: searchErr } = await supabase.rpc('hybrid_search_chunks', {
      p_user_id: userUuid,
      p_query: query,
      p_embedding: queryEmbedding,
      p_match_count: limit,
      p_collection_id: collectionId && collectionId !== 'all' ? collectionId : null,
      p_source_type: sourceType && sourceType !== 'all' ? sourceType : null,
    });

    if (searchErr) {
      console.error('Hybrid search RPC error:', searchErr);
      return NextResponse.json({ error: searchErr.message }, { status: 500 });
    }

    // 3. Log search query to history in background
    await supabase.from('search_history').insert({
      user_id: userUuid,
      query: query,
      filters: {
        collection_id: collectionId,
        source_type: sourceType,
      },
    });

    return NextResponse.json(results || []);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE recent search
export async function DELETE(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const supabase = getServiceRoleSupabaseClient();
    
    if (id) {
      // Delete specific item
      await supabase.from('search_history').delete().eq('id', id).eq('user_id', userUuid);
    } else {
      // Clear entire history
      await supabase.from('search_history').delete().eq('user_id', userUuid);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
