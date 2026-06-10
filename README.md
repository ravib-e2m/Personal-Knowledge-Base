# Second Brain (Personal Knowledge Base)

A production-ready SaaS application built with Next.js 15, TypeScript, Supabase (PostgreSQL + pgvector), and Groq/OpenAI. 

This application allows users to upload PDFs, save notes, ingest web URLs, run semantic hybrid searches across their personal data, chat with an AI agent equipped with source citations, and generate study guides (flashcards, MCQs, and viva prep sheets).

---

## Technical Stack
* **Frontend / Server**: Next.js 15 (App Router), TypeScript, Tailwind CSS (v4)
* **Authentication**: Local email/password login form (no Clerk)
* **Database & Vector Search**: Supabase PostgreSQL with `pgvector`
* **Storage**: Supabase Storage (PDF file host)
* **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
* **Embedding Model**: OpenAI (`text-embedding-3-small` - 1536 dims)
* **Deployment**: Netlify

---

## Core Features
1. **Multi-Source Ingestion**:
   * **PDF Documents**: Parsed on the server, chunked, embedded, and stored in pgvector.
   * **URL Scraper**: Fetches web articles, strips headers/footers, chunks, and indexes.
   * **Notes Editor**: Full note creation, updating, and automatic vector indexing.
2. **Hybrid Semantic Search**: Performs combined vector cosine similarity and full-text keyword search, returning combined ranking scores.
3. **Conversational RAG Chat**: Chat with your knowledge base. Answers include exact inline citations pointing to original sources. Includes Lost-in-the-Middle context reordering.
4. **AI Study Mode**: Automatically generate flashcards (Q&A), MCQs, Viva questions, and revision notes from any document or note.
5. **Analytics**: Dashboard showing total uploads, notes created, queries performed, and storage usage.
6. **RLS Security**: Row Level Security enabled on all tables. This local/demo version uses a default local user and service-role Supabase access.

---

## Folder Structure
```
├── app
│   ├── api
│   │   ├── analytics           # Statistics & usage calculations
│   │   ├── chat                # Hybrid context search & LLM chat agent
│   │   ├── collections         # Collections CRUD
│   │   ├── documents           # File metadata & signed URL generation
│   │   ├── ingest              # PDF & web scrape vector indexing pipeline
│   │   ├── notes               # Notes CRUD & sync indexing
│   │   └── study-mode          # AI learning asset generators
│   ├── dashboard               # Main unified SPA dashboard page
│   ├── sign-in                 # Local custom sign-in form
│   ├── sign-up                 # Local custom sign-up form
│   ├── globals.css             # Tailwind v4 globals & custom styles
│   ├── layout.tsx              # Root HTML shell & auth/query wraps
│   └── page.tsx                # Premium landing page
├── components
│   ├── ui
│   │   ├── multimodal-ai-chat-input.tsx   # Custom dynamic chat input
│   │   └── demo.tsx                       # Minimal input preview display
│   └── providers.tsx           # React Query Provider setup
├── lib
│   ├── chunking.ts             # Semantic/structural markdown-aware text chunker
│   ├── openai.ts               # Embeddings & Groq chat completions wraps
│   ├── pdf.ts                  # PDF text extraction utilities
│   ├── scraper.ts              # Web webpage cleaning & scraping wrapper
│   ├── supabase.ts             # DB Client builders (anon & service role)
│   └── user.ts                 # Legacy user sync helper
├── supabase
│   └── migrations
│       └── 20260609000000_init.sql # Database schema, RLS, and hybrid search functions
├── env.template                # Environment variable setup instructions
├── netlify.toml                # Netlify deployment directives
└── package.json
```

---

## Setup Instructions

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to **Database > Extensions**, search for `vector` and enable it. Also ensure `uuid-ossp` is enabled.
3. Go to the **SQL Editor**, create a new query, paste the contents of `supabase/migrations/20260609000000_init.sql`, and run it. This creates all tables, indexes, and RLS policies.
4. Go to **Storage**, create a new bucket named `documents`. Disable public access (we use signed URLs for security).

### 2. User Isolation & Local Access
This version uses a local default user account for demo login and does not require Clerk. API routes use a service-role Supabase client to access data for the default user.

### 3. Local Configurations
1. Copy `env.template` to `.env.local`:
   ```bash
   cp env.template .env.local
   ```
2. Populate the parameters inside `.env.local` using keys from Supabase, OpenAI (embeddings), and Groq (LLM).

### 4. Running Locally
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Deployment (Netlify)
1. Click **Import an existing project** in your Netlify dashboard and link your repository.
2. Configure build settings (handled automatically via `netlify.toml`):
   * **Build command**: `npm run build`
   * **Publish directory**: `.next`
3. Add the environment variables from `.env.local` to **Site settings > Environment variables**.
4. Trigger a deployment. Netlify will compile the Next.js App Router and deploy your Second Brain application!
