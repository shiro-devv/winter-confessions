import { randomHex } from './crypto';

const VISITOR_KEY = 'wc:visitor';
let memoryId: string | null = null;

/**
 * A random, anonymous id for this browser. It is used only to rate limit
 * sending and to stop duplicate reactions. It is never shown to anyone.
 */
export function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = randomHex(16);
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    if (!memoryId) memoryId = randomHex(16);
    return memoryId;
  }
}
