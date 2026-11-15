/**
 * Cookie / local-storage consent.
 *
 * The only non-essential thing this app can load is privacy-friendly,
 * cookieless analytics. Everything else (the Supabase session and the
 * anonymous anti-spam id) is strictly necessary to run the service, so it
 * is always on and needs no consent.
 */

export type ConsentCategoryId = 'necessary' | 'analytics';

export interface ConsentChoices {
  analytics: boolean;
}

export interface ConsentRecord extends ConsentChoices {
  version: number;
  updatedAt: string;
}

/** Bump this if the categories ever change, to force a fresh choice. */
export const CONSENT_VERSION = 1;
export const CONSENT_KEY = 'wc:consent';
const CONSENT_EVENT = 'wc:consent-change';

/** What we assume until the visitor decides. */
export const DEFAULT_CHOICES: ConsentChoices = { analytics: false };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads the saved choice, or null when the visitor has not decided yet. */
export function readConsent(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.version !== CONSENT_VERSION) return null;
    return {
      version: CONSENT_VERSION,
      analytics: parsed.analytics === true,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

/** Saves a choice and lets the rest of the app react to it. */
export function writeConsent(choices: ConsentChoices): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    analytics: choices.analytics,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* Storage blocked (private mode). The choice still applies for this visit. */
  }
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_EVENT, { detail: record }));
  return record;
}

/** Calls `listener` when the choice changes here or in another tab. */
export function onConsentChange(listener: (record: ConsentRecord | null) => void): () => void {
  const onLocal = (event: Event) => {
    listener(event instanceof CustomEvent ? (event.detail as ConsentRecord) : readConsent());
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CONSENT_KEY) listener(readConsent());
  };
  window.addEventListener(CONSENT_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}
