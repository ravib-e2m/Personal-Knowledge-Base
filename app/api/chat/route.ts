import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getDefaultUserUuid } from '@/lib/auth';
import { generateEmbedding, assembleContext, getGroqClient } from '@/lib/openai';

export const maxDuration = 60; // Max execution timeout for Groq calls

export async function POST(req: Request) {
  try {
    const userUuid = await getDefaultUserUuid();

    const { message, chatId, collectionId } = await req.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = getServiceRoleSupabaseClient();
    let targetChatId = chatId;

    // 1. Create chat if it's new
    if (!targetChatId || targetChatId === 'new') {
      const title = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      const { data: newChat, error: chatErr } = await supabase
        .from('chats')
        .insert({
          user_id: userUuid,
          collection_id: collectionId && collectionId !== 'all' ? collectionId : null,
          title,
        })
        .select()
        .single();

      if (chatErr) {
        return NextResponse.json({ error: chatErr.message }, { status: 500 });
      }
      targetChatId = newChat.id;
    }

    // 2. Fetch past messages for history (up to 15 messages)
    const { data: history, error: historyErr } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', targetChatId)
      .order('created_at', { ascending: true })
      .limit(15);

    if (historyErr) {
      return NextResponse.json({ error: historyErr.message }, { status: 500 });
    }

    // 3. Save User message to database
    await supabase.from('messages').insert({
      chat_id: targetChatId,
      user_id: userUuid,
      role: 'user',
      content: message,
    });

    // 3.5. Check if this is a greeting BEFORE expensive operations
    const greetingPatterns = /^(hi|hello|hey|greetings|what's up|whats up|yo|howdy|good morning|good afternoon|good evening|hiya|wassup|sup|hey there|hello there|hii|hlo|hola|namaste|thanks|thank you|bye|goodbye|see you)/i;
    const isGreeting = greetingPatterns.test(message.trim()) || message.trim().length < 15;

    let contextText = '';
    let referencedChunks: any[] = [];

    // 4. Execute hybrid search ONLY if NOT a greeting (skip expensive operations)
    if (!isGreeting) {
      const queryEmbedding = await generateEmbedding(message);
      const { data: retrievedChunks, error: searchErr } = await supabase.rpc('hybrid_search_chunks', {
        p_user_id: userUuid,
        p_query: message,
        p_embedding: queryEmbedding,
        p_match_count: 8,
        p_collection_id: collectionId && collectionId !== 'all' ? collectionId : null,
      });

      if (searchErr) {
        console.error('RAG Retrieval search error:', searchErr);
      }

      // 5. Assemble Context
      const assembled = assembleContext(retrievedChunks || [], { tokenBudget: 4000 });
      contextText = assembled.contextText;
      referencedChunks = assembled.referencedChunks;
    }

    // 6. Build Chat Completion Messages
    let systemPrompt = '';
    
    if (isGreeting) {
      // For greetings, always use a friendly greeting response (regardless of context)
      systemPrompt = `You are "Second Brain", a friendly and helpful AI personal knowledge assistant. The user has greeted you.

Respond warmly and naturally (1-2 sentences) as a helpful assistant would. Briefly mention what you can help them with: organizing documents, answering questions from their knowledge base, creating study materials, and more.

Be conversational, warm, and engaging.`;
    } else {
      // Standard RAG-based response for regular questions
      systemPrompt = `You are "Second Brain", an advanced AI personal knowledge assistant.
Answer the user's question using ONLY the provided document chunks as context.
If the context does not contain enough information to answer the question, respond EXACTLY: "I couldn't find relevant information in your knowledge base."
Never hallucinate or make up facts.
When you refer to a fact from a source chunk, cite it inline using the chunk reference number, e.g., [1] or [2] (matching the Reference index in the context).

---
CONTEXT:
${contextText || 'No context available.'}
`;
    }

    const apiMessages: any[] = [{ role: 'system', content: systemPrompt }];

    // Add conversation history
    if (history && history.length > 0) {
      for (const msg of history) {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user query
    apiMessages.push({ role: 'user', content: message });

    // 7. Invoke Groq
    const chatCompletion = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: apiMessages,
      temperature: 0.1,
    });

    const assistantContent = chatCompletion.choices[0].message.content || '';

    // 8. Build citations structure from referenced chunks
    // Format sources nicely for response
    const citations = referencedChunks.map((chunk, idx) => {
      const isPdf = chunk.chunk_metadata?.source_type === 'pdf';
      return {
        refIndex: idx + 1,
        sourceName: chunk.chunk_metadata?.source_name || 'Document',
        sourceType: chunk.chunk_metadata?.source_type || 'unknown',
        storagePath: chunk.chunk_metadata?.storage_path || '',
        headings: chunk.chunk_metadata?.headings || [],
        snippet: chunk.chunk_content.slice(0, 150) + '...',
      };
    });

    // 9. Save assistant message to Database
    const { data: savedMsg, error: saveMsgErr } = await supabase
      .from('messages')
      .insert({
        chat_id: targetChatId,
        user_id: userUuid,
        role: 'assistant',
        content: assistantContent,
        citations,
      })
      .select()
      .single();

    if (saveMsgErr) {
      console.error('Failed to save assistant message:', saveMsgErr);
      // Return response with the assistant content even if DB save fails
      return NextResponse.json({
        chatId: targetChatId,
        message: {
          id: 'temp-' + Date.now(),
          chat_id: targetChatId,
          user_id: userUuid,
          role: 'assistant',
          content: assistantContent,
          citations,
          created_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      chatId: targetChatId,
      message: savedMsg,
    });
  } catch (err) {
    console.error('Chat endpoint failure:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
