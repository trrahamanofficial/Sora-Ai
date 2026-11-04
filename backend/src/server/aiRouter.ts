import { GoogleGenAI } from '@google/genai';

export interface ProviderRecord {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  apiKey: string; // Decrypted at runtime in backend
  defaultModel: string;
  baseUrl: string;
  priority: number;
  supportsBengali: boolean;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  lastTestedAt?: string;
  lastSuccessfulRequestAt?: string;
  lastStatus?: string;
  lastErrorMessage?: string;
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerationResult {
  text: string;
  providerId: string;
  model: string;
  latencyMs: number;
}

const PROVIDER_TIMEOUT_MS = 45_000;
async function providerFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
}
async function withProviderTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`AI provider request timed out after ${PROVIDER_TIMEOUT_MS} ms.`)), PROVIDER_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// In-memory runtime configuration store initialized with defaults and synced with DB/env
export const inMemoryProviders: Record<string, ProviderRecord> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    displayName: 'Google Gemini (Flash/Pro)',
    enabled: true, // Enabled by default using server env key
    apiKey: process.env.GEMINI_API_KEY || '',
    defaultModel: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    priority: 1,
    supportsBengali: true,
    systemPrompt:
      'You are SORA, an advanced personal voice assistant. You are capable of speaking both Bengali and English fluently. Keep answers concise, direct, helpful, and natural for voice conversation. If the user talks in Bengali, respond in fluent Bengali. If in English, respond in English.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: process.env.GEMINI_API_KEY ? 'operational' : 'untested',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI (GPT-4o)',
    enabled: !!process.env.OPENAI_API_KEY,
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    priority: 2,
    supportsBengali: true,
    systemPrompt:
      'You are SORA, an advanced personal voice assistant. Keep answers concise, natural for voice speech, and bilingual in Bengali & English.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    displayName: 'Anthropic Claude 3.5',
    enabled: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com/v1',
    priority: 3,
    supportsBengali: true,
    systemPrompt: 'You are SORA voice assistant. Be concise, direct, and conversational.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    displayName: 'DeepSeek AI (V3/R1)',
    enabled: !!process.env.DEEPSEEK_API_KEY,
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    priority: 4,
    supportsBengali: true,
    systemPrompt: 'You are SORA voice assistant. Provide fast, precise, and conversational responses.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  grok: {
    id: 'grok',
    name: 'xAI Grok',
    displayName: 'xAI Grok 2',
    enabled: !!process.env.GROK_API_KEY,
    apiKey: process.env.GROK_API_KEY || '',
    defaultModel: 'grok-2',
    baseUrl: 'https://api.x.ai/v1',
    priority: 5,
    supportsBengali: true,
    systemPrompt: 'You are SORA, an intelligent, quick, and charismatic voice assistant.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    displayName: 'Mistral Large',
    enabled: !!process.env.MISTRAL_API_KEY,
    apiKey: process.env.MISTRAL_API_KEY || '',
    defaultModel: 'mistral-large-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    priority: 6,
    supportsBengali: true,
    systemPrompt: 'You are SORA voice assistant. Answer concisely and politely.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    displayName: 'Cohere Command R+',
    enabled: !!process.env.COHERE_API_KEY,
    apiKey: process.env.COHERE_API_KEY || '',
    defaultModel: 'command-r-plus',
    baseUrl: 'https://api.cohere.ai/v2',
    priority: 7,
    supportsBengali: false,
    systemPrompt: 'You are SORA voice assistant. Answer concisely.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    displayName: 'Perplexity Sonar',
    enabled: !!process.env.PERPLEXITY_API_KEY,
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    defaultModel: 'sonar-pro',
    baseUrl: 'https://api.perplexity.ai',
    priority: 8,
    supportsBengali: true,
    systemPrompt: 'You are SORA voice assistant with live web search awareness. Keep voice answers succinct.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  qwen: {
    id: 'qwen',
    name: 'Alibaba Qwen',
    displayName: 'Alibaba Qwen Max',
    enabled: !!process.env.QWEN_API_KEY,
    apiKey: process.env.QWEN_API_KEY || '',
    defaultModel: 'qwen-max',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    priority: 9,
    supportsBengali: true,
    systemPrompt: 'You are SORA voice assistant. Be helpful, concise, and accurate.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
  llama: {
    id: 'llama',
    name: 'Meta Llama',
    displayName: 'Meta Llama 3.3 (Groq/Direct)',
    enabled: !!process.env.GROQ_API_KEY || !!process.env.LLAMA_API_KEY,
    apiKey: process.env.GROQ_API_KEY || process.env.LLAMA_API_KEY || '',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    priority: 10,
    supportsBengali: true,
    systemPrompt: 'You are SORA voice assistant. Keep answers ultra-fast and conversational.',
    temperature: 0.7,
    maxTokens: 2048,
    lastStatus: 'untested',
  },
};

// Automatic Provider Selector
export function getEligibleProviders(
  requestedProviderId?: string,
  isBengaliPrompt: boolean = false
): ProviderRecord[] {
  // A manually preferred provider is tried first, but failures still fall back
  // to the remaining enabled providers instead of stopping the request.
  const preferred = requestedProviderId && requestedProviderId !== 'auto'
    ? inMemoryProviders[requestedProviderId.toLowerCase()]
    : undefined;

  // Auto-selection algorithm:
  // 1. Filter enabled providers that have an API key (or gemini with env key)
  const candidates = Object.values(inMemoryProviders).filter((p) => {
    const hasKey = !!p.apiKey || (p.id === 'gemini' && !!process.env.GEMINI_API_KEY);
    return p.enabled && hasKey;
  });

  if (candidates.length === 0) {
    return [];
  }

  // 2. Sort by priority and suitability for Bengali if needed
  candidates.sort((a, b) => {
    if (preferred) {
      if (a.id === preferred.id) return -1;
      if (b.id === preferred.id) return 1;
    }
    if (isBengaliPrompt) {
      if (a.supportsBengali && !b.supportsBengali) return -1;
      if (!a.supportsBengali && b.supportsBengali) return 1;
    }
    return a.priority - b.priority;
  });

  return candidates;
}

// Automatic Provider Selector (returns top candidate)
export function selectBestProvider(
  requestedProviderId?: string,
  isBengaliPrompt: boolean = false
): ProviderRecord | null {
  const eligible = getEligibleProviders(requestedProviderId, isBengaliPrompt);
  return eligible.length > 0 ? eligible[0] : null;
}

// Universal Call Executor
export async function callProvider(
  provider: ProviderRecord,
  messages: ChatMessagePayload[],
  language: 'bn' | 'en' = 'en',
  systemPromptOverride?: string
): Promise<GenerationResult> {
  const startTime = Date.now();
  const apiKey = provider.apiKey || (provider.id === 'gemini' ? process.env.GEMINI_API_KEY || '' : '');

  if (!apiKey) {
    throw new Error(`Provider ${provider.name} is enabled but has no API key configured.`);
  }

  const systemMessage =
    systemPromptOverride || provider.systemPrompt ||
    `You are SORA, an advanced personal voice assistant. Respond in ${
      language === 'bn' ? 'Bengali' : 'English'
    }. Keep responses concise and suitable for spoken output.`;

  // 1. Google Gemini via @google/genai SDK
  if (provider.id === 'gemini') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const userPrompt = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const response = await withProviderTimeout<any>(ai.models.generateContent({
        model: provider.defaultModel || 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemMessage,
          temperature: provider.temperature ?? 0.7,
          maxOutputTokens: provider.maxTokens ?? 2048,
        },
      }));

      const text = response.text || '';
      if (!text.trim()) {
        throw new Error('Gemini returned an empty response.');
      }

      return {
        text,
        providerId: 'gemini',
        model: provider.defaultModel || 'gemini-2.5-flash',
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      let rawMsg = err.message || '';
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.error?.message) {
          rawMsg = parsed.error.message;
        }
      } catch {}

      if (rawMsg.includes('free tier is not available') || rawMsg.includes('PERMISSION_DENIED')) {
        throw new Error(
          'Gemini API requires a billing-enabled key or upgrade for this project. You can select a billing-enabled key in Settings > Secrets or configure another provider in the Admin Console (/admin.html).'
        );
      }
      throw new Error(`Google Gemini Error: ${rawMsg}`);
    }
  }

  // 2. Anthropic Claude
  if (provider.id === 'claude') {
    const formattedMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const response = await providerFetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.defaultModel || 'claude-3-5-sonnet-20241022',
        system: systemMessage,
        messages: formattedMessages,
        max_tokens: provider.maxTokens ?? 2048,
        temperature: provider.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const text = data.content?.[0]?.text || '';
    if (!text.trim()) throw new Error('Claude returned an empty response.');
    return {
      text,
      providerId: 'claude',
      model: provider.defaultModel,
      latencyMs: Date.now() - startTime,
    };
  }

  // 3. Cohere V2
  if (provider.id === 'cohere') {
    const response = await providerFetch(`${provider.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.defaultModel || 'command-r-plus',
        messages: [
          { role: 'system', content: systemMessage },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cohere API error (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const text = data.message?.content?.[0]?.text || '';
    if (!text.trim()) throw new Error('Cohere returned an empty response.');
    return {
      text,
      providerId: 'cohere',
      model: provider.defaultModel,
      latencyMs: Date.now() - startTime,
    };
  }

  // 4. OpenAI & OpenAI-compatible providers:
  // OpenAI, DeepSeek, xAI Grok, Mistral, Perplexity, Qwen, Llama
  const fullMessages = [
    { role: 'system', content: systemMessage },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const targetUrl = provider.baseUrl.endsWith('/chat/completions')
    ? provider.baseUrl
    : `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await providerFetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider.defaultModel,
      messages: fullMessages,
      temperature: provider.temperature ?? 0.7,
      max_tokens: provider.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${provider.name} API error (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text.trim()) {
    throw new Error(`${provider.name} returned an empty response.`);
  }

  return {
    text,
    providerId: provider.id,
    model: provider.defaultModel,
    latencyMs: Date.now() - startTime,
  };
}

// Provider Connection Tester
export async function testProvider(providerId: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const p = inMemoryProviders[providerId.toLowerCase()];
  if (!p) {
    return { success: false, message: `Unknown provider: ${providerId}` };
  }

  const apiKey = p.apiKey || (p.id === 'gemini' ? process.env.GEMINI_API_KEY || '' : '');
  if (!apiKey) {
    return {
      success: false,
      message: `No API key configured for ${p.name}. Please enter a key in the admin panel.`,
    };
  }

  const startTime = Date.now();
  try {
    const testResult = await callProvider(
      p,
      [{ role: 'user', content: 'Echo "SORA Operational" in 2 words.' }],
      'en'
    );
    const latency = Date.now() - startTime;
    p.lastStatus = 'operational';
    p.lastTestedAt = new Date().toISOString();
    p.lastSuccessfulRequestAt = p.lastTestedAt;
    p.lastErrorMessage = undefined;
    return {
      success: true,
      message: `Connected successfully! Response: "${testResult.text.trim().slice(0, 60)}"`,
      latencyMs: latency,
    };
  } catch (err: any) {
    p.lastStatus = 'error';
    p.lastTestedAt = new Date().toISOString();
    p.lastErrorMessage = err.message || 'Connection failed';
    return {
      success: false,
      message: `Connection failed: ${err.message || 'Unknown error'}`,
    };
  }
}
