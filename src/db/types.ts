/** Primary key type used by every table. */
export type ID = string;

/** Columns shared by every row. */
export interface BaseRow {
  id: ID;
  /** Unix epoch milliseconds. */
  createdAt: number;
}

/** A registered account. Owns an inbox of anonymous confessions. */
export interface User extends BaseRow {
  /** Lower-case, unique. Used in the public link: /u/:username */
  username: string;
  displayName: string;
  bio: string;
  /** PBKDF2-SHA256 derived key, hex encoded. */
  passwordHash: string;
  /** Random per-user salt, hex encoded. */
  passwordSalt: string;
}

/** A login session. The session id is kept in the browser; rows expire. */
export interface Session extends BaseRow {
  userId: ID;
  expiresAt: number;
}

export type PromptCategory = 'ask' | 'confess' | 'never' | 'words';

/** A starter prompt visitors can pick before writing a confession. */
export interface Prompt extends BaseRow {
  text: string;
  category: PromptCategory;
}

/** An anonymous message sent to a user. The sender is never stored by name. */
export interface Confession extends BaseRow {
  recipientId: ID;
  body: string;
  promptId: ID | null;
  /**
   * Random per-browser id, used ONLY for rate limiting and for
   * de-duplicating reactions. It is never shown to the recipient.
   */
  senderFingerprint: string;
  readAt: number | null;
  /** The owner's reply. Only shown publicly when `isPublic` is true. */
  answer: string | null;
  answeredAt: number | null;
  isPublic: boolean;
}

export type ReactionKind = 'snowflake' | 'heart' | 'gasp';

/** A visitor reaction on a publicly answered confession. */
export interface Reaction extends BaseRow {
  confessionId: ID;
  fingerprint: string;
  kind: ReactionKind;
}

/** Row type without the columns the database fills in itself. */
export type NewRow<T extends BaseRow> = Omit<T, keyof BaseRow>;
