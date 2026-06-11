'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Brain, Folder, FileText, Globe, Plus, Trash2, Search, 
  BookOpen, Sparkles, LogOut, Layout, BarChart, Settings, 
  HelpCircle, Eye, RefreshCw, Send, X, ArrowUpRight, Copy, Check, FileUp, Layers
} from 'lucide-react';
import { PureMultimodalInput } from '@/components/ui/multimodal-ai-chat-input';
import { getBrowserSupabaseClient } from '@/lib/supabase-browser';

// Definitions matching components
interface Attachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

interface UIMessage {
  id: string;
  content: string;
  role: string;
  attachments?: Attachment[];
  citations?: any[];
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'uploads' | 'notes' | 'collections' | 'chat' | 'search' | 'settings'>('overview');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        router.push('/sign-in');
        return;
      }
      setUserEmail(user.email ?? null);
      setSignedIn(true);
    });
    return () => {
      active = false;
    };
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
    router.refresh();
  };
  
  // App States
  const [collections, setCollections] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    documentsCount: 0,
    notesCount: 0,
    queriesCount: 0,
    chatsCount: 0,
    storageUsed: 0
  });

  // Selection filters
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  
  // Loading states
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Operation loading triggers
  const [ingesting, setIngesting] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [searching, setSearching] = useState(false);
  const [studyModeLoading, setStudyModeLoading] = useState(false);

  // Ingestion inputs
  const [scrapeUrlInput, setScrapeUrlInput] = useState('');
  const [ingestCollectionId, setIngestCollectionId] = useState('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Notes inputs
  const [activeNote, setActiveNote] = useState<any | null>(null); // null means "create mode"
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCollectionId, setNoteCollectionId] = useState('none');

  // Collections CRUD inputs
  const [newCollName, setNewCollName] = useState('');
  const [newCollDesc, setNewCollDesc] = useState('');

  // RAG Chat states
  const [activeChatId, setActiveChatId] = useState<string>('new');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Study Mode state
  const [studyDocumentId, setStudyDocumentId] = useState<string | null>(null);
  const [studyMaterials, setStudyMaterials] = useState<any | null>(null);
  const [activeStudyTab, setActiveStudyTab] = useState<'flashcards' | 'mcqs' | 'viva' | 'revision'>('flashcards');
  const [revealedFlashcards, setRevealedFlashcards] = useState<{ [key: number]: boolean }>({});
  const [mcqAnswers, setMcqAnswers] = useState<{ [key: number]: string }>({});

  // Search screen states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilterCollection, setSearchFilterCollection] = useState('all');
  const [searchFilterSource, setSearchFilterSource] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  // Feedback notifications (toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch collections
  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCollections(false);
    }
  };

  // Fetch documents
  const fetchDocuments = async (colId = selectedCollectionId) => {
    setLoadingDocs(true);
    try {
      const url = colId && colId !== 'all' ? `/api/documents?collectionId=${colId}` : '/api/documents';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Fetch notes
  const fetchNotes = async (colId = selectedCollectionId) => {
    setLoadingNotes(true);
    try {
      const url = colId && colId !== 'all' ? `/api/notes?collectionId=${colId}` : '/api/notes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Initial loads
  useEffect(() => {
    fetchCollections();
    fetchDocuments();
    fetchNotes();
    fetchAnalytics();
  }, []);

  // Update lists when collection filter changes
  useEffect(() => {
    fetchDocuments(selectedCollectionId);
    fetchNotes(selectedCollectionId);
  }, [selectedCollectionId]);

  // Handle PDF file upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      triggerToast('Only PDF files are supported', 'error');
      return;
    }

    setIngesting(true);
    triggerToast('Extracting & indexing document...');
    
    const formData = new FormData();
    formData.append('file', file);
    if (ingestCollectionId && ingestCollectionId !== 'none') {
      formData.append('collectionId', ingestCollectionId);
    }

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast('PDF Ingested successfully!');
        fetchDocuments();
        fetchAnalytics();
      } else {
        const errData = await res.json();
        triggerToast(errData.error || 'Ingest failed', 'error');
      }
    } catch (err) {
      triggerToast('An error occurred during upload', 'error');
    } finally {
      setIngesting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle URL Scrape
  const handleUrlScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrlInput.trim()) return;

    setIngesting(true);
    triggerToast('Scraping & indexing webpage...');

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scrapeUrlInput,
          collectionId: ingestCollectionId !== 'none' ? ingestCollectionId : null
        })
      });

      if (res.ok) {
        triggerToast('URL ingested successfully!');
        setScrapeUrlInput('');
        fetchDocuments();
        fetchAnalytics();
      } else {
        const errData = await res.json();
        triggerToast(errData.error || 'Scrape failed', 'error');
      }
    } catch (err) {
      triggerToast('An error occurred during URL ingestion', 'error');
    } finally {
      setIngesting(false);
    }
  };

  // Handle Note Save/Create
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      triggerToast('Title and content are required', 'error');
      return;
    }

    setSavingNote(true);
    const body: any = {
      title: noteTitle,
      content: noteContent,
      collectionId: noteCollectionId !== 'none' ? noteCollectionId : null,
    };

    if (activeNote) {
      body.id = activeNote.id;
    }

    try {
      const res = await fetch('/api/notes', {
        method: activeNote ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        triggerToast(activeNote ? 'Note updated!' : 'Note created!');
        // Reset editor
        setActiveNote(null);
        setNoteTitle('');
        setNoteContent('');
        setNoteCollectionId('none');
        fetchNotes();
        fetchAnalytics();
      } else {
        const errData = await res.json();
        triggerToast(errData.error || 'Failed to save note', 'error');
      }
    } catch (err) {
      triggerToast('Failed to save note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? All vector embeddings will be removed.')) return;
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Document deleted');
        fetchDocuments();
        fetchAnalytics();
        if (studyDocumentId === id) {
          setStudyDocumentId(null);
          setStudyMaterials(null);
        }
      }
    } catch (err) {
      triggerToast('Failed to delete', 'error');
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Note deleted');
        fetchNotes();
        fetchAnalytics();
        if (activeNote?.id === id) {
          setActiveNote(null);
          setNoteTitle('');
          setNoteContent('');
        }
      }
    } catch (err) {
      triggerToast('Failed to delete note', 'error');
    }
  };

  // Collections CRUD
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollName.trim()) return;

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollName, description: newCollDesc })
      });
      if (res.ok) {
        triggerToast('Collection created!');
        setNewCollName('');
        setNewCollDesc('');
        fetchCollections();
      }
    } catch (err) {
      triggerToast('Failed to create collection', 'error');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Delete this collection? Linked docs/notes will remain but will be unassigned.')) return;
    try {
      const res = await fetch(`/api/collections?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Collection removed');
        if (selectedCollectionId === id) setSelectedCollectionId('all');
        fetchCollections();
        fetchDocuments();
        fetchNotes();
      }
    } catch (err) {
      triggerToast('Failed to remove collection', 'error');
    }
  };

  // Run global search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const colParam = searchFilterCollection !== 'all' ? `&collectionId=${searchFilterCollection}` : '';
      const sourceParam = searchFilterSource !== 'all' ? `&sourceType=${searchFilterSource}` : '';
      
      const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}${colParam}${sourceParam}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        fetchRecentSearches();
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const fetchRecentSearches = async () => {
    try {
      const res = await fetch('/api/search?mode=history');
      if (res.ok) {
        const data = await res.json();
        setRecentSearches(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'search') {
      fetchRecentSearches();
    }
  }, [activeTab]);

  // Run study mode on a document
  const handleLoadStudyMode = async (docId: string) => {
    setStudyDocumentId(docId);
    setActiveTab('uploads'); // keep on uploads panel but show study mode
    setStudyModeLoading(true);
    setStudyMaterials(null);
    setRevealedFlashcards({});
    setMcqAnswers({});
    
    try {
      const res = await fetch(`/api/study-mode?documentId=${docId}`);
      if (res.ok) {
        const data = await res.json();
        setStudyMaterials(data);
      } else {
        triggerToast('Failed to load study materials', 'error');
        setStudyDocumentId(null);
      }
    } catch (err) {
      triggerToast('Failed to connect to study mode API', 'error');
      setStudyDocumentId(null);
    } finally {
      setStudyModeLoading(false);
    }
  };

  // RAG Chat handlers
  const handleSendMessage = useCallback(async ({ input, attachments: currentAttachments }: { input: string; attachments: Attachment[] }) => {
    if (!input.trim()) return;

    const userMsg: UIMessage = {
      id: `temp-${Date.now()}`,
      content: input,
      role: 'user',
      attachments: [...currentAttachments],
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          chatId: activeChatId,
          collectionId: selectedCollectionId !== 'all' ? selectedCollectionId : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveChatId(data.chatId);
        
        const assistantMsg: UIMessage = {
          id: data.message.id,
          content: data.message.content,
          role: 'assistant',
          citations: data.message.citations || [],
        };
        
        setMessages(prev => [...prev, assistantMsg]);
        fetchAnalytics();
      } else {
        triggerToast('Failed to generate response', 'error');
      }
    } catch (err) {
      triggerToast('Error connecting to chat agent', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [activeChatId, selectedCollectionId]);

  const handleStopGenerating = useCallback(() => {
    setIsGenerating(false);
    triggerToast('Cancelled generation');
  }, []);

  // Format bytes to readable string
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Render Tabs
  const renderOverview = () => {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Hello, {userEmail ? userEmail.split('@')[0] : 'User'}!</h1>
            <p className="text-zinc-400 text-sm mt-1">Here is a snapshot of your knowledge workspace.</p>
          </div>
          <button 
            onClick={fetchAnalytics}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAnalytics ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Analytics Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Documents Ingested</span>
              <p className="text-3xl font-bold mt-1.5">{analytics.documentsCount}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Notes Created</span>
              <p className="text-3xl font-bold mt-1.5">{analytics.notesCount}</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
              <Plus className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Semantic Queries</span>
              <p className="text-3xl font-bold mt-1.5">{analytics.queriesCount}</p>
            </div>
            <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl">
              <Search className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Storage Capacity</span>
              <p className="text-3xl font-bold mt-1.5">{formatBytes(analytics.storageUsed)}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Quick upload */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <h3 className="font-bold text-lg text-white">Ingest Knowledge</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Quickly drag a PDF file or paste a target article URL to add it to your semantic index automatically.
            </p>
            <div className="flex flex-col gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 p-8 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-zinc-900/20"
              >
                <FileUp className="w-8 h-8 text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-300">Upload PDF document</span>
                <span className="text-xs text-zinc-500">Max size 25MB</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePdfUpload} 
                  className="hidden" 
                  accept=".pdf"
                  disabled={ingesting} 
                />
              </div>

              <form onSubmit={handleUrlScrape} className="flex gap-2">
                <input 
                  type="url"
                  placeholder="https://example.com/article"
                  value={scrapeUrlInput}
                  onChange={(e) => setScrapeUrlInput(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-600"
                  required
                  disabled={ingesting}
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all flex items-center gap-1.5"
                  disabled={ingesting}
                >
                  <Globe className="w-4 h-4" />
                  Scrape
                </button>
              </form>
            </div>
          </div>

          {/* Quick Stats list */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-white">Recent Notes</h3>
              <p className="text-zinc-400 text-xs mb-4">Your recently saved knowledge notes.</p>
              {notes.length === 0 ? (
                <div className="py-8 text-center text-zinc-600 text-xs">No notes created yet.</div>
              ) : (
                <div className="space-y-3">
                  {notes.slice(0, 3).map(note => (
                    <div 
                      key={note.id} 
                      onClick={() => {
                        setActiveNote(note);
                        setNoteTitle(note.title);
                        setNoteContent(note.content);
                        setNoteCollectionId(note.collection_id || 'none');
                        setActiveTab('notes');
                      }}
                      className="p-3 bg-zinc-950/40 border border-zinc-800 hover:border-zinc-700 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold truncate pr-4 text-zinc-200">{note.title}</span>
                      <ArrowUpRight className="w-4 h-4 text-zinc-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setActiveNote(null);
                setNoteTitle('');
                setNoteContent('');
                setActiveTab('notes');
              }}
              className="w-full text-center py-2.5 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all mt-4"
            >
              Manage Notes &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderUploads = () => {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Document Uploads</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage, ingest, and summarize your PDF and web URL sources.</p>
        </div>

        {/* Search / filter collections & Ingestion Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-500 font-mono">Assign Collection:</label>
              <select 
                value={ingestCollectionId}
                onChange={(e) => setIngestCollectionId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="none">None</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => !ingesting && fileInputRef.current?.click()}
                className={`border border-zinc-800 hover:border-zinc-700 bg-zinc-900/20 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-zinc-900/40 ${ingesting ? 'opacity-50 cursor-wait' : ''}`}
              >
                <FileUp className="w-6 h-6 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-200">Upload PDF Document</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePdfUpload} 
                  className="hidden" 
                  accept=".pdf"
                  disabled={ingesting}
                />
              </div>

              <div className="border border-zinc-800 bg-zinc-900/20 p-6 rounded-2xl flex flex-col justify-center gap-3">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                  <Globe className="w-4 h-4 text-zinc-400" />
                  Scrape Webpage URL
                </span>
                <form onSubmit={handleUrlScrape} className="flex gap-2">
                  <input 
                    type="url"
                    placeholder="https://example.com/blog"
                    value={scrapeUrlInput}
                    onChange={(e) => setScrapeUrlInput(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    required
                    disabled={ingesting}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all"
                    disabled={ingesting}
                  >
                    Ingest
                  </button>
                </form>
              </div>
            </div>

            {/* Ingestion loader */}
            {ingesting && (
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-3 text-xs text-indigo-400 font-semibold animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Embedding and updating your personal index. This may take up to a minute...
              </div>
            )}

            {/* Document list */}
            <div className="space-y-4">
              <h3 className="font-bold text-white text-lg">Your Sources</h3>
              {loadingDocs ? (
                <div className="text-center py-12 text-zinc-500 text-xs">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 bg-zinc-950/20 border border-zinc-900 rounded-2xl text-zinc-600 text-sm">
                  No documents ingested yet. Upload your first PDF above.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className={`p-4 bg-zinc-900/40 border rounded-2xl flex flex-col gap-3 transition-all ${studyDocumentId === doc.id ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800/80 hover:border-zinc-700/80'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl text-xs font-bold ${doc.source_type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {doc.source_type.toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-100 text-sm truncate max-w-[200px] sm:max-w-[400px]">{doc.name}</h4>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                              {doc.source_type === 'pdf' && ` | Size: ${formatBytes(doc.file_size)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadStudyMode(doc.id)}
                            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Study
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete Source"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Display summaries if they exist */}
                      {doc.summary_short && (
                        <div className="p-3 bg-zinc-950/40 rounded-xl space-y-1">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">AI Summary:</span>
                          <p className="text-xs text-zinc-300 italic">"{doc.summary_short}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Study Mode details on the side */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-zinc-800 bg-[#0c0d11] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Study Mode
              </h3>

              {!studyDocumentId ? (
                <div className="py-16 text-center text-zinc-600 text-xs">
                  Select a document's "Study" button to generate AI flashcards, revision notes, MCQs, and viva questions.
                </div>
              ) : studyModeLoading ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-zinc-400 text-xs">Generating study materials with AI...</p>
                </div>
              ) : !studyMaterials ? (
                <div className="py-16 text-center text-zinc-600 text-xs">
                  Failed to load study materials. Try again.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Document selector name */}
                  <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-300 font-semibold truncate pr-4">
                      {documents.find(d => d.id === studyDocumentId)?.name}
                    </span>
                    <button 
                      onClick={() => {
                        setStudyDocumentId(null);
                        setStudyMaterials(null);
                      }}
                      className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Study Tab Headers */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-900 text-[10px] font-bold">
                    <button
                      onClick={() => setActiveStudyTab('flashcards')}
                      className={`py-1.5 rounded-lg text-center transition-all ${activeStudyTab === 'flashcards' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Flash
                    </button>
                    <button
                      onClick={() => setActiveStudyTab('mcqs')}
                      className={`py-1.5 rounded-lg text-center transition-all ${activeStudyTab === 'mcqs' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      MCQs
                    </button>
                    <button
                      onClick={() => setActiveStudyTab('viva')}
                      className={`py-1.5 rounded-lg text-center transition-all ${activeStudyTab === 'viva' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Viva
                    </button>
                    <button
                      onClick={() => setActiveStudyTab('revision')}
                      className={`py-1.5 rounded-lg text-center transition-all ${activeStudyTab === 'revision' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Notes
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="min-h-[200px] max-h-[400px] overflow-y-auto pr-1">
                    {activeStudyTab === 'flashcards' && (
                      <div className="space-y-3">
                        {studyMaterials.flashcards.map((fc: any, index: number) => (
                          <div key={index} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2">
                            <span className="text-[10px] text-zinc-500 font-bold font-mono">QUESTION {index + 1}:</span>
                            <p className="text-xs font-semibold text-zinc-100">{fc.question}</p>
                            
                            {revealedFlashcards[index] ? (
                              <div className="pt-2 border-t border-zinc-900 space-y-1">
                                <span className="text-[10px] text-indigo-400 font-bold font-mono">ANSWER:</span>
                                <p className="text-xs text-zinc-300">{fc.answer}</p>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRevealedFlashcards(prev => ({ ...prev, [index]: true }))}
                                className="w-full text-center py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-[10px] font-bold transition-all"
                              >
                                Reveal Answer
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeStudyTab === 'mcqs' && (
                      <div className="space-y-4">
                        {studyMaterials.mcqs.map((mcq: any, index: number) => (
                          <div key={index} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2">
                            <span className="text-[10px] text-zinc-500 font-bold font-mono">QUESTION {index + 1}:</span>
                            <p className="text-xs font-semibold text-zinc-100">{mcq.question}</p>
                            
                            <div className="grid grid-cols-1 gap-1.5 pt-1.5">
                              {mcq.options.map((opt: string, optIdx: number) => {
                                const isSelected = mcqAnswers[index] === opt;
                                const isCorrect = opt === mcq.answer;
                                const showResult = mcqAnswers[index] !== undefined;

                                let btnStyle = "border-zinc-900 text-zinc-400 hover:bg-zinc-900/60";
                                if (isSelected) {
                                  btnStyle = showResult && isCorrect ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-red-500/50 bg-red-500/10 text-red-400";
                                } else if (showResult && isCorrect) {
                                  btnStyle = "border-emerald-500/30 bg-emerald-500/5 text-emerald-500";
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => !showResult && setMcqAnswers(prev => ({ ...prev, [index]: opt }))}
                                    className={`w-full text-left p-2 border rounded-lg text-xs font-medium transition-all ${btnStyle}`}
                                    disabled={showResult}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeStudyTab === 'viva' && (
                      <div className="space-y-3">
                        <span className="text-[10px] text-zinc-500 font-bold font-mono">VIVA QUESTIONS:</span>
                        {studyMaterials.viva.map((q: string, idx: number) => (
                          <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl text-xs font-medium text-zinc-300">
                            {idx + 1}. {q}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeStudyTab === 'revision' && (
                      <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap break-words">
                        {typeof studyMaterials.revisionNotes === 'string' 
                          ? studyMaterials.revisionNotes 
                          : JSON.stringify(studyMaterials.revisionNotes, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotes = () => {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Knowledge Notes</h1>
          <p className="text-zinc-400 text-sm mt-1">Write down notes, thoughts, and documents. We will chunk and embed them for AI indexing automatically.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Note selector list */}
          <div className="lg:col-span-1 space-y-4">
            <button
              onClick={() => {
                setActiveNote(null);
                setNoteTitle('');
                setNoteContent('');
                setNoteCollectionId('none');
              }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-white text-black font-semibold text-sm rounded-xl hover:bg-zinc-200 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {loadingNotes ? (
                <div className="text-center py-12 text-zinc-500 text-xs">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/10 border border-zinc-900 rounded-2xl text-zinc-600 text-sm">
                  No notes found. Create your first note.
                </div>
              ) : (
                notes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNote(note);
                      setNoteTitle(note.title);
                      setNoteContent(note.content);
                      setNoteCollectionId(note.collection_id || 'none');
                    }}
                    className={`p-4 bg-zinc-900/40 border rounded-2xl cursor-pointer transition-all flex flex-col gap-2 ${activeNote?.id === note.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800/80 hover:border-zinc-700/80'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 text-sm truncate max-w-[150px]">{note.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1 hover:text-red-400 text-zinc-600 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{note.content}</p>
                    <span className="text-[9px] text-zinc-600 font-mono mt-1">
                      Saved: {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Note Editor */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSaveNote} className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">
                  {activeNote ? 'Edit Note' : 'Create Note'}
                </h3>
                {activeNote && (
                  <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] rounded font-semibold font-mono">
                    INDEXED IN RAG
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-zinc-400">Title</label>
                  <input
                    type="text"
                    placeholder="E.g., main takeaway on react rendering"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-600"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-400">Assign Collection</label>
                    <select
                      value={noteCollectionId}
                      onChange={(e) => setNoteCollectionId(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-600"
                    >
                      <option value="none">None</option>
                      {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-zinc-400">Content</label>
                  <textarea
                    placeholder="Draft your knowledge summary here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="min-h-[250px] bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 resize-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {activeNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNote(null);
                      setNoteTitle('');
                      setNoteContent('');
                      setNoteCollectionId('none');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 text-xs font-semibold text-zinc-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 font-bold text-sm rounded-xl transition-all flex items-center gap-2"
                  disabled={savingNote}
                >
                  {savingNote && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {activeNote ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderCollections = () => {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Collections</h1>
          <p className="text-zinc-400 text-sm mt-1">Group your uploads, URLs, and notes into separate thematic folders.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Collection */}
          <div className="lg:col-span-1">
            <form onSubmit={handleCreateCollection} className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-4">
              <h3 className="font-bold text-lg text-white">New Collection</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Name</label>
                <input
                  type="text"
                  placeholder="E.g., College, Personal, Work"
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-4.5 py-2.5 text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400">Description</label>
                <textarea
                  placeholder="Optional brief description..."
                  value={newCollDesc}
                  onChange={(e) => setNewCollDesc(e.target.value)}
                  className="min-h-[100px] bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-white text-black hover:bg-zinc-200 font-bold text-sm rounded-xl transition-all"
              >
                Create
              </button>
            </form>
          </div>

          {/* Collections list */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-white text-lg">Active Collections</h3>
            
            {loadingCollections ? (
              <div className="text-center py-12 text-zinc-500 text-xs">Loading collections...</div>
            ) : collections.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/10 border border-zinc-900 rounded-3xl text-zinc-600 text-sm">
                No collections created. Create your first collection on the side.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {collections.map(coll => (
                  <div key={coll.id} className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Folder className="w-5 h-5 fill-indigo-400/10" />
                        <h4 className="font-bold text-white text-sm">{coll.name}</h4>
                      </div>
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {coll.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] text-zinc-500 font-mono">
                      <span>Saved: {new Date(coll.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleDeleteCollection(coll.id)}
                        className="p-1 hover:text-red-400 text-zinc-600 rounded transition-all"
                        title="Delete Collection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderChat = () => {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col justify-between animate-fade-in relative max-w-4xl mx-auto w-full">
        {/* Chat Header */}
        <div className="pb-4 border-b border-zinc-800 flex items-center justify-between select-none">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Second Brain AI Chat
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5">
              Interact with your personal knowledge base using hybrid retrieval RAG.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Active collection filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Filter:</span>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="all">All Workspace</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <button
              onClick={() => {
                setActiveChatId('new');
                setMessages([]);
              }}
              className="px-3 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition-all"
            >
              New Chat
            </button>
          </div>
        </div>

        {/* Message Logs */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto select-none pt-12">
              <div className="p-4 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-3xl shadow-lg">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-white">Ask your Second Brain</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                What did I upload about React memo? What are my notes on marketing? Ask anything, and I will find it with proper references.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id || index} className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-md">
                        AI
                      </div>
                    )}
                    <div className="space-y-2 max-w-[85%]">
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-zinc-900 text-zinc-100 rounded-tr-none' : 'bg-indigo-500/10 border border-indigo-500/20 text-zinc-200 rounded-tl-none'}`}>
                        {msg.content}
                      </div>

                      {/* Display citations for AI message */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 flex flex-col gap-2 border-t border-zinc-900/60">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">References:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite: any, citeIdx: number) => (
                              <div 
                                key={citeIdx}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 transition-all font-semibold max-w-[180px] truncate"
                                title={`${cite.sourceName} - ${cite.snippet}`}
                              >
                                [{cite.refIndex}] {cite.sourceName}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm border border-zinc-700">
                        {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {isGenerating && (
                <div className="flex items-start gap-4 justify-start animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    AI
                  </div>
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl rounded-tl-none text-sm text-zinc-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Searching semantic workspace and assembling answer...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Integration of the custom input component */}
        <div className="pt-4 border-t border-zinc-900 bg-[#0d0e12]">
          <PureMultimodalInput
            chatId={activeChatId}
            messages={messages}
            attachments={attachments}
            setAttachments={setAttachments}
            onSendMessage={handleSendMessage}
            onStopGenerating={handleStopGenerating}
            isGenerating={isGenerating}
            canSend={!isGenerating}
            selectedVisibilityType="private"
          />
        </div>
      </div>
    );
  };

  const renderSearch = () => {
    return (
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Hybrid Semantic Search</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Search keywords and concept semantics across notes, uploaded files, and parsed URL content.
          </p>
        </div>

        {/* Search Bar form */}
        <form onSubmit={handleSearch} className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus-within:border-zinc-650 flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Type search queries like 'React Memo optimization guide'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-zinc-200"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all flex items-center gap-2"
              disabled={searching}
            >
              {searching && <RefreshCw className="w-4 h-4 animate-spin" />}
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-400 pt-2 font-mono">
            <div className="flex items-center gap-2">
              <span>Collection:</span>
              <select
                value={searchFilterCollection}
                onChange={(e) => setSearchFilterCollection(e.target.value)}
                className="bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-zinc-300 focus:outline-none"
              >
                <option value="all">All</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>Source Type:</span>
              <select
                value={searchFilterSource}
                onChange={(e) => setSearchFilterSource(e.target.value)}
                className="bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-zinc-300 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="pdf">PDFs</option>
                <option value="url">URLs</option>
                <option value="note">Notes</option>
              </select>
            </div>
          </div>
        </form>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
          {/* History */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-white text-sm">Recent Searches</h3>
            {recentSearches.length === 0 ? (
              <div className="text-[11px] text-zinc-600">Search history is empty.</div>
            ) : (
              <div className="space-y-2">
                {recentSearches.map((hist) => (
                  <div
                    key={hist.id}
                    onClick={() => {
                      setSearchQuery(hist.query);
                      setSearchFilterCollection(hist.filters?.collection_id || 'all');
                      setSearchFilterSource(hist.filters?.source_type || 'all');
                    }}
                    className="p-2.5 bg-zinc-950/40 hover:bg-zinc-900/40 rounded-xl cursor-pointer text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-900 transition-all truncate"
                  >
                    {hist.query}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results list */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-bold text-white text-sm">Search Results ({searchResults.length})</h3>
            
            {searching ? (
              <div className="text-center py-12 text-zinc-500 text-xs">Performing search...</div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/10 border border-zinc-900 rounded-3xl text-zinc-650 text-sm">
                No matching results found. Type a query and search.
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((res, index) => (
                  <div key={res.chunk_id || index} className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold uppercase">
                          {res.chunk_metadata?.source_type?.toUpperCase() || 'DOCUMENT'}
                        </span>
                        <h4 className="text-xs font-bold text-zinc-200 truncate max-w-[200px]">{res.chunk_metadata?.source_name}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Match Score: {(res.combined_score * 100).toFixed(1)}%
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                      "...{res.chunk_content}..."
                    </p>
                    
                    {res.chunk_metadata?.section_path && (
                      <div className="text-[9px] text-zinc-600 font-semibold font-mono">
                        Header Stack: {res.chunk_metadata.section_path}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="space-y-8 animate-fade-in max-w-2xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Settings</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure profile connections and API configurations.</p>
        </div>

        <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-white text-base">User Profile</h3>
            <div className="flex items-center gap-4 p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-lg">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{userEmail ? userEmail.split('@')[0] : 'Personal Workspace'}</h4>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{userEmail || 'local@secondbrain.app'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-900">
            <h3 className="font-bold text-white text-base">RAG Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-zinc-950/20 border border-zinc-900 rounded-xl space-y-1">
                <span className="text-zinc-500">Embedding Chunk Size</span>
                <p className="font-bold text-white text-sm">1000 characters</p>
              </div>
              <div className="p-3 bg-zinc-950/20 border border-zinc-900 rounded-xl space-y-1">
                <span className="text-zinc-500">Chunk Overlap</span>
                <p className="font-bold text-white text-sm">200 characters</p>
              </div>
              <div className="p-3 bg-zinc-950/20 border border-zinc-900 rounded-xl space-y-1">
                <span className="text-zinc-500">Embedding Model</span>
                <p className="font-bold text-indigo-400 text-sm">gemini-embedding-001 (768)</p>
              </div>
              <div className="p-3 bg-zinc-950/20 border border-zinc-900 rounded-xl space-y-1">
                <span className="text-zinc-500">Chat & Reasoning Engine</span>
                <p className="font-bold text-indigo-400 text-sm">llama-3.3-70b-versatile (Groq)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!signedIn) {
    return null;
  }

  return (
    <div className="pixel-shell min-h-screen flex font-sans text-zinc-950">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold transition-all animate-bounce ${toastType === 'success' ? 'bg-[#0f172a] text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {toastMessage}
        </div>
      )}

      {/* Navigation Sidebar */}
      <aside className="w-64 border-r border-zinc-900/20 p-5 flex flex-col justify-between hidden md:flex select-none">
        <div className="space-y-8">
          {/* Workspace Title */}
          <div className="flex items-center gap-3 px-1">
            <div className="pixel-logo">
              <Brain className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="font-black text-base tracking-tight text-zinc-950">
              Second Brain
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'overview' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}`}
            >
              <Layout className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('uploads')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'uploads' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}`}
            >
              <FileUp className="w-4 h-4" />
              Uploads
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'notes' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}`}
            >
              <FileText className="w-4 h-4" />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'collections' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}`}
            >
              <Folder className="w-4 h-4" />
              Collections
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'chat' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}`}
            >
              <Brain className="w-4 h-4" />
              AI Chat
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'search' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </nav>
        </div>

        {/* User profile panel */}
        <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-xs font-bold text-white">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-300 leading-none">{userEmail || 'Local User'}</span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">Signed in</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Mobile Navbar headers */}
        <header className="p-4 border-b border-zinc-900/20 flex items-center justify-between md:hidden select-none">
          <div className="flex items-center gap-3">
            <div className="pixel-logo !h-8 !w-8">
              <Brain className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="font-black text-sm text-zinc-950">Second Brain</span>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={activeTab}
              onChange={(e: any) => setActiveTab(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:outline-none font-bold"
            >
              <option value="overview">Overview</option>
              <option value="uploads">Uploads</option>
              <option value="notes">Notes</option>
              <option value="collections">Collections</option>
              <option value="chat">AI Chat</option>
              <option value="search">Search</option>
              <option value="settings">Settings</option>
            </select>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-xs font-bold text-white">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Inner Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-16">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'uploads' && renderUploads()}
          {activeTab === 'notes' && renderNotes()}
          {activeTab === 'collections' && renderCollections()}
          {activeTab === 'chat' && renderChat()}
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>
    </div>
  );
}
