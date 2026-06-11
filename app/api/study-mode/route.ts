import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getCurrentUserUuid } from '@/lib/auth';
import { generateStudyMaterial } from '@/lib/openai';

export async function GET(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    const noteId = searchParams.get('noteId');

    if (!documentId && !noteId) {
      return NextResponse.json({ error: 'Either documentId or noteId is required' }, { status: 400 });
    }

    const supabase = getServiceRoleSupabaseClient();
    let query = supabase.from('chunks').select('content').eq('user_id', userUuid);

    if (documentId) {
      query = query.eq('document_id', documentId);
    } else {
      query = query.eq('note_id', noteId);
    }

    const { data: chunks, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'No content chunks found to generate study materials' }, { status: 404 });
    }

    // Concatenate text contents up to limit
    const documentText = chunks.map(c => c.content).join('\n');
    
    // Call OpenAI study material generator
    const studyMaterials = await generateStudyMaterial(documentText);

    return NextResponse.json(studyMaterials);
  } catch (err) {
    console.error('Study Mode generation failure:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
