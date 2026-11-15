-- ============================================================================
-- Winter Confessions: Supabase (PostgreSQL) schema
--
-- This file matches the live project. Run the whole file once in a brand-new
-- project: Supabase Dashboard > SQL Editor > New query. It is idempotent, so
-- running it again is safe.
--
-- If your project already works, you do NOT need to re-run this whole file:
-- apply only the newer files in `db/migrations/` (oldest first). In particular,
-- `db/migrations/20261115_reports.sql` adds the abuse-report objects.
--
-- `db/schema.sql` is a different, older document (the original browser-database
-- model). This is the file that matches the Supabase app.
--
-- Function error messages are short codes the app maps to friendly text:
--   invalid_visitor, invalid_body, not_found, rate_limited,
--   invalid_reason, invalid_details
-- ============================================================================

-- ---------- Types ----------------------------------------------------------

do $$
begin
  create type public.prompt_category as enum ('ask', 'confess', 'never', 'words');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.reaction_kind as enum ('snowflake', 'heart', 'gasp');
exception when duplicate_object then null;
end $$;

-- ---------- Tables ---------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text        not null,
  display_name  text        not null,
  bio           text        not null default '',
  created_at    timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,20}$'),
  constraint profiles_username_not_reserved check (username not in (
    'admin', 'administrator', 'support', 'help', 'moderator', 'winter',
    'confessions', 'inbox', 'auth', 'login', 'signup', 'system', 'root'
  )),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 30),
  constraint profiles_bio_length          check (char_length(bio) <= 120)
);
create unique index if not exists profiles_username_key on public.profiles (username);

create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  text        text                    not null,
  category    public.prompt_category  not null,
  created_at  timestamptz             not null default now()
);

create table if not exists public.confessions (
  id                  uuid primary key default gen_random_uuid(),
  recipient_id        uuid        not null references public.profiles (id) on delete cascade,
  body                text        not null,
  prompt_id           uuid        references public.prompts (id) on delete set null,
  sender_fingerprint  text        not null,   -- never readable by any client
  read_at             timestamptz,
  answer              text,
  answered_at         timestamptz,
  is_public           boolean     not null default false,
  created_at          timestamptz not null default now(),
  constraint confessions_body_length   check (char_length(body) between 1 and 500),
  constraint confessions_answer_length check (answer is null or char_length(answer) between 1 and 500),
  constraint confessions_fingerprint_length check (char_length(sender_fingerprint) between 16 and 64),
  constraint confessions_public_needs_answer check (not is_public or answer is not null)
);
create index if not exists confessions_recipient_created_idx on public.confessions (recipient_id, created_at desc);
create index if not exists confessions_unread_idx on public.confessions (recipient_id) where read_at is null;
create index if not exists confessions_fingerprint_created_idx on public.confessions (sender_fingerprint, created_at desc);
create index if not exists confessions_public_answers_idx on public.confessions (recipient_id, answered_at desc) where is_public;
create index if not exists confessions_prompt_id_idx on public.confessions (prompt_id);

create table if not exists public.reactions (
  id             uuid primary key default gen_random_uuid(),
  confession_id  uuid                 not null references public.confessions (id) on delete cascade,
  fingerprint    text                 not null,
  kind           public.reaction_kind not null,
  created_at     timestamptz          not null default now(),
  constraint reactions_fingerprint_length check (char_length(fingerprint) between 16 and 64),
  constraint reactions_unique_per_visitor unique (confession_id, fingerprint, kind)
);

-- Abuse reports. Private: no client can read or write these (see the function
-- and grants below). The operator reads them from the Supabase dashboard.
create table if not exists public.reports (
  id                   uuid        primary key default gen_random_uuid(),
  confession_id        uuid        references public.confessions (id) on delete set null,
  -- Snapshot of the confession at report time, so a report survives deletion.
  confession_body      text        not null,
  reason               text        not null,
  details              text,
  reporter_fingerprint text        not null,
  status               text        not null default 'open',
  created_at           timestamptz not null default now(),
  constraint reports_reason_check check (
    reason in ('harassment', 'hate', 'sexual', 'violence', 'self_harm', 'spam', 'other')
  ),
  constraint reports_status_check check (
    status in ('open', 'reviewing', 'resolved', 'dismissed')
  ),
  constraint reports_details_length check (details is null or char_length(details) <= 500),
  constraint reports_fingerprint_length check (char_length(reporter_fingerprint) between 16 and 64)
);
create index if not exists reports_created_idx on public.reports (created_at desc);
create index if not exists reports_open_idx on public.reports (created_at desc) where status = 'open';
create index if not exists reports_fingerprint_created_idx
  on public.reports (reporter_fingerprint, created_at desc);

-- ---------- Create a profile automatically when someone signs up -----------
-- App calls: supabase.auth.signUp({ email, password,
--            options: { data: { username, display_name } } })

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_display  text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, left(coalesce(v_display, v_username), 30));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Privileges (which COLUMNS clients may touch) -------------------

revoke all on public.profiles, public.prompts, public.confessions, public.reactions, public.reports
  from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update (display_name, bio) on public.profiles to authenticated;

grant select on public.prompts to anon, authenticated;

-- Every confessions column EXCEPT sender_fingerprint is readable, so the app
-- must list columns instead of using select('*').
grant select (id, recipient_id, body, prompt_id, read_at, answer, answered_at, is_public, created_at)
  on public.confessions to anon, authenticated;
grant update (read_at, answer, answered_at, is_public) on public.confessions to authenticated;
grant delete on public.confessions to authenticated;
-- No INSERT grant: confessions are created only through send_confession().
-- reactions: no direct access. Use toggle_reaction() / reaction_summary().
-- reports:   no direct access. Use report_confession().

-- ---------- Row Level Security (which ROWS clients may touch) --------------

alter table public.profiles    enable row level security;
alter table public.prompts     enable row level security;
alter table public.confessions enable row level security;
alter table public.reactions   enable row level security;  -- no policies: closed to clients
alter table public.reports     enable row level security;  -- no policies: closed to clients

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select to anon, authenticated
  using (true);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "prompts are public" on public.prompts;
create policy "prompts are public"
  on public.prompts for select to anon, authenticated
  using (true);

drop policy if exists "anyone can read public answers" on public.confessions;
create policy "anyone can read public answers"
  on public.confessions for select to anon, authenticated
  using (is_public and answer is not null);

drop policy if exists "owner reads own inbox" on public.confessions;
create policy "owner reads own inbox"
  on public.confessions for select to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "owner updates own inbox" on public.confessions;
create policy "owner updates own inbox"
  on public.confessions for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

drop policy if exists "owner deletes own inbox" on public.confessions;
create policy "owner deletes own inbox"
  on public.confessions for delete to authenticated
  using ((select auth.uid()) = recipient_id);

-- ---------- Functions anyone may call --------------------------------------

create or replace function public.send_confession(
  p_username text,
  p_body     text,
  p_prompt   uuid,
  p_fp       text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_body text := btrim(regexp_replace(replace(coalesce(p_body, ''), E'\r\n', E'\n'), E'\n{3,}', E'\n\n', 'g'));
begin
  if char_length(coalesce(p_fp, '')) not between 16 and 64 then
    raise exception 'invalid_visitor' using errcode = '22023';
  end if;
  if char_length(v_body) not between 1 and 500 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  select id into v_recipient
  from public.profiles
  where username = lower(btrim(coalesce(p_username, '')));
  if v_recipient is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- At most 3 per minute per browser.
  if (select count(*) from public.confessions
      where sender_fingerprint = p_fp
        and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Flood guard: at most 20 per minute into one inbox, from any number of browsers.
  if (select count(*) from public.confessions
      where recipient_id = v_recipient
        and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.confessions (recipient_id, body, prompt_id, sender_fingerprint)
  values (
    v_recipient,
    v_body,
    (select id from public.prompts where id = p_prompt),  -- unknown prompt ids become null
    p_fp
  );
end;
$$;

create or replace function public.toggle_reaction(
  p_confession uuid,
  p_fp         text,
  p_kind       public.reaction_kind
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(coalesce(p_fp, '')) not between 16 and 64 then
    raise exception 'invalid_visitor' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.confessions
    where id = p_confession and is_public and answer is not null
  ) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  delete from public.reactions
  where confession_id = p_confession and fingerprint = p_fp and kind = p_kind;

  if not found then
    insert into public.reactions (confession_id, fingerprint, kind)
    values (p_confession, p_fp, p_kind)
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.reaction_summary(p_confession uuid, p_fp text)
returns table (kind public.reaction_kind, total bigint, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.kind,
         count(*) as total,
         coalesce(bool_or(r.fingerprint = p_fp), false) as mine
  from public.reactions r
  where r.confession_id = p_confession
  group by r.kind;
$$;

-- Report a confession (public, or one you received). Rate limit: 5 per hour.
create or replace function public.report_confession(
  p_confession uuid,
  p_reason     text,
  p_details    text,
  p_fp         text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body      text;
  v_is_public boolean;
  v_recipient uuid;
begin
  if char_length(coalesce(p_fp, '')) not between 16 and 64 then
    raise exception 'invalid_visitor' using errcode = '22023';
  end if;

  if p_reason not in ('harassment', 'hate', 'sexual', 'violence', 'self_harm', 'spam', 'other') then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;

  p_details := nullif(btrim(coalesce(p_details, '')), '');
  if p_details is not null and char_length(p_details) > 500 then
    raise exception 'invalid_details' using errcode = '22023';
  end if;

  select body, is_public, recipient_id
    into v_body, v_is_public, v_recipient
  from public.confessions
  where id = p_confession;

  if v_body is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if not (v_is_public or v_recipient = (select auth.uid())) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if (select count(*) from public.reports
      where reporter_fingerprint = p_fp
        and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.reports (confession_id, confession_body, reason, details, reporter_fingerprint)
  values (p_confession, v_body, p_reason, p_details, p_fp);
end;
$$;

revoke execute on function public.send_confession(text, text, uuid, text) from public;
revoke execute on function public.toggle_reaction(uuid, text, public.reaction_kind) from public;
revoke execute on function public.reaction_summary(uuid, text) from public;
revoke execute on function public.report_confession(uuid, text, text, text) from public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.send_confession(text, text, uuid, text) to anon, authenticated;
grant execute on function public.toggle_reaction(uuid, text, public.reaction_kind) to anon, authenticated;
grant execute on function public.reaction_summary(uuid, text) to anon, authenticated;
grant execute on function public.report_confession(uuid, text, text, text) to anon, authenticated;

-- ---------- Realtime (live inbox updates) ----------------------------------

alter table public.confessions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'confessions'
  ) then
    alter publication supabase_realtime add table public.confessions;
  end if;
exception when undefined_object then null;
end $$;

-- ---------- Seed data ------------------------------------------------------

insert into public.prompts (text, category)
select seed.text, seed.category
from (
  values
    ('Confess something you have never told anyone.',                    'confess'::public.prompt_category),
    ('What is your most unpopular winter opinion?',                      'confess'::public.prompt_category),
    ('Tell me a secret you have been keeping since last winter.',        'confess'::public.prompt_category),
    ('What is your coziest memory of the cold season?',                  'ask'::public.prompt_category),
    ('Hot cocoa or coffee? Defend your choice.',                         'ask'::public.prompt_category),
    ('What would you do on a snow day with no plans?',                   'ask'::public.prompt_category),
    ('Never have I ever pretended to love a gift I did not.',            'never'::public.prompt_category),
    ('Never have I ever stayed in bed all day because it was too cold.', 'never'::public.prompt_category),
    ('Never have I ever sent a text and instantly regretted it.',        'never'::public.prompt_category),
    ('Describe me in three words.',                                      'words'::public.prompt_category),
    ('Three words my friends would use for me?',                         'words'::public.prompt_category)
) as seed(text, category)
where not exists (select 1 from public.prompts);
