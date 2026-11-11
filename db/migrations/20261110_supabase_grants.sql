-- Winter Confessions: Supabase grants and profile username uniqueness.
--
-- Row Level Security policies were already in place, but the API roles were
-- missing the table privileges those policies rely on. Without these grants
-- PostgREST answers every inbox read/update with "permission denied", which
-- the browser surfaces as a 400/401 response.
--
-- Safe to run more than once.

-- Public profile pages and the "answered" list need read access without login.
grant select on public.profiles to anon, authenticated;
grant select on public.prompts to anon, authenticated;
grant select on public.confessions to anon;

-- Signed-in owners read, reply to, mark read and delete their own confessions.
-- RLS still limits every statement to rows where recipient_id = auth.uid().
grant select, update, delete on public.confessions to authenticated;

-- Signed-in owners can edit their own profile (RLS: id = auth.uid()).
grant update on public.profiles to authenticated;

-- Two tabs racing to claim the same username must not both win.
create unique index if not exists profiles_username_key on public.profiles (username);
