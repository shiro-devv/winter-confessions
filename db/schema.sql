-- Winter Confessions: relational schema (PostgreSQL).
--
-- The app in /src ships with a typed browser database (src/db) so it runs with
-- zero setup. This file is the same data model expressed as SQL, ready to drop
-- into Postgres / Supabase / Neon when you add a real backend. Every table
-- and column below maps 1:1 to an interface in src/db/types.ts.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username       text        NOT NULL,
  display_name   text        NOT NULL,
  bio            text        NOT NULL DEFAULT '',
  password_hash  text        NOT NULL,
  password_salt  text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9_.]{3,20}$'),
  CONSTRAINT users_bio_length      CHECK (char_length(bio) <= 120)
);
-- Usernames are compared case-insensitively (we always store lower case).
CREATE UNIQUE INDEX users_username_key ON users (username);

CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx    ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TYPE prompt_category AS ENUM ('ask', 'confess', 'never', 'words');

CREATE TABLE prompts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text        text            NOT NULL,
  category    prompt_category NOT NULL,
  created_at  timestamptz     NOT NULL DEFAULT now()
);

CREATE TABLE confessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id        uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body                text        NOT NULL,
  prompt_id           uuid        REFERENCES prompts (id) ON DELETE SET NULL,
  -- Random per-browser id: used only for rate limiting and reaction de-duplication.
  -- It is never exposed to the recipient.
  sender_fingerprint  text        NOT NULL,
  read_at             timestamptz,
  answer              text,
  answered_at         timestamptz,
  is_public           boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT confessions_body_length   CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT confessions_answer_length CHECK (answer IS NULL OR char_length(answer) BETWEEN 1 AND 500),
  -- A confession can only be public once it has an answer.
  CONSTRAINT confessions_public_needs_answer CHECK (NOT is_public OR answer IS NOT NULL)
);
-- Inbox listing (newest first) and unread counter.
CREATE INDEX confessions_recipient_created_idx ON confessions (recipient_id, created_at DESC);
CREATE INDEX confessions_unread_idx ON confessions (recipient_id) WHERE read_at IS NULL;
-- Rate limiting: "how many has this sender posted in the last minute?"
CREATE INDEX confessions_fingerprint_created_idx ON confessions (sender_fingerprint, created_at DESC);

CREATE TYPE reaction_kind AS ENUM ('snowflake', 'heart', 'gasp');

CREATE TABLE reactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id  uuid          NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  fingerprint    text          NOT NULL,
  kind           reaction_kind NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  -- One of each reaction per visitor per confession.
  CONSTRAINT reactions_unique_per_visitor UNIQUE (confession_id, fingerprint, kind)
);
