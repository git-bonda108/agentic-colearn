import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { routeQuestion, detectWebSearchNeed } from '@/lib/agent-router';
import { AGENT_CONFIGS, MODEL_TYPES, type AgentType, type ModelType } from '@/lib/agent-types';
import { searchWeb, formatSearchSources, type TavilySearchResult } from '@/lib/tavily-search';
import { getPersona, getPersonaSystemPrompt } from '@/lib/personas';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
  modelType?: ModelType;
  personaId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request?.json() as ChatRequest;
    const { messages = [], sessionId, modelType = MODEL_TYPES.OPENAI, personaId } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1]?.content ?? '';

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = await prisma?.chatSession?.create({
        data: {},
      });
      currentSessionId = session?.id ?? '';
    }

    await prisma?.message?.create({
      data: {
        content: userMessage,
        role: 'user',
        sessionId: currentSessionId,
      },
    });

    // Check if persona is selected
    const persona = personaId ? getPersona(personaId) : null;
    
    const routedAgent = routeQuestion(userMessage);
    const agentConfig = AGENT_CONFIGS[routedAgent];
    const needsSearch = detectWebSearchNeed(userMessage);

    let searchResults: TavilySearchResult[] = [];
    let searchContext = '';

    if (needsSearch) {
      searchResults = await searchWeb(userMessage);
      if (searchResults && searchResults.length > 0) {
        searchContext = '\n\nRelevant web search results:\n' + 
          searchResults.map(r => `- ${r?.title ?? ''}: ${r?.content ?? ''}`).join('\n');
      }
    }

    // Use persona system prompt if persona is selected, otherwise use agent config
    const systemMessage = persona 
      ? getPersonaSystemPrompt(persona)
      : agentConfig?.systemPrompt ?? '';
    const enhancedUserMessage = userMessage + searchContext;

    const apiMessages = [
      { role: 'system', content: systemMessage },
      ...messages.slice(0, -1),
      { role: 'user', content: enhancedUserMessage },
    ];

    let apiUrl = '';
    let apiKey = '';
    let model = '';

    if (modelType === MODEL_TYPES.ANTHROPIC) {
      apiUrl = 'https://api.anthropic.com/v1/messages';
      apiKey = process.env.ANTHROPIC_API_KEY ?? '';
      model = 'claude-3-5-sonnet-20241022';
    } else {
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      apiKey = process.env.OPENAI_API_KEY ?? '';
      model = 'gpt-4o';
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(modelType === MODEL_TYPES.ANTHROPIC
          ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
          : { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify(
        modelType === MODEL_TYPES.ANTHROPIC
          ? {
              model,
              max_tokens: 2048,
              messages: apiMessages.filter(m => m?.role !== 'system'),
              system: systemMessage,
              stream: true,
            }
          : {
              model,
              messages: apiMessages,
              stream: true,
              max_tokens: 2048,
            }
      ),
    });

    if (!response?.ok) {
      throw new Error(`API request failed: ${response?.status ?? 'unknown'}`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response?.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let fullContent = '';

        const startData = JSON.stringify({
          type: 'start',
          sessionId: currentSessionId,
          agentType: routedAgent,
          agentName: agentConfig?.name ?? '',
          agentColor: agentConfig?.color ?? '',
          agentIcon: agentConfig?.icon ?? '',
          modelType,
        });
        controller?.enqueue(encoder?.encode(`data: ${startData}\n\n`));

        try {
          while (true) {
            const { done, value } = await reader?.read() ?? { done: true, value: undefined };
            if (done) break;

            const chunk = decoder?.decode(value ?? new Uint8Array(), { stream: true });
            const lines = chunk?.split('\n') ?? [];

            for (const line of lines) {
              const trimmedLine = line?.trim() ?? '';
              if (trimmedLine?.startsWith('data: ')) {
                const data = trimmedLine.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  let content = '';

                  if (modelType === MODEL_TYPES.ANTHROPIC) {
                    if (parsed?.type === 'content_block_delta') {
                      content = parsed?.delta?.text ?? '';
                    }
                  } else {
                    content = parsed?.choices?.[0]?.delta?.content ?? '';
                  }

                  if (content) {
                    fullContent += content;
                    const contentData = JSON.stringify({ type: 'content', content });
                    controller?.enqueue(encoder?.encode(`data: ${contentData}\n\n`));
                  }
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }

          if (searchResults && searchResults.length > 0) {
            const sourcesText = formatSearchSources(searchResults);
            const sourcesData = JSON.stringify({ type: 'content', content: sourcesText });
            controller?.enqueue(encoder?.encode(`data: ${sourcesData}\n\n`));
            fullContent += sourcesText;
          }

          if (currentSessionId) {
            await prisma?.message?.create({
              data: {
                content: fullContent,
                role: 'assistant',
                agentType: routedAgent,
                modelUsed: modelType,
                searchSources: searchResults?.length > 0 ? JSON.parse(JSON.stringify(searchResults)) : null,
                sessionId: currentSessionId,
              },
            });
          }

          const endData = JSON.stringify({ type: 'end' });
          controller?.enqueue(encoder?.encode(`data: ${endData}\n\n`));
        } catch (error) {
          console.error('Stream error:', error);
          controller?.error(error);
        } finally {
          controller?.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}