'use client';

import { useState } from 'react';
import { Link2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function IngestLinkForm() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, collectionId: null, useBrowserUse: false }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, msg: 'Link ingested successfully! You can now ask the AI about it.' });
        setUrl('');
      } else {
        setStatus({ ok: false, msg: data.error || 'Unknown error occurred.' });
      }
    } catch (err) {
      setStatus({ ok: false, msg: `Network error: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-16 w-full max-w-xl mx-auto bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
          <Link2 className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-white">Ingest a Web Link</h2>
      </div>
      <form onSubmit={handleIngest} className="flex flex-col gap-3">
        <input
          type="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ingesting…
            </>
          ) : (
            'Ingest Link'
          )}
        </button>
        {status && (
          <div
            className={`flex items-start gap-2 mt-1 text-sm rounded-xl px-4 py-3 ${
              status.ok
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {status.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            {status.msg}
          </div>
        )}
      </form>
    </section>
  );
}
