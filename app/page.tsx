import Link from 'next/link';
import { ArrowRight, Brain, Shield, Sparkles, Zap, Search, BookOpen, Layers } from 'lucide-react';

export default function Home() {
  return (
    <div className="pixel-shell flex flex-col min-h-screen text-zinc-950 overflow-x-hidden font-sans">
      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-zinc-900/20 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="pixel-logo group-hover:scale-105 transition-all">
            <Brain className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="font-black text-xl tracking-tight text-zinc-950">
            Second Brain
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Log In
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_4px_12px_rgba(255,255,255,0.15)] flex items-center gap-1.5"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-32 pb-20 px-6 flex flex-col items-center max-w-7xl mx-auto w-full relative">
        <div className="text-center z-10 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400 text-xs font-semibold tracking-wider uppercase shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            Empowered by Advanced AI & Hybrid RAG
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-[1.15]">
            Recall Everything.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">
              Think Faster.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 font-medium max-w-2xl mx-auto">
            Upload PDFs, scrape articles, and draft notes. Search your mind instantly and chat with your collective database with precise citations.
          </p>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-in"
              className="w-full sm:w-auto text-base font-semibold px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto text-base font-semibold px-8 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 transition-colors flex items-center justify-center text-zinc-300"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section className="mt-32 w-full grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm flex flex-col gap-4 group hover:border-zinc-700/80 hover:bg-zinc-900/60 transition-all">
            <div className="p-3 w-fit rounded-2xl bg-indigo-500/10 text-indigo-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Direct URL Ingestion</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Paste link to articles, newsletters, or docs. Our system scrapes, cleans, chunks, and indexes the text instantly.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm flex flex-col gap-4 group hover:border-zinc-700/80 hover:bg-zinc-900/60 transition-all">
            <div className="p-3 w-fit rounded-2xl bg-purple-500/10 text-purple-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Hybrid Retrieval Search</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Find files using semantic meaning or keyword keywords. Combined rank algorithms return precise, optimal matches.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm flex flex-col gap-4 group hover:border-zinc-700/80 hover:bg-zinc-900/60 transition-all">
            <div className="p-3 w-fit rounded-2xl bg-pink-500/10 text-pink-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">AI Study Buddy</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Generate interactive flashcards, multiple-choice quizzes, revision summaries, and viva questions from uploaded files.
            </p>
          </div>
        </section>

        {/* Dynamic Demo Callout */}
        <section className="mt-32 w-full p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-b from-zinc-900 to-[#0b0c10] border border-zinc-800/60 flex flex-col lg:flex-row items-center gap-12 relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-purple-500/5 blur-[50px] pointer-events-none" />
          <div className="space-y-6 flex-1">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              100% Secure, Isolated, Private Workspace.
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              We leverage Supabase Row Level Security (RLS) and storage access policies. Your data is isolated using keys bound directly to your identity. Your notes, uploads, and chats belong to you, and only you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                Supabase RLS Data Privacy
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Layers className="w-5 h-5 text-indigo-400 shrink-0" />
                Hierarchical Collections
              </div>
            </div>
          </div>
          <div className="flex-1 w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-1.5 pb-4 border-b border-zinc-800/60">
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <span className="text-xs text-zinc-600 pl-2 font-mono">localhost:3000/dashboard/chat</span>
            </div>
            <div className="pt-6 space-y-4 font-sans">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-[10px] font-bold">U</div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none text-xs text-zinc-200">
                  What did I save about React performance optimizations?
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shrink-0 flex items-center justify-center text-[10px] font-bold">AI</div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl rounded-tl-none text-xs text-zinc-200 space-y-2">
                  <p>Based on your notes, React performance can be optimized by:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Using <strong>React.memo</strong> to skip component re-renders [1].</li>
                    <li>Utilizing <strong>useCallback</strong> to memoize callbacks [2].</li>
                  </ul>
                  <p className="text-[10px] text-indigo-400 mt-2 font-semibold">Sources: [1] React Performance Guide.pdf | [2] Main Optimization Notes</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#040507] py-12 px-6 text-center text-zinc-600 text-sm">
        <p>© {new Date().getFullYear()} Second Brain SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}
