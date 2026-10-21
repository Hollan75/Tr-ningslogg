import { getSetting, setSetting } from '../database';

// Conversations and the coach's memory are stored per profile in the settings table

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string; // raw text as sent to/received from Claude
  savedPasses?: string[]; // names of suggested workouts already saved from this message
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: CoachMessage[];
}

const MAX_CONVERSATIONS = 50;
const MAX_MEMORIES = 60;

const convKey = (profile: string) => `coach_conversations_${profile}`;
const memKey = (profile: string) => `coach_memory_${profile}`;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getSetting(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadConversations(profile: string): Promise<Conversation[]> {
  const list = await readJson<Conversation[]>(convKey(profile), []);
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveConversation(profile: string, conv: Conversation): Promise<void> {
  const list = (await loadConversations(profile)).filter(c => c.id !== conv.id);
  list.unshift(conv);
  await setSetting(convKey(profile), JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
}

export async function deleteConversation(profile: string, id: string): Promise<void> {
  const list = (await loadConversations(profile)).filter(c => c.id !== id);
  await setSetting(convKey(profile), JSON.stringify(list));
}

export function newConversation(): Conversation {
  return { id: `c${Date.now()}`, title: 'Ny konversation', updatedAt: new Date().toISOString(), messages: [] };
}

export async function loadMemories(profile: string): Promise<string[]> {
  return readJson<string[]>(memKey(profile), []);
}

export async function saveMemories(profile: string, memories: string[]): Promise<void> {
  await setSetting(memKey(profile), JSON.stringify(memories.slice(-MAX_MEMORIES)));
}

// Adds new facts, skipping ones already remembered (case-insensitive)
export async function addMemories(profile: string, facts: string[]): Promise<string[]> {
  const current = await loadMemories(profile);
  const seen = new Set(current.map(m => m.toLowerCase()));
  const added = facts.map(f => f.trim()).filter(f => f && !seen.has(f.toLowerCase()));
  if (added.length === 0) return current;
  const next = [...current, ...added];
  await saveMemories(profile, next);
  return next.slice(-MAX_MEMORIES);
}

// ─── Parsing the coach's replies ──────────────────────────────────────────────

const MEMORY_RE = /\[MINNE:\s*([^\]]+)\]/g;
// Labelled ```pass – a ```json block with a "pass" list is accepted too
const PASS_RE = /```(?:pass|json)\s*\n?(\{\s*"pass"[\s\S]*?)```/g;

export interface SuggestedPass {
  json: string; // import-format JSON for importTemplatesFromJson
  names: string[]; // workout names in the block
  error: string | null;
}

export interface ParsedReply {
  text: string; // what is shown in the bubble
  memories: string[];
  passes: SuggestedPass[];
}

function allMatches(re: RegExp, text: string): string[] {
  const out: string[] = [];
  const r = new RegExp(re.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = r.exec(text))) out.push(m[1]);
  return out;
}

export function parseReply(raw: string): ParsedReply {
  const memories = allMatches(MEMORY_RE, raw).map(m => m.trim());
  const passes: SuggestedPass[] = allMatches(PASS_RE, raw).map(m => {
    const json = m.trim();
    try {
      const data = JSON.parse(json) as { pass?: { namn?: string }[] };
      const names = (data.pass ?? []).map(p => String(p.namn ?? '')).filter(Boolean);
      return { json, names, error: names.length ? null : 'Hittade inga pass i förslaget' };
    } catch {
      return { json, names: [], error: 'Förslaget kunde inte läsas' };
    }
  });
  const text = raw
    .replace(PASS_RE, '')
    .replace(MEMORY_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, memories, passes };
}

// Short title from the first question
export function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}
