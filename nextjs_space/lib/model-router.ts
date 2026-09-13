/**
 * Multi-Model Router with intelligent fallback.
 *
 * Routes each task tier to a chain of providers, ordered by capability/cost.
 * Providers with no API key configured are skipped automatically, so the
 * chain adapts to whichever keys are present in the environment.
 *
 * Tiers:
 *  - reasoning: complex tasks (rubric evaluation, 5-mark grading, study plans)
 *  - standard:  lesson content, question generation
 *  - fast:      simple MCQs, hints, classification (cheapest models)
 */

export type ModelTier = 'reasoning' | 'standard' | 'fast';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCallOptions {
  tier?: ModelTier;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  /** When true, instructs the model to return strict JSON and parses it. */
  json?: boolean;
  /** Abort if a single provider takes longer than this (ms). */
  timeoutMs?: number;
}

export interface LLMResult<T = string> {
  content: T;
  provider: string;
  model: string;
  attempts: { provider: string; model: string; error?: string }[];
  latencyMs: number;
}

type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'deepseek';

interface ProviderSpec {
  id: ProviderId;
  model: string;
  envKey: string;
}

/** Fallback chains per tier — first available provider wins, on error we cascade. */
const TIER_CHAINS: Record<ModelTier, ProviderSpec[]> = {
  reasoning: [
    { id: 'openai', model: 'gpt-4o', envKey: 'OPENAI_API_KEY' },
    { id: 'anthropic', model: 'claude-opus-5', envKey: 'ANTHROPIC_API_KEY' },
    { id: 'gemini', model: 'gemini-2.5-pro', envKey: 'GEMINI_API_KEY' },
    { id: 'deepseek', model: 'deepseek-chat', envKey: 'DEEPSEEK_API_KEY' },
  ],
  standard: [
    { id: 'openai', model: 'gpt-4o', envKey: 'OPENAI_API_KEY' },
    { id: 'anthropic', model: 'claude-sonnet-5', envKey: 'ANTHROPIC_API_KEY' },
    { id: 'gemini', model: 'gemini-2.5-flash', envKey: 'GEMINI_API_KEY' },
    { id: 'groq', model: 'llama-3.3-70b-versatile', envKey: 'GROQ_API_KEY' },
  ],
  fast: [
    { id: 'openai', model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY' },
    { id: 'gemini', model: 'gemini-2.5-flash', envKey: 'GEMINI_API_KEY' },
    { id: 'anthropic', model: 'claude-haiku-4-5', envKey: 'ANTHROPIC_API_KEY' },
    { id: 'groq', model: 'llama-3.1-8b-instant', envKey: 'GROQ_API_KEY' },
    { id: 'deepseek', model: 'deepseek-chat', envKey: 'DEEPSEEK_API_KEY' },
  ],
};

function keyFor(spec: ProviderSpec): string | undefined {
  const v = process.env[spec.envKey];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Daily cost cap: a hard ceiling on LLM calls per calendar day so a runaway
 * loop or an enthusiastic child can never produce a surprise bill.
 * Configure with DAILY_LLM_CALL_CAP (default 500; 0 disables the cap).
 * In-memory per server process — a deliberate prototype simplification,
 * documented in docs/DEPLOYMENT.md; production moves this to the DB.
 */
const dailyUsage = { date: '', calls: 0 };

function checkDailyCap(): void {
  const cap = parseInt(process.env.DAILY_LLM_CALL_CAP ?? '500', 10);
  if (!Number.isInteger(cap) || cap <= 0) return;
  const today = new Date().toISOString().slice(0, 10);
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.calls = 0;
  }
  if (dailyUsage.calls >= cap) {
    throw new Error(
      `Daily AI budget reached (${cap} calls). Practice with existing questions today, or raise DAILY_LLM_CALL_CAP.`
    );
  }
  dailyUsage.calls += 1;
}

async function callProvider(
  spec: ProviderSpec,
  apiKey: string,
  opts: LLMCallOptions,
  signal: AbortSignal
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 0.7;
  const messages = opts.messages;

  if (spec.id === 'anthropic') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const rest = messages.filter((m) => m.role !== 'system');
    // Claude 5-family models reject `temperature` (400) and spend part of the
    // output budget on adaptive thinking, so omit sampling params and floor
    // max_tokens high enough that the visible answer isn't truncated.
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: spec.model,
        max_tokens: Math.max(maxTokens, 8192),
        ...(system ? { system } : {}),
        messages: rest,
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    if (data?.stop_reason === 'refusal') throw new Error('anthropic refusal');
    const text = (data?.content ?? [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b?.text ?? '')
      .join('');
    return text;
  }

  if (spec.id === 'gemini') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${spec.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            ...(opts.json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '';
  }

  // OpenAI-compatible chat completions: openai, groq, deepseek
  const baseUrls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    deepseek: 'https://api.deepseek.com/v1',
  };
  const res = await fetch(`${baseUrls[spec.id]}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: spec.model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${spec.id} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

/** Extract the first JSON object/array from a possibly fenced or chatty response. */
export function extractJson<T = any>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    if (start >= 0) {
      // Walk from the end to find a parseable prefix
      for (let end = cleaned.length; end > start; end--) {
        const candidate = cleaned.slice(start, end);
        try {
          return JSON.parse(candidate) as T;
        } catch {
          /* keep shrinking */
        }
      }
    }
    throw new Error(`No parseable JSON in model response (${cleaned.slice(0, 120)}...)`);
  }
}

/**
 * Call the best available model for a tier, cascading through the fallback
 * chain on any error (bad key, rate limit, timeout, empty response).
 */
export async function callLLM(opts: LLMCallOptions): Promise<LLMResult<string>> {
  const tier = opts.tier ?? 'standard';
  const started = Date.now();
  const attempts: LLMResult['attempts'] = [];

  checkDailyCap();

  const chain = TIER_CHAINS[tier].filter((spec) => keyFor(spec));
  if (chain.length === 0) {
    throw new Error(
      `No API keys configured for tier "${tier}". Set at least one of: ${TIER_CHAINS[tier]
        .map((s) => s.envKey)
        .join(', ')}`
    );
  }

  let lastError: unknown = null;
  for (const spec of chain) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
    try {
      const jsonNudge: LLMMessage[] = opts.json
        ? [
            {
              role: 'system' as const,
              content:
                'Respond ONLY with valid JSON. No markdown fences, no commentary before or after.',
            },
          ]
        : [];
      const content = await callProvider(
        spec,
        keyFor(spec)!,
        { ...opts, messages: [...jsonNudge, ...opts.messages] },
        controller.signal
      );
      if (!content || content.trim().length === 0) throw new Error('empty response');
      if (opts.json) extractJson(content); // validate parseability before accepting
      attempts.push({ provider: spec.id, model: spec.model });
      return {
        content,
        provider: spec.id,
        model: spec.model,
        attempts,
        latencyMs: Date.now() - started,
      };
    } catch (err: any) {
      lastError = err;
      attempts.push({ provider: spec.id, model: spec.model, error: String(err?.message ?? err) });
      console.warn(`[model-router] ${spec.id}/${spec.model} failed: ${err?.message ?? err}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `All providers failed for tier "${tier}". Attempts: ${attempts
      .map((a) => `${a.provider}(${a.error ?? 'ok'})`)
      .join(' → ')}. Last: ${String((lastError as any)?.message ?? lastError)}`
  );
}

/** Convenience: call and parse a JSON response in one step. */
export async function callLLMJson<T = any>(opts: Omit<LLMCallOptions, 'json'>): Promise<LLMResult<T>> {
  const res = await callLLM({ ...opts, json: true });
  return { ...res, content: extractJson<T>(res.content) };
}
