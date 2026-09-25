-- Apply before deploying the sources-briefs-v1 patch. Existing creation
-- timestamps remain unchanged: they are not dates of the reported events.
alter table public.zone_briefs add column if not exists updated_at timestamptz;

create table if not exists public.brief_revisions (
  id bigint generated always as identity primary key,
  brief_id bigint not null references public.zone_briefs(id),
  archived_at timestamptz not null default now(),
  previous_version jsonb not null
);
alter table public.brief_revisions enable row level security;
-- No public policy: revision history is available only to the backend/admin.
create or replace function public.archive_brief_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.title is distinct from new.title or old.sections is distinct from new.sections
     or old.summary is distinct from new.summary or old.source_urls is distinct from new.source_urls then
    insert into public.brief_revisions (brief_id, previous_version) values (old.id, to_jsonb(old));
  end if;
  return new;
end;
$$;
revoke all on function public.archive_brief_revision() from public;
drop trigger if exists archive_brief_revision on public.zone_briefs;
create trigger archive_brief_revision before update on public.zone_briefs
for each row execute function public.archive_brief_revision();
