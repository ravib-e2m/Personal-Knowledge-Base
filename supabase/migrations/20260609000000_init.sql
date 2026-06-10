-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Users Table (Synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Documents Table (PDFs and Ingested URLs)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'url')),
    storage_path TEXT NOT NULL, -- storage file key for pdfs, original url string for urls
    file_size INTEGER NOT NULL DEFAULT 0, -- 0 for urls
    summary_short TEXT,
    summary_detailed TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create Chunks Table
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    fts_tokens tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT document_or_note CHECK (
        (document_id IS NOT NULL AND note_id IS NULL) OR
        (note_id IS NOT NULL AND document_id IS NULL)
    )
);

-- 6. Create Chats Table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create Search History Table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_note_id ON chunks(note_id);
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON chunks USING gin(fts_tokens);

-- Create HNSW index for vector cosine similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_collection_id ON documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_collection_id ON notes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create current_user_uuid() function to fetch the current user's profile UUID from Clerk's JWT sub
CREATE OR REPLACE FUNCTION current_user_uuid()
RETURNS UUID AS $$
    SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies

-- Users policies
CREATE POLICY "Allow users to read their own profile" ON users
    FOR SELECT USING (clerk_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "Allow users to update their own profile" ON users
    FOR UPDATE USING (clerk_id = (auth.jwt() ->> 'sub'));
-- Special insert policy to allow service-role / webhook / backend to insert profile on onboarding
CREATE POLICY "Allow service-role / backend insert" ON users
    FOR INSERT WITH CHECK (true);

-- Collections policies
CREATE POLICY "Collections isolation" ON collections
    FOR ALL USING (user_id = current_user_uuid());

-- Documents policies
CREATE POLICY "Documents isolation" ON documents
    FOR ALL USING (user_id = current_user_uuid());

-- Notes policies
CREATE POLICY "Notes isolation" ON notes
    FOR ALL USING (user_id = current_user_uuid());

-- Chunks policies
CREATE POLICY "Chunks isolation" ON chunks
    FOR ALL USING (user_id = current_user_uuid());

-- Chats policies
CREATE POLICY "Chats isolation" ON chats
    FOR ALL USING (user_id = current_user_uuid());

-- Messages policies
CREATE POLICY "Messages isolation" ON messages
    FOR ALL USING (user_id = current_user_uuid());

-- Search History policies
CREATE POLICY "Search history isolation" ON search_history
    FOR ALL USING (user_id = current_user_uuid());


-- Hybrid Search function for Retrieval
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    p_user_id UUID,
    p_query TEXT,
    p_embedding vector(1536),
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
