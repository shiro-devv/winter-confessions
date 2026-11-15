-- Winter Confessions: Supabase grants and profile username uniqueness.
--
-- Row Level Security policies were already in place, but the API roles were
-- missing the table privileges those policies rely on. Without these grants
-- PostgREST answers every inbox read/update with "permission denied", which
-- the browser surfaces as a 400/401 response.
--
-- Grants are COLUMN-LEVEL: every `confessions` column except `sender_fingerprint`
-- is readable. The anonymous sender id must never be selectable by a client, or
-- an attacker could correlate confessions back to a browser. This is why the
-- services list columns instead of using select('*').
--
-- Safe to run more than once. Also cleans up the older, leaky table-level grant
-- if an earlier version of this file was applied.

-- Public profile pages and the "answered" list need read access without login.
grant select on public.profiles to anon, authenticated;
grant select on public.prompts to anon, authenticated;

-- Remove any table-level SELECT (which would expose sender_fingerprint), then
-- grant only the safe columns.
revoke all on public.confessions from anon, authenticated;
revoke select (sender_fingerprint) on public.confessions from anon, authenticated;

grant select (id, recipient_id, body, prompt_id, read_at, answer, answered_at, is_public, created_at)
  on public.confessions to anon, authenticated;

-- Signed-in owners reply to, mark read and delete their own confessions.
-- RLS still limits every statement to rows where recipient_id = auth.uid().
grant update (read_at, answer, answered_at, is_public) on public.confessions to authenticated;
grant delete on public.confessions to authenticated;

-- Signed-in owners can edit their own profile (RLS: id = auth.uid()).
grant update (display_name, bio) on public.profiles to authenticated;

-- Two tabs racing to claim the same username must not both win.
create unique index if not exists profiles_username_key on public.profiles (username);
