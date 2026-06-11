import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getCurrentUserUuid } from '@/lib/auth';

// GET all documents OR get a signed URL for a specific document
export async function GET(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();

    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('id');
    const collectionId = searchParams.get('collectionId');

    const supabase = getServiceRoleSupabaseClient();

    if (docId) {
      // Fetch a specific document
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .eq('user_id', userUuid)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // If PDF, generate a secure signed URL
      let signedUrl = '';
      if (document.source_type === 'pdf') {
        const { data, error: signError } = await supabase.storage
          .from('documents')
          .createSignedUrl(document.storage_path, 3600); // 1 hour expiration
          
        if (signError) {
          console.error('Error generating signed URL:', signError);
        } else if (data) {
          signedUrl = data.signedUrl;
        }
      }

      return NextResponse.json({
        ...document,
        signedUrl,
      });
    }

    // Otherwise list documents
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false });

    if (collectionId && collectionId !== 'all') {
      query = query.eq('collection_id', collectionId);
    }

    const { data: documents, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(documents);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE a document
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
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, storage_path, source_type')
      .eq('id', id)
      .eq('user_id', userUuid)
      .maybeSingle();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    // 1. Delete PDF file from storage if source_type is 'pdf'
    if (document.source_type === 'pdf') {
      const { error: storageDeleteError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path]);

      if (storageDeleteError) {
        console.error('Failed to delete file from storage bucket:', storageDeleteError);
        // Continue deleting metadata from database even if storage fails
      }
    }

    // 2. Delete database entry (cascades deletion to chunks table automatically)
    const { error: dbDeleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (dbDeleteError) {
      return NextResponse.json({ error: dbDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
