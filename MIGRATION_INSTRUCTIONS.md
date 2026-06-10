# Database Migration Instructions

## Update Embedding Dimensions: 1536 → 768

Your Personal Knowledge Base is now configured to use:
- **Gemini** for embeddings (768 dimensions)
- **Groq** for AI chat responses (already working)

### Steps to Apply the Migration:

1. **Go to your Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Select your project: `uihgcaxjgbqxawdgrgpz`

2. **Open the SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the entire contents of this file:
     `supabase/migrations/20260610000000_update_embedding_dimensions.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Cmd+Enter)

4. **Verify the Migration**
   - You should see "Success. No rows returned"
   - The embedding column is now 768 dimensions (Gemini compatible)

### What This Migration Does:

✅ Drops the old 1536-dimension embedding column  
✅ Creates a new 768-dimension embedding column (Gemini text-embedding-004)  
✅ Recreates the HNSW index for fast vector search  
✅ Updates the `hybrid_search_chunks` function to work with 768 dimensions  

⚠️ **Note**: This will clear all existing embeddings. You'll need to re-upload/re-index your documents and notes after the migration.

### After Migration:

1. The chat will work with Groq AI responses
2. Embeddings will use Gemini (no more OpenAI quota issues)
3. You can re-upload your PDFs and notes to re-generate embeddings

### Current Configuration:

```
EMBEDDINGS: Gemini (text-embedding-004) - 768 dimensions
CHAT AI: Groq (llama-3.3-70b-versatile)
SUMMARIES: Groq (llama-3.3-70b-versatile)
STUDY MODE: Groq (llama-3.3-70b-versatile)
```

All set! 🚀
