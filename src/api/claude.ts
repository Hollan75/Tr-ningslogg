// Raw HTTP is used on purpose: the official @anthropic-ai/sdk does not support the
// React Native/Hermes runtime, while the Messages API works fine through fetch.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ContentBlock {
  type: string;
  text?: string;
}

interface ClaudeResponse {
  content: ContentBlock[];
  stop_reason: string | null;
  model: string;
}

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5-5';

export async function sendToClaude(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY saknas i .env');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Server-side fallback: if a request is declined it is retried on a fallback model
      'anthropic-beta': 'server-side-fallback-2026-07-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      fallbacks: 'default',
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    if (res.status === 401) throw new Error('Ogiltig API-nyckel (401). Kontrollera .env.');
    if (res.status === 429) throw new Error('För många förfrågningar just nu – försök igen om en stund.');
    if (res.status >= 500) throw new Error(`Claude är tillfälligt otillgänglig (${res.status}). Försök igen.`);
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const data: ClaudeResponse = await res.json();

  if (data.stop_reason === 'refusal') {
    throw new Error('Coachen kunde inte svara på den frågan. Försök formulera om den.');
  }

  // The model may return thinking blocks before the answer – keep only the text
  const text = data.content
    .filter(b => b.type === 'text' && b.text)
    .map(b => b.text)
    .join('\n\n')
    .trim();
  if (!text) throw new Error('Inget textsvar från Claude');

  if (data.stop_reason === 'max_tokens') {
    return `${text}\n\n…(svaret blev för långt och kortades av)`;
  }
  return text;
}
