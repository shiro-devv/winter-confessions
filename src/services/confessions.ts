import { AppError } from '../db/errors';
import { supabase } from '../lib/supabase';
import { LIMITS, cleanText } from './validation';
import { getVisitorId } from './visitor';

/** At most `max` confessions per sender within `windowMs` (enforced by the database). */
export const RATE_LIMIT = { windowMs: 60_000, max: 3 } as const;

export const REACTION_KINDS = ['snowflake', 'heart', 'gasp'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export type PromptCategory = 'ask' | 'confess' | 'never' | 'words';

export interface Prompt {
  id: string;
  text: string;
  category: PromptCategory;
}

/** A confession as the UI reads it. Timestamps are epoch milliseconds. */
export interface Confession {
  id: string;
  recipientId: string;
  body: string;
  promptId: string | null;
  promptText: string | null;
  readAt: number | null;
  answer: string | null;
  answeredAt: number | null;
  isPublic: boolean;
  createdAt: number;
}

interface ConfessionRow {
  id: string;
  recipient_id: string;
  body: string;
  prompt_id: string | null;
  read_at: string | null;
  answer: string | null;
  answered_at: string | null;
  is_public: boolean;
  created_at: string;
  prompt: { text: string } | { text: string }[] | null;
}

const CONFESSION_COLUMNS =
  'id, recipient_id, body, prompt_id, read_at, answer, answered_at, is_public, created_at, prompt:prompts(text)';

function toTime(value: string | null): number | null {
  return value ? Date.parse(value) : null;
}

function toConfession(row: ConfessionRow): Confession {
  const prompt = Array.isArray(row.prompt) ? row.prompt[0] : row.prompt;
  return {
    id: row.id,
    recipientId: row.recipient_id,
    body: row.body,
    promptId: row.prompt_id,
    promptText: prompt?.text ?? null,
    readAt: toTime(row.read_at),
    answer: row.answer,
    answeredAt: toTime(row.answered_at),
    isPublic: row.is_public,
    createdAt: Date.parse(row.created_at),
  };
}

function storageError(): AppError {
  return new AppError('storage', 'We could not reach your inbox. Check your connection and try again.');
}

export interface SendInput {
  recipientUsername: string;
  body: string;
  promptId: string | null;
}

export async function sendConfession({
  recipientUsername,
  body,
  promptId,
}: SendInput): Promise<void> {
  const cleaned = cleanText(body);
  if (cleaned.length === 0) {
    throw new AppError('validation', 'Your confession is empty. Write something before sending.');
  }
  if (cleaned.length > LIMITS.confessionMax) {
    throw new AppError(
      'validation',
      `Confessions can be up to ${LIMITS.confessionMax} characters. Trim ${
        cleaned.length - LIMITS.confessionMax
      } to send it.`,
    );
  }

  const { error } = await supabase.rpc('send_confession', {
    p_username: recipientUsername,
    p_body: cleaned,
    p_prompt: promptId,
    p_fp: getVisitorId(),
  });

  if (!error) return;

  const message = error.message.toLowerCase();
  if (message.includes('rate_limited')) {
    throw new AppError(
      'rate_limited',
      'You are sending confessions very quickly. Wait a minute, then send your next one.',
    );
  }
  if (message.includes('not_found')) {
    throw new AppError(
      'not_found',
      'That profile does not exist, so nothing was sent. Check the link and try again.',
    );
  }
  if (message.includes('invalid_body')) {
    throw new AppError('validation', 'Your confession needs between 1 and 500 characters.');
  }
  throw storageError();
}

/** Newest first. */
export async function inboxFor(userId: string): Promise<Confession[]> {
  const { data, error } = await supabase
    .from('confessions')
    .select(CONFESSION_COLUMNS)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw storageError();
  return (data as ConfessionRow[]).map(toConfession);
}

export async function unreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('confessions')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);

  if (error) return 0;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('confessions')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw storageError();
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('confessions')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);

  if (error) throw storageError();
}

export async function answerConfession(
  confessionId: string,
  answerInput: string,
  isPublic: boolean,
): Promise<void> {
  const answer = cleanText(answerInput);
  if (answer.length === 0) {
    throw new AppError('validation', 'Your answer is empty. Write a reply before saving.');
  }
  if (answer.length > LIMITS.answerMax) {
    throw new AppError(
      'validation',
      `Answers can be up to ${LIMITS.answerMax} characters. Please shorten yours.`,
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('confessions')
    .update({ answer, answered_at: now, is_public: isPublic, read_at: now })
    .eq('id', confessionId);

  if (error) throw storageError();
}

export async function removeConfession(confessionId: string): Promise<void> {
  const { error } = await supabase.from('confessions').delete().eq('id', confessionId);
  if (error) throw storageError();
}

/** Publicly answered confessions for a profile page, newest answer first. */
export async function publicAnswered(recipientId: string): Promise<Confession[]> {
  const { data, error } = await supabase
    .from('confessions')
    .select(CONFESSION_COLUMNS)
    .eq('recipient_id', recipientId)
    .eq('is_public', true)
    .not('answer', 'is', null)
    .order('answered_at', { ascending: false });

  if (error) throw storageError();
  return (data as ConfessionRow[]).map(toConfession);
}

export async function listPrompts(): Promise<Prompt[]> {
  const { data, error } = await supabase.from('prompts').select('id, text, category');
  if (error) throw storageError();
  return data as Prompt[];
}

export type ReactionSummary = Record<ReactionKind, { count: number; mine: boolean }>;

export function emptyReactionSummary(): ReactionSummary {
  return {
    snowflake: { count: 0, mine: false },
    heart: { count: 0, mine: false },
    gasp: { count: 0, mine: false },
  };
}

export async function reactionSummary(confessionId: string): Promise<ReactionSummary> {
  const summary = emptyReactionSummary();
  const { data, error } = await supabase.rpc('reaction_summary', {
    p_confession: confessionId,
    p_fp: getVisitorId(),
  });

  if (error) return summary;

  for (const row of data as Array<{ kind: ReactionKind; total: number; mine: boolean }>) {
    summary[row.kind] = { count: Number(row.total), mine: row.mine };
  }
  return summary;
}

/** Adds the reaction, or removes it if this visitor already added it. */
export async function toggleReaction(confessionId: string, kind: ReactionKind): Promise<void> {
  const { error } = await supabase.rpc('toggle_reaction', {
    p_confession: confessionId,
    p_fp: getVisitorId(),
    p_kind: kind,
  });

  if (!error) return;
  if (error.message.toLowerCase().includes('not_found')) {
    throw new AppError('not_found', 'You can only react to confessions that have been answered publicly.');
  }
  throw new AppError('storage', 'We could not save that reaction. Please try again.');
}
