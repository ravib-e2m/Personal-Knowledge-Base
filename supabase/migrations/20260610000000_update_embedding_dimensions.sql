-- Migration: Update embedding dimensions from 1536 to 768 for Gemini compatibility
-- This will drop existing embeddings and recreate the column with new dimensions

-- Step 1: Drop the existing HNSW index on embeddings
DROP INDEX IF EXISTS idx_chunks_embedding;

-- Step 2: Drop the existing embedding column
ALTER TABLE chunks DROP COLUMN IF EXISTS embedding;

-- Step 3: Add the embedding column back with 768 dimensions (Gemini text-embedding-004)
ALTER TABLE chunks ADD COLUMN embedding vector(768);

-- Step 4: Recreate the HNSW index for vector cosine similarity search
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);

-- Step 5: Drop and recreate the hybrid_search_chunks function with updated vector dimension
DROP FUNCTION IF EXISTS hybrid_search_chunks(UUID, TEXT, vector, INT, UUID, TEXT);

CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    p_user_id UUID,
    p_query TEXT,
    p_embedding vector(768),  -- Updated to 768 dimensions
    p_match_count INT,
    p_collection_id UUID DEFAULT NULL,
    p_source_type TEXT DEFAULT NULL -- 'pdf', 'url', 'note'
)
RETURNS TABLE (
    chunk_id UUID,
    doc_id UUID,
    note_id UUID,
    chunk_content TEXT,
    chunk_metadata JSONB,
    vector_score FLOAT,
    text_score FLOAT,
    combined_score FLOAT
) AS $$
DECLARE
    clean_query tsquery;
BEGIN
    -- Format full text query (replace space with &)
    IF p_query IS NULL OR trim(p_query) = '' THEN
        clean_query := plainto_tsquery('english', '');
    ELSE
        clean_query := websearch_to_tsquery('english', p_query);
    END IF;

    RETURN QUERY
    WITH vector_matches AS (
        SELECT 
            c.id AS cid,
            -- Cosine distance to similarity score: 1 - distance
            1.0 - (c.embedding <=> p_embedding) AS score
        FROM chunks c
        LEFT JOIN documents d ON c.document_id = d.id
        LEFT JOIN notes n ON c.note_id = n.id
        WHERE c.user_id = p_user_id
          AND c.embedding IS NOT NULL  -- Only match chunks with embeddings
          AND (p_collection_id IS NULL OR d.collection_id = p_collection_id OR n.collection_id = p_collection_id)
          AND (
              p_source_type IS NULL 
              OR (p_source_type = 'pdf' AND c.document_id IS NOT NULL AND d.source_type = 'pdf')
              OR (p_source_type = 'url' AND c.document_id IS NOT NULL AND d.source_type = 'url')
              OR (p_source_type = 'note' AND c.note_id IS NOT NULL)
          )
        ORDER BY c.embedding <=> p_embedding
        LIMIT p_match_count * 2
    ),
    fts_matches AS (
        SELECT 
            c.id AS cid,
            ts_rank_cd(c.fts_tokens, clean_query) AS score
        FROM chunks c
        LEFT JOIN documents d ON c.document_id = d.id
        LEFT JOIN notes n ON c.note_id = n.id
        WHERE c.user_id = p_user_id
          AND c.fts_tokens @@ clean_query
          AND (p_collection_id IS NULL OR d.collection_id = p_collection_id OR n.collection_id = p_collection_id)
          AND (
              p_source_type IS NULL 
              OR (p_source_type = 'pdf' AND c.document_id IS NOT NULL AND d.source_type = 'pdf')
              OR (p_source_type = 'url' AND c.document_id IS NOT NULL AND d.source_type = 'url')
              OR (p_source_type = 'note' AND c.note_id IS NOT NULL)
          )
        ORDER BY ts_rank_cd(c.fts_tokens, clean_query) DESC
        LIMIT p_match_count * 2
    )
    SELECT 
        c.id AS chunk_id,
        c.document_id AS doc_id,
        c.note_id AS note_id,
        c.content AS chunk_content,
        c.metadata AS chunk_metadata,
        COALESCE(vm.score, 0.0)::FLOAT AS vector_score,
        COALESCE(fm.score, 0.0)::FLOAT AS text_score,
        -- Combined score calculation: normalizes and sums vectors and keywords
        (COALESCE(vm.score, 0.0) + COALESCE(fm.score, 0.0))::FLOAT AS combined_score
    FROM chunks c
    LEFT JOIN vector_matches vm ON c.id = vm.cid
    LEFT JOIN fts_matches fm ON c.id = fm.cid
    WHERE (vm.cid IS NOT NULL OR fm.cid IS NOT NULL)
    ORDER BY combined_score DESC
    LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
