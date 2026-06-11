import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getCurrentUserUuid } from '@/lib/auth';
import { chunkText } from '@/lib/chunking';
import { generateEmbedding } from '@/lib/openai';

// GET notes
export async function GET(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get('collectionId');

    const supabase = getServiceRoleSupabaseClient();
    let query = supabase.from('notes').select('*').eq('user_id', userUuid).order('updated_at', { ascending: false });

    if (collectionId && collectionId !== 'all') {
      query = query.eq('collection_id', collectionId);
    }

    const { data: notes, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(notes);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST new note + embed
export async function POST(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { title, content, collectionId } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and Content are required' }, { status: 400 });
    }

    const supabase = getServiceRoleSupabaseClient();

    // 1. Insert Note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        user_id: userUuid,
        collection_id: collectionId || null,
        title,
        content,
      })
      .select()
      .single();

    if (noteError) {
      return NextResponse.json({ error: noteError.message }, { status: 500 });
    }

    // 2. Chunk Note and Index
    const chunks = chunkText(content, { chunkSize: 1000, chunkOverlap: 200 });
    const chunkInserts = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      chunkInserts.push({
        user_id: userUuid,
        note_id: note.id,
        content: chunk.content,
        embedding: embedding,
        metadata: {
          source_name: title,
          headings: chunk.metadata.headings,
          section_path: chunk.metadata.sectionPath,
          source_type: 'note',
        },
      });
    }

    if (chunkInserts.length > 0) {
      const { error: chunkError } = await supabase.from('chunks').insert(chunkInserts);
      if (chunkError) {
        console.error('Note chunk index error:', chunkError);
      }
    }

    return NextResponse.json(note);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PUT / DELETE note
export async function PUT(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { id, title, content, collectionId } = await req.json();
    if (!id || !title || !content) {
      return NextResponse.json({ error: 'ID, Title, and Content are required' }, { status: 400 });
    }

    const supabase = getServiceRoleSupabaseClient();

    // Verify ownership
    const { data: noteTest } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', userUuid)
      .maybeSingle();

    if (!noteTest) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    // 1. Update Note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .update({
        title,
        content,
        collection_id: collectionId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (noteError) {
      return NextResponse.json({ error: noteError.message }, { status: 500 });
    }

    // 2. Clear old chunks
    await supabase.from('chunks').delete().eq('note_id', id);

    // 3. Insert new chunks
    const chunks = chunkText(content, { chunkSize: 1000, chunkOverlap: 200 });
    const chunkInserts = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      chunkInserts.push({
        user_id: userUuid,
        note_id: note.id,
        content: chunk.content,
        embedding: embedding,
        metadata: {
          source_name: title,
          headings: chunk.metadata.headings,
          section_path: chunk.metadata.sectionPath,
          source_type: 'note',
        },
      });
    }

    if (chunkInserts.length > 0) {
      const { error: chunkError } = await supabase.from('chunks').insert(chunkInserts);
      if (chunkError) {
        console.error('Note chunk update error:', chunkError);
      }
    }

    return NextResponse.json(note);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getServiceRoleSupabaseClient();

    // Verify ownership
    const { data: noteTest } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', userUuid)
      .maybeSingle();

    if (!noteTest) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    // Delete Note (Cascades delete to chunks table automatically)
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
