# Browser Use Integration Guide

This project now has Browser Use integrated for advanced web automation and content extraction. Browser Use enables:

✅ **JavaScript-rendered content** extraction (handles dynamic pages)
✅ **CAPTCHA solving** (automatic)
✅ **Form automation** (complex interactions)
✅ **Multi-step workflows** (login, authentication flows)
✅ **Fallback scraping** (automatic if regular scraping fails)
✅ **Residential proxies** (195+ countries, on by default)

## Setup

### 1. Add API Key to `.env.local`

Copy your Browser Use API key from the user request (or get one at https://cloud.browser-use.com/settings?tab=api-keys):

```bash
BROWSER_USE_API_KEY=bu_s-rB-8KkonYd5N-AUgh_ZIFDOXN2gEH76jJThqxFFdU
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

The `browser-use-sdk` has been added to `package.json`.

## Usage

### PDF Chunking & Searching (Already Ready!)

The PDF ingestion pipeline is **fully integrated** with Browser Use:

- **PDFs**: Extracted → Chunked → Embedded → Searchable ✅
- **URLs**: Scraped → Chunked → Embedded → Searchable ✅
- **Browser Use**: Auto-fallback for complex websites ✅

### Ingest Documents

#### PDF Upload
```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@document.pdf"
```

#### URL with Standard Scraping
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### URL with Browser Use (Force)
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "useBrowserUse": true}'
```

When regular scraping fails, the system **automatically falls back to Browser Use**.

### Search Indexed Content

```bash
curl -X GET "http://localhost:3000/api/search?query=your+search+term"
```

Results are **ranked by relevance** using vector similarity + hybrid search.

## API Reference

### Browser Use Utilities (`lib/browser-use.ts`)

#### `extractWebContent(url, extractionInstructions?)`
Extract content from a website using Browser Use.
```typescript
import { extractWebContent } from '@/lib/browser-use';

const { title, content } = await extractWebContent('https://example.com');
```

#### `executeBrowserTask(task, options?)`
Execute any custom automation task.
```typescript
import { executeBrowserTask } from '@/lib/browser-use';

const result = await executeBrowserTask('Login to example.com with email@example.com');
```

#### `searchAndExtractFromMultipleUrls(urls, searchQuery)`
Parallel extraction from multiple URLs.
```typescript
const results = await searchAndExtractFromMultipleUrls(
  ['https://url1.com', 'https://url2.com'],
  'search query'
);
```

#### `fillAndSubmitForm(url, formData)`
Automate form filling and submission.
```typescript
const result = await fillAndSubmitForm('https://example.com/form', {
  email: 'user@example.com',
  password: 'secure123',
});
```

#### `handleAuthenticationFlow(url, credentials)`
Handle login flows with 2FA support.
```typescript
const result = await handleAuthenticationFlow('https://example.com/login', {
  username: 'user@example.com',
  password: 'secure123',
  otp: '123456', // Optional 2FA code
});
```

## Architecture

```
Document Input (PDF/URL)
         ↓
  ┌─────────────┐
  │   Scraper   │ (Playwright/Cheerio)
  │   (Default) │
  └────┬────────┘
       │ (If fails)
       ↓
  ┌──────────────────┐
  │  Browser Use     │ (Stealth + Proxies)
  │  (Fallback)      │
  └────┬─────────────┘
       ↓
    Text Extract
       ↓
   ┌──────────────────┐
   │  Chunking        │ (1000 char chunks, 200 overlap)
   │  (Preserve ctx)  │
   └────┬─────────────┘
       ↓
   ┌──────────────────┐
   │  Embeddings      │ (OpenAI text-embedding-3-small)
   │  (1536 dims)     │
   └────┬─────────────┘
       ↓
   ┌──────────────────┐
   │  Supabase        │ (Vector + Metadata)
   │  pgvector        │
   └────┬─────────────┘
       ↓
   ┌──────────────────┐
   │  Hybrid Search   │ (Semantic + BM25)
   │  (Get Results)   │
   └──────────────────┘
```

## Performance Tips

1. **Use Browser Use for**:
   - JavaScript-heavy sites (React, Vue, Angular apps)
   - Sites with dynamic loading
   - Sites requiring authentication
   - CAPTCHA-protected pages

2. **Use default Scraper for**:
   - Static HTML pages
   - News articles, blogs
   - Documentation sites
   - Faster processing (Playwright is faster than Browser Use)

3. **Parallel Extraction**: Use `searchAndExtractFromMultipleUrls()` for better throughput on multiple URLs.

## Troubleshooting

### "BROWSER_USE_API_KEY is not set"
✅ Add the key to `.env.local`

### Browser Use task timeout
- Browser Use tasks default to 2 minutes
- Increase timeout: `await executeBrowserTask(task, { timeout: 300 })`

### Scraping fails for complex sites
- Automatically falls back to Browser Use ✅
- Or explicitly set `useBrowserUse: true` in API request

### Rate limiting
- Browser Use uses residential proxies (195+ countries)
- Requests are automatically distributed
- Check dashboard: https://cloud.browser-use.com

## Next Steps

1. ✅ **Configured** - Browser Use is ready
2. ✅ **PDF Chunking** - Fully integrated with embeddings
3. ✅ **Search** - Vector + hybrid search active
4. → **Optional**: Customize chunking strategy in `lib/chunking.ts`
5. → **Optional**: Add real-time ingestion monitoring

## Resources

- [Browser Use Docs](https://docs.browser-use.com)
- [API Reference](https://docs.browser-use.com/cloud/api-reference)
- [Chat UI Example](https://docs.browser-use.com/cloud/tutorials/chat-ui)
- [Dashboard](https://cloud.browser-use.com)
