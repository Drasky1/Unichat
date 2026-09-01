-- Unichat database schema for Supabase (Postgres)
-- Run this once in your Supabase SQL Editor.

create table if not exists university_domains (
  university text primary key,
  domain text not null unique
);

-- Use UPSERT so re-running this script never wipes data and fails halfway
insert into university_domains (university, domain) values
  ('Rangsit University (RSU)',          'rsu.ac.th'),
  ('Bangkok University (BU)',           'bu.ac.th'),
  ('Chulalongkorn University (CU)',     'chula.ac.th'),
  ('Assumption University (ABAC)',      'au.edu'),
  ('Mahidol University (MU / MUIC)',    'mahidol.ac.th'),
  ('Thammasat University (TU)',         'tu.ac.th'),
  ('Kasetsart University (KU)',         'ku.ac.th'),
  ('KMITL',                             'kmitl.ac.th'),
  ('Chiang Mai University (CMU)',       'cmu.ac.th'),
  ('Mae Fah Luang University (MFU)',    'mfu.ac.th'),
  ('UTCC',                              'utcc.ac.th'),
  ('Stamford International University (STIU)', 'stamford.edu'),
  ('Webster University Thailand',       'webster.ac.th')
on conflict (university) do update set domain = excluded.domain;

-- Simple, reliable email-domain trigger (no normalization complexity)
create or replace function enforce_university_email()
returns trigger as $$
declare
  required_domain text;
begin
  -- Direct exact lookup first
  select domain into required_domain
  from university_domains
  where university = new.university;

  -- Fallback: case-insensitive lookup in case of minor casing differences
  if required_domain is null then
    select domain into required_domain
    from university_domains
    where lower(trim(university)) = lower(trim(new.university));
  end if;

  if required_domain is null then
    raise exception 'Unknown university: %. Make sure it matches exactly one of the registered universities.', new.university;
  end if;

  if new.email !~* ('@' || required_domain || '$') then
    raise exception 'Email % does not match the required domain (@%) for %', new.email, required_domain, new.university;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_university_email on profiles;
create trigger trg_enforce_university_email
  before insert or update on profiles
  for each row execute function enforce_university_email();

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'moderator')),
  name text not null,
  username text unique,
  email text not null,
  university text not null references university_domains (university),
  major text,
  faculty text,
  year text,
  student_id text,
  bio text,
  avatar_image text,
  avatar_initials text,
  avatar_gradient text,
  streak int not null default 0,
  streak_goal int not null default 30,
  last_active_date date,
  restores_used int not null default 0,
  restore_month text,
  verified boolean not null default false,
  created_at timestamptz not null default now()

);

create or replace function enforce_university_email()
returns trigger as $$
declare
  required_domain text;
  normalized_university text;
begin
  normalized_university := normalize_university_name(new.university);

  select domain into required_domain
  from university_domains
  where normalize_university_name(university) = normalized_university;

  if required_domain is null then
    raise exception 'Unknown university: %', new.university;
  end if;

  if new.email !~* ('@' || required_domain || '$') then
    raise exception 'Email % does not match the required domain (@%) for %', new.email, required_domain, new.university;
  end if;

  new.university := (select university from university_domains where normalize_university_name(university) = normalized_university limit 1);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_university_email on profiles;
create trigger trg_enforce_university_email
  before insert or update on profiles
  for each row execute function enforce_university_email();

alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

create policy "Profiles are viewable by authenticated users" on profiles for select to authenticated using (true);
create policy "Users can insert their own profile" on profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update to authenticated using (auth.uid() = id);

create table if not exists communities (
  id text primary key,
  name text not null,
  description text,
  university text references university_domains (university),
  created_at timestamptz not null default now()
);

alter table communities enable row level security;
drop policy if exists "Communities viewable by same-university or campus-wide" on communities;
create policy "Communities viewable by same-university or campus-wide" on communities for select to authenticated using (
  university is null or university = (select university from profiles where id = auth.uid())
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references communities (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;
drop policy if exists "Messages viewable if community is viewable" on messages;
drop policy if exists "Users can post messages as themselves" on messages;
create policy "Messages viewable if community is viewable" on messages for select to authenticated using (
  exists (
    select 1 from communities c
    where c.id = messages.community_id
      and (c.university is null or c.university = (select university from profiles where id = auth.uid()))
  )
);
create policy "Users can post messages as themselves" on messages for insert to authenticated with check (auth.uid() = author_id);

create table if not exists moderation_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages (id) on delete set null,
  community_id text references communities (id),
  community_name text,
  message_author text,
  message_text text,
  severity text,
  reason text not null,
  source text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  reported_by uuid references profiles (id),
  university text references university_domains (university),
  created_at timestamptz not null default now()
);

alter table moderation_reports enable row level security;
drop policy if exists "Moderators view reports for their university" on moderation_reports;
drop policy if exists "Any authenticated user can file a report" on moderation_reports;
drop policy if exists "Moderators can resolve reports for their university" on moderation_reports;
create policy "Moderators view reports for their university" on moderation_reports for select to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role = 'moderator'
      and p.university = moderation_reports.university
  )
);
create policy "Any authenticated user can file a report" on moderation_reports for insert to authenticated with check (reported_by = auth.uid());
create policy "Moderators can resolve reports for their university" on moderation_reports for update to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role = 'moderator'
      and p.university = moderation_reports.university
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moderation_reports'
  ) then
    alter publication supabase_realtime add table moderation_reports;
  end if;
end $$;
