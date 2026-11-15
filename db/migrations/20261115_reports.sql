-- Winter Confessions: abuse reports.
--
-- Adds a private `reports` table and a `report_confession` function so anyone
-- (signed in or not) can flag a confession for review. Reports are not
-- readable through the API at all: they are only visible to the operator with
-- the service role, i.e. from the Supabase dashboard (Table editor) or SQL.
--
-- Safe to run more than once. This is the delta for a project that already has
-- the rest of the schema; `db/supabase.sql` is the full setup for a new one.
--
-- Error codes match the rest of the app (see db/supabase.sql):
--   invalid_visitor, invalid_reason, invalid_details, not_found, rate_limited

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

alter table public.reports enable row level security;

-- No policies and no table grants: the API roles cannot read or write reports
-- directly. The function below is the only way in, and it only ever inserts.
revoke all on public.reports from anon, authenticated;

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

  -- A report is only allowed on a public confession, or by its own recipient.
  -- This stops anyone using reports to peek at private confessions.
  if not (v_is_public or v_recipient = (select auth.uid())) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Rate limit: at most 5 reports per browser per hour.
  if (select count(*) from public.reports
      where reporter_fingerprint = p_fp
        and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.reports (confession_id, confession_body, reason, details, reporter_fingerprint)
  values (p_confession, v_body, p_reason, p_details, p_fp);
end;
$$;

revoke execute on function public.report_confession(uuid, text, text, text) from public;
grant execute on function public.report_confession(uuid, text, text, text) to anon, authenticated;
