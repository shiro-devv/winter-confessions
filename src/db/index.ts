import { createStorage, type StorageAdapter } from './storage';
import { Table } from './table';
import type { Confession, Prompt, Reaction, Session, User } from './types';

export * from './types';
export * from './errors';

const PREFIX = 'wc:v1:';
const META_KEY = `${PREFIX}meta`;
const SCHEMA_VERSION = 1;

/** Starter prompts inserted the first time the database is created. */
const SEED_PROMPTS: Array<Pick<Prompt, 'text' | 'category'>> = [
  { category: 'confess', text: 'Confess something you have never told anyone.' },
  { category: 'confess', text: 'What is your most unpopular winter opinion?' },
  { category: 'confess', text: 'Tell me a secret you have been keeping since last winter.' },
  { category: 'ask', text: 'What is your coziest memory of the cold season?' },
  { category: 'ask', text: 'Hot cocoa or coffee? Defend your choice.' },
  { category: 'ask', text: 'What would you do on a snow day with no plans?' },
  { category: 'never', text: 'Never have I ever pretended to love a gift I did not.' },
  { category: 'never', text: 'Never have I ever stayed in bed all day because it was too cold.' },
  { category: 'never', text: 'Never have I ever sent a text and instantly regretted it.' },
  { category: 'words', text: 'Describe me in three words.' },
  { category: 'words', text: 'Three words my friends would use for me?' },
];

/**
 * The application database. Five typed tables backed by Web Storage,
 * plus a subscribe/version pair so React can re-render when data changes
 * (including changes made in another browser tab).
 */
class Database {
  readonly persistent: boolean;
  readonly users: Table<User>;
  readonly sessions: Table<Session>;
  readonly prompts: Table<Prompt>;
  readonly confessions: Table<Confession>;
  readonly reactions: Table<Reaction>;

  private version = 0;
  private readonly listeners = new Set<() => void>();
  private readonly storage: StorageAdapter;

  constructor() {
    const { adapter, persistent } = createStorage();
    this.storage = adapter;
    this.persistent = persistent;

    const notify = () => this.emit();
    this.users = new Table<User>('users', adapter, notify, PREFIX);
    this.sessions = new Table<Session>('sessions', adapter, notify, PREFIX);
    this.prompts = new Table<Prompt>('prompts', adapter, notify, PREFIX);
    this.confessions = new Table<Confession>('confessions', adapter, notify, PREFIX);
    this.reactions = new Table<Reaction>('reactions', adapter, notify, PREFIX);

    this.migrate();

    // Keep every open tab in sync.
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === null || event.key.startsWith('wc:')) this.emit();
      });
    }
  }

  /** Subscribe to any change. Returns an unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Changes every time any table changes. Safe for useSyncExternalStore. */
  getVersion = (): number => this.version;

  /** Tells subscribers to re-read, e.g. after a non-table change such as the session key. */
  refresh = (): void => {
    this.emit();
  };

  private emit(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  /** Creates the schema version marker and seeds prompts on first run. */
  private migrate(): void {
    const stored = Number(this.storage.getItem(META_KEY) ?? 0);
    if (stored < 1) {
      if (this.prompts.count() === 0) {
        SEED_PROMPTS.forEach((prompt) => this.prompts.insert(prompt));
      }
    }
    if (stored !== SCHEMA_VERSION) {
      try {
        this.storage.setItem(META_KEY, String(SCHEMA_VERSION));
      } catch {
        /* Storage is full or blocked; the app still works in memory. */
      }
    }
  }
}

export const db = new Database();
