import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

if (!geminiApiKey) {
  console.warn('Warning: GEMINI_API_KEY is not set. Embedding generation will fail.');
}

if (!groqApiKey) {
  console.warn('Warning: GROQ_API_KEY is not set. Chat and summary features will fail.');
}

let geminiClient: GoogleGenerativeAI | null = null;
let groqClient: OpenAI | null = null;

interface OpenAIError {
  message?: string;
  status?: number;
  code?: string;
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

function getGeminiClient() {
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env.local to generate embeddings.');
  }

  geminiClient ??= new GoogleGenerativeAI(geminiApiKey);

  return geminiClient;
}

export function getGroqClient() {
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to .env.local to use chat, summaries, and study mode.');
  }

  groqClient ??= new OpenAI({
    apiKey: groqApiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  return groqClient;
}

// Default model to use for Groq
const GROQ_CHAT_MODEL = 'llama-3.3-70b-versatile';

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
    
    const result = await model.embedContent(text.replace(/\n/g, ' '));

    const embedding = result.embedding?.values;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding response from Gemini');
    }

    return embedding;
  } catch (error) {
    const message = getErrorMessage(error) || 'Unknown Gemini error';
    throw new Error(`Gemini embedding failed: ${message}`);
  }
}

interface RetrievedChunk {
  chunk_id: string;
  doc_id: string | null;
  note_id: string | null;
  chunk_content: string;
  chunk_metadata: {
    source_name?: string;
    [key: string]: unknown;
  };
  combined_score: number;
}

interface ContextAssemblyOptions {
  tokenBudget?: number; // In tokens (approx. 4 chars per token)
}

/**
 * Assemblies RAG context by deduplicating, budgeting tokens, and reordering chunks (lost-in-the-middle prevention)
 */
export function assembleContext(
  chunks: RetrievedChunk[],
  options: ContextAssemblyOptions = {}
) {
  const tokenBudget = options.tokenBudget || 6000;
  let currentTokenCount = 0;
  const uniqueChunks: RetrievedChunk[] = [];
  const seenIds = new Set<string>();

  // 1. Deduplication & Token Budgeting
  for (const chunk of chunks) {
    if (seenIds.has(chunk.chunk_id)) continue;
    seenIds.add(chunk.chunk_id);

    const estTokens = Math.ceil(chunk.chunk_content.length / 4);
    if (currentTokenCount + estTokens > tokenBudget) {
      break;
    }

    uniqueChunks.push(chunk);
    currentTokenCount += estTokens;
  }

  // 2. Lost-in-the-middle prevention (Reordering)
  const reorderedChunks: RetrievedChunk[] = [];
  let insertAtStart = true;

  for (const chunk of uniqueChunks) {
    if (insertAtStart) {
      reorderedChunks.unshift(chunk);
    } else {
      reorderedChunks.push(chunk);
    }
    insertAtStart = !insertAtStart;
  }

  // 3. Context Construction
  const contextText = reorderedChunks
    .map((chunk, idx) => {
      const sourceName = chunk.chunk_metadata?.source_name || (chunk.doc_id ? 'Document' : 'Note');
      return `[Chunk Reference: ${idx + 1} | Source: ${sourceName}]\n${chunk.chunk_content}`;
    })
    .join('\n\n---\n\n');

  return {
    contextText,
    referencedChunks: reorderedChunks,
  };
}

/**
 * Generate summaries (Short and Detailed) for an uploaded document using Groq
 */
export async function generateDocumentSummaries(documentText: string): Promise<{ short: string; detailed: string }> {
  const truncatedText = documentText.slice(0, 25000);

  const prompt = `You are an expert summarizing agent. Analyze the following document text and output a JSON object with two fields:
"short": A concise one-sentence high-level summary of the document.
"detailed": A detailed multi-paragraph summary outlining the main points, structure, and key takeaways.

Document text:
${truncatedText}

Output valid JSON only. Do not include markdown code block formatting.`;

  const response = await getGroqClient().chat.completions.create({
    model: GROQ_CHAT_MODEL,
    messages: [
      { role: 'system', content: 'You only output JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content || '{}';
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse summaries JSON from Groq:', error);
    return {
      short: 'Summary unavailable.',
      detailed: 'Summary generation failed.',
    };
  }
}

/**
 * Generate Study materials (Flashcards, MCQs, Viva, Revision Notes) using Groq
 */
export async function generateStudyMaterial(
  documentText: string
): Promise<{
  flashcards: { question: string; answer: string }[];
  mcqs: { question: string; options: string[]; answer: string }[];
  viva: string[];
  revisionNotes: string;
}> {
  const truncatedText = documentText.slice(0, 20000);

  const prompt = `You are an expert AI teacher. Create study materials based on the following text.
Output a JSON object with the exact keys:
"flashcards": array of objects with keys "question" and "answer" (create 5 flashcards)
"mcqs": array of objects with keys "question" (string), "options" (array of 4 options), and "answer" (string matching one of the options) (create 5 MCQs)
"viva": array of 5 common viva/interview questions about the content
"revisionNotes": a markdown formatted string (not an object) summarizing key formulas, concepts, and facts.

Content text:
${truncatedText}

Output valid JSON only. Do not include markdown formatting around the JSON itself.`;

  // Use Groq for study materials
  try {
    const response = await getGroqClient().chat.completions.create({
      model: GROQ_CHAT_MODEL,
      messages: [
        { role: 'system', content: 'You only output JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    try {
      const parsed = JSON.parse(content);
      
      // Ensure revisionNotes is a string; if it's an object, convert it
      if (typeof parsed.revisionNotes === 'object' && parsed.revisionNotes !== null) {
        // Convert object to markdown string
        parsed.revisionNotes = Object.entries(parsed.revisionNotes)
          .map(([key, value]: [string, any]) => `**${key}**\n${value}`)
          .join('\n\n');
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse study materials JSON from Groq:', error);
      return {
        flashcards: [],
        mcqs: [],
        viva: [],
        revisionNotes: 'Study material generation failed due to parsing error.',
      };
    }
  } catch (groqErr) {
    console.error('Groq study material generation failed:', groqErr);
    return {
      flashcards: [],
      mcqs: [],
      viva: [],
      revisionNotes: 'Study material generation failed. Please try again.',
    };
  }
}
