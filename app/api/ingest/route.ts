import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getCurrentUserUuid, authErrorResponse } from '@/lib/auth';
import { extractTextFromPDF } from '@/lib/pdf';
import { scrapeUrl } from '@/lib/scraper';
import { extractWebContent } from '@/lib/browser-use';
import { chunkText } from '@/lib/chunking';
import { generateEmbedding, generateDocumentSummaries } from '@/lib/openai';

const STORAGE_BUCKET = 'documents';
const browserUseEnabled = Boolean(process.env.BROWSER_USE_API_KEY?.trim());

async function ensureStorageBucketExists(supabase: ReturnType<typeof getServiceRoleSupabaseClient>) {
  try {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false,
    });

    // Some Supabase returns a 409 for existing bucket; others may return a message stating resource exists.
    if (error) {
      const msg = String(error.message || error);
      if (error.status === 409 || /already exists/i.test(msg) || /resource already exists/i.test(msg)) {
        // bucket already exists — not an error
        return;
      }
      throw new Error(`Could not ensure Supabase storage bucket exists: ${msg}`);
    }
  } catch (err) {
    const emsg = getErrorMessage(err);
    if (/already exists/i.test(emsg) || /resource already exists/i.test(emsg)) {
      return;
    }
    throw new Error(`Could not ensure Supabase storage bucket exists: ${emsg}`);
  }
}

interface OpenAIError {
  message?: string;
  status?: number;
  code?: string;
}

interface ChunkInsertData {
  user_id: string;
  document_id: string;
  content: string;
  embedding: number[] | null;
  metadata: {
    source_name: string;
    headings: string[];
    section_path: string;
    source_type: 'pdf' | 'url';
    storage_path: string;
    pending_embedding: boolean;
  };
}

function getErrorMessage(e: unknown): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null) {
    const maybe = e as { message?: unknown };
    if (typeof maybe.message === 'string') return maybe.message;
  }
  return String(e);
}

function isOpenAIQuotaError(error: unknown) {
  const err = error as OpenAIError;
  return (
    err?.status === 429 ||
    err?.code === 'rate_limit_exceeded' ||
    (typeof err?.message === 'string' && err.message.includes('quota'))
  );
}

export const maxDuration = 60; // Max execution timeout for Vercel/Netlify serverless function

export async function POST(req: Request) {
  try {
    const userUuid = await getCurrentUserUuid();
    const supabase = getServiceRoleSupabaseClient();

    const contentType = req.headers.get('content-type') || '';

    let docName = '';
    let sourceType: 'pdf' | 'url' = 'pdf';
    let storagePath = '';
    let fileSize = 0;
    let text = '';
    let collectionId: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // PDF Ingestion Pipeline
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const collectionVal = formData.get('collectionId') as string | null;
      
      if (collectionVal && collectionVal !== 'null' && collectionVal !== 'undefined') {
        collectionId = collectionVal;
      }

      if (!file) {
        return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
      }

      docName = file.name;
      sourceType = 'pdf';
      fileSize = file.size;

      // Extract file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Ensure the Supabase storage bucket exists before upload
      await ensureStorageBucketExists(supabase);
      const storageKey = `${userUuid}/${Date.now()}_${file.name}`;

      let uploadError = null;
      let uploadAttempt = 0;
      while (uploadAttempt < 2) {
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storageKey, buffer, {
            contentType: 'application/pdf',
            upsert: true,
          });

        uploadError = error;
        if (!uploadError) break;

        if (
          uploadError.status === 404 ||
          uploadError.message?.includes('Bucket not found')
        ) {
          console.warn(`Bucket "${STORAGE_BUCKET}" not found; creating it now.`);
          const { error: bucketError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
            public: false,
          });
          if (bucketError && bucketError.status !== 409) {
            console.error('Could not create storage bucket:', bucketError);
            return NextResponse.json(
              { error: `Storage bucket error: ${bucketError.message}` },
              { status: 500 }
            );
          }
        } else {
          break;
        }

        uploadAttempt += 1;
      }

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        const bucketHint = uploadError.message?.includes('Bucket')
          ? ` Confirm the Supabase storage bucket "${STORAGE_BUCKET}" exists.`
          : '';
        return NextResponse.json(
          { error: `Storage upload failed: ${uploadError.message}.${bucketHint}` },
          { status: 500 }
        );
      }

      storagePath = storageKey;

      // Extract plain text from PDF
      try {
        console.log(`Starting PDF text extraction for file: ${file.name}, size: ${fileSize} bytes`);
        text = await extractTextFromPDF(buffer);
        if (!text || !text.trim()) {
          console.error('PDF extraction returned empty text');
          return NextResponse.json(
            { error: 'PDF file is empty or contains no extractable text. Please ensure the PDF has readable text content.' },
            { status: 422 }
          );
        }
        console.log(`Successfully extracted ${text.length} characters from PDF`);
      } catch (pdfErr) {
        console.error('PDF extraction failed:', pdfErr);
        const errorMessage = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
        return NextResponse.json(
          { 
            error: `Failed to extract text from PDF: ${errorMessage}`,
            details: 'If this is a scanned PDF, it may require OCR processing. If the file is protected, please remove the password first.'
          },
          { status: 422 }
        );
      }
    } else {
      // URL Ingestion Pipeline
      const body = await req.json();
      const { url, collectionId: bodyCollectionId, useBrowserUse } = body;
      
      if (bodyCollectionId && bodyCollectionId !== 'null' && bodyCollectionId !== 'undefined') {
        collectionId = bodyCollectionId;
      }

      if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }

      if (useBrowserUse && !browserUseEnabled) {
        return NextResponse.json(
          {
            error:
              'Browser Use is requested but BROWSER_USE_API_KEY is not configured. Add it to .env.local to enable Browser Use extraction.',
          },
          { status: 400 }
        );
      }

      sourceType = 'url';
      storagePath = url;

      // Scrape URL - use Browser Use for complex websites or when explicitly requested
      try {
        if (useBrowserUse) {
          console.log('Using Browser Use for URL extraction:', url);
          const browserResult = await extractWebContent(url);
          docName = browserResult.title;
          text = browserResult.content;
        } else {
          const scrapeResult = await scrapeUrl(url);
          docName = scrapeResult.title;
          text = scrapeResult.content;
        }
      } catch (scrapeError) {
        console.warn('Primary scraping method failed, attempting fallback:', scrapeError);
        // Fallback: if regular scraping fails, try Browser Use if not already used
        if (!useBrowserUse) {
          if (!browserUseEnabled) {
            console.error('Browser Use fallback skipped because BROWSER_USE_API_KEY is not set.');
            return NextResponse.json(
              {
                error:
                  `Failed to extract content from URL: ${(scrapeError as Error).message}. ` +
                  'Browser Use fallback is not configured because BROWSER_USE_API_KEY is missing. Add it to .env.local for better URL extraction support.',
              },
              { status: 422 }
            );
          }

          try {
            console.log('Falling back to Browser Use for URL extraction:', url);
            const browserResult = await extractWebContent(url);
            docName = browserResult.title;
            text = browserResult.content;
          } catch (fallbackError) {
            console.error('Both scraping methods failed:', fallbackError);
            return NextResponse.json(
              { error: `Failed to extract content from URL: ${(fallbackError as Error).message}` },
              { status: 422 }
            );
          }
        } else {
          return NextResponse.json(
            { error: `Failed to extract content from URL: ${(scrapeError as Error).message}` },
            { status: 422 }
          );
        }
      }
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Failed to extract any text from the source' }, { status: 422 });
    }

    // 2. Create Document record in database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userUuid,
        collection_id: collectionId,
        name: docName,
        source_type: sourceType,
        storage_path: storagePath,
        file_size: fileSize,
      })
      .select()
      .single();

    if (docError) {
      console.error('Database insertion error for document:', docError);
      return NextResponse.json({ error: `Failed to save document: ${docError.message}` }, { status: 500 });
    }

    // 3. Chunk text
    const chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });

    // 4. Generate embeddings per chunk in parallel batches for speed.
    // If embedding fails (quota), mark chunk as pending embedding and continue.
    const chunkInserts: ChunkInsertData[] = [];
    let embeddingFailures = 0;
    const EMBED_CONCURRENCY = 10;

    for (let i = 0; i < chunks.length; i += EMBED_CONCURRENCY) {
      const batch = chunks.slice(i, i + EMBED_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (chunk) => {
          try {
            const embedding = await generateEmbedding(chunk.content);
            return { chunk, embedding, pending_embedding: false };
          } catch (embErr) {
            embeddingFailures += 1;
            console.warn('Embedding generation failed for a chunk, marking as pending:', embErr);
            return { chunk, embedding: null as number[] | null, pending_embedding: true };
          }
        })
      );

      for (const { chunk, embedding, pending_embedding } of results) {
        chunkInserts.push({
          user_id: userUuid,
          document_id: document.id,
          content: chunk.content,
          embedding,
          metadata: {
            source_name: docName,
            headings: chunk.metadata.headings,
            section_path: chunk.metadata.sectionPath,
            source_type: sourceType,
            storage_path: storagePath,
            pending_embedding,
          },
        });
      }
    }

    // Insert chunks in batch of 50; if DB insertion fails, rollback document and storage
    const batchSize = 50;
    for (let i = 0; i < chunkInserts.length; i += batchSize) {
      const batch = chunkInserts.slice(i, i + batchSize);
      const { error: chunkError } = await supabase.from('chunks').insert(batch);
      if (chunkError) {
        console.error('Failed to insert chunk batch:', chunkError);
        // Rollback created document and uploaded file
        if (document?.id) {
          await supabase.from('documents').delete().eq('id', document.id);
        }
        if (sourceType === 'pdf' && storagePath) {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        }

        return NextResponse.json({ error: `Failed to insert chunks: ${chunkError.message}` }, { status: 500 });
      }
    }

    // 5. Generate Summaries using OpenAI (Asynchronously or in the handler)
    let summaryShort = '';
    let summaryDetailed = '';
    try {
      const summaries = await generateDocumentSummaries(text);
      summaryShort = summaries.short;
      summaryDetailed = summaries.detailed;

      await supabase
        .from('documents')
        .update({
          summary_short: summaryShort,
          summary_detailed: summaryDetailed,
        })
        .eq('id', document.id);
    } catch (summaryErr) {
      console.error('Failed to generate document summaries:', summaryErr);
      // Fail silently for summaries, document is already parsed and stored
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        summary_short: summaryShort,
        summary_detailed: summaryDetailed,
      },
      chunksCount: chunks.length,
    });
  } catch (error) {
    console.error('Ingestion pipeline general failure:', error);
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
