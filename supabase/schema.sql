-- ============================================================
-- Unichat database schema for Supabase (Postgres)
-- Safe to re-run multiple times.
-- ============================================================

-- ── 1. university_domains ────────────────────────────────────
create table if not exists university_domains (
  university text primary key,
  domain     text not null unique
);

-- UPSERT all supported Thai universities (safe to re-run)
insert into university_domains (university, domain) values
  ('Rangsit University (RSU)',                    'rsu.ac.th'),
  ('Bangkok University (BU)',                     'bu.ac.th'),
  ('Chulalongkorn University (CU)',               'chula.ac.th'),
  ('Assumption University (ABAC)',                'au.edu'),
  ('Mahidol University (MU / MUIC)',              'mahidol.ac.th'),
  ('Thammasat University (TU)',                   'tu.ac.th'),
  ('Kasetsart University (KU)',                   'ku.ac.th'),
  ('KMITL',                                       'kmitl.ac.th'),
  ('Chiang Mai University (CMU)',                 'cmu.ac.th'),
  ('Mae Fah Luang University (MFU)',              'mfu.ac.th'),
  ('UTCC',                                        'utcc.ac.th'),
  ('Stamford International University (STIU)',    'stamford.edu'),
  ('Webster University Thailand',                 'webster.ac.th')
on conflict (university) do update set domain = excluded.domain;

-- ── 2. profiles table ────────────────────────────────────────
create table if not exists profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  role             text not null default 'student' check (role in ('student', 'moderator')),
  name             text not null,
  username         text unique,
  email            text not null,
  university       text not null references university_domains (university),
  major            text,
  faculty          text,
  year             text,
  student_id       text,
  bio              text,
  skills           text[] not null default '{}',
  status_text      text,
  avatar_image     text,
  avatar_initials  text,
  avatar_gradient  text,
  streak           int not null default 0,
  streak_goal      int not null default 30,
  last_active_date date,
  restores_used    int not null default 0,
  restore_month    text,
  verified         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Add profile fields when upgrading from the original schema.
alter table profiles add column if not exists skills text[] not null default '{}';
alter table profiles add column if not exists status_text text;

-- ── 3. Trigger function (AFTER profiles table exists) ────────
create or replace function enforce_university_email()
returns trigger as $$
declare
  required_domain text;
begin
  -- Exact match first
  select domain into required_domain
  from university_domains
  where university = new.university;

  -- Case-insensitive fallback
  if required_domain is null then
    select domain into required_domain
    from university_domains
    where lower(trim(university)) = lower(trim(new.university));
  end if;

  if required_domain is null then
    raise exception
      'Unknown university: %. Make sure it matches exactly one of the registered universities.',
      new.university;
  end if;

  if new.email !~* ('@' || required_domain || '$') then
    raise exception
      'Email % does not match the required domain (@%) for %',
      new.email, required_domain, new.university;
  end if;

  return new;
end;
$$ language plpgsql;

-- ── 4. Attach trigger to profiles (AFTER both table + fn exist)
drop trigger if exists trg_enforce_university_email on profiles;
create trigger trg_enforce_university_email
  before insert or update on profiles
  for each row execute function enforce_university_email();

-- ── 5. Row-level security for profiles ───────────────────────
alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

create policy "Profiles are viewable by authenticated users"
  on profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- ── 6. Communities ───────────────────────────────────────────
create table if not exists communities (
  id          text primary key,
  name        text not null,
  category    text,
  icon        text,
  description text,
  university  text references university_domains (university), -- null = open to all universities
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Add columns for projects created by earlier schema versions.
alter table communities add column if not exists category text;
alter table communities add column if not exists icon text;
alter table communities add column if not exists description text;
alter table communities add column if not exists university text references university_domains (university);
alter table communities add column if not exists verified boolean not null default false;

alter table communities enable row level security;

drop policy if exists "Communities viewable by same-university or campus-wide" on communities;
create policy "Communities viewable by same-university or campus-wide"
  on communities for select to authenticated using (
    university is null
    or university = (select university from profiles where id = auth.uid())
  );

delete from communities where id = 'c-rsu-announcements';

-- Seed the official channels. Safe to re-run — updates existing rows
-- instead of duplicating them.
insert into communities (id, name, category, icon, description, university, verified) values
  ('c-rsu-cs', 'Computer Science & AI Hub', 'faculty', 'Code2', 'Course discussion, homework help, hackathons, and research projects', 'Rangsit University (RSU)', true),
  ('c-bu-design', 'Digital Design & Media', 'faculty', 'Palette', 'Portfolio critiques, Figma components, 3D renders, and creative gigs', 'Bangkok University (BU)', true),
  ('c-cu-students', 'Chula Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Chulalongkorn University (CU)', true),
  ('c-abac-students', 'ABAC Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Assumption University (ABAC)', true),
  ('c-mu-students', 'Mahidol Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Mahidol University (MU / MUIC)', true),
  ('c-tu-students', 'Thammasat Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Thammasat University (TU)', true),
  ('c-ku-students', 'Kasetsart Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Kasetsart University (KU)', true),
  ('c-kmitl-students', 'KMITL Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'KMITL', true),
  ('c-cmu-students', 'CMU Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Chiang Mai University (CMU)', true),
  ('c-mfu-students', 'MFU Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Mae Fah Luang University (MFU)', true),
  ('c-utcc-students', 'UTCC Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'UTCC', true),
  ('c-stiu-students', 'STIU Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Stamford International University (STIU)', true),
  ('c-webster-students', 'Webster Thailand Student Community', 'campus', 'Users', 'Student discussions, campus life, events, and peer support', 'Webster University Thailand', true),
  ('c-study-lounge', 'Quiet Study & Pomodoro Pods', 'study', 'BookOpenCheck', 'Focus sprints, exam revision sessions, and shared resource links', null, true),
  ('c-career-internships', 'Career & Internship Board', 'career', 'Briefcase', 'Tech internships, resume reviews, referral links, and interview prep', null, true),
  ('c-campus-life', 'Campus Events & Student Life', 'social', 'Compass', 'Student events, club meetups, sports activities, housing, and food spots', null, true)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, icon = excluded.icon,
  description = excluded.description, university = excluded.university, verified = excluded.verified;

-- ── 7. Messages ──────────────────────────────────────────────
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  community_id text    not null references communities (id) on delete cascade,
  author_id    uuid    not null references profiles (id) on delete cascade,
  body         text    not null,
  is_pinned    boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table messages enable row level security;

drop policy if exists "Messages viewable if community is viewable" on messages;
drop policy if exists "Users can post messages as themselves" on messages;

create policy "Messages viewable if community is viewable"
  on messages for select to authenticated using (
    exists (
      select 1 from communities c
      where c.id = messages.community_id
        and (c.university is null
             or c.university = (select university from profiles where id = auth.uid()))
    )
  );
create policy "Users can post messages as themselves"
  on messages for insert to authenticated with check (auth.uid() = author_id);

-- ── 7b. Message reactions ────────────────────────────────────
create table if not exists message_reactions (
  message_id uuid not null references messages (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table message_reactions enable row level security;

drop policy if exists "Reactions viewable if message is viewable" on message_reactions;
create policy "Reactions viewable if message is viewable"
  on message_reactions for select to authenticated using (
    exists (
      select 1 from messages m
      join communities c on c.id = m.community_id
      where m.id = message_reactions.message_id
        and (c.university is null
             or c.university = (select university from profiles where id = auth.uid()))
    )
  );

drop policy if exists "Users can react as themselves" on message_reactions;
create policy "Users can react as themselves"
  on message_reactions for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 8. Moderation reports ────────────────────────────────────
create table if not exists moderation_reports (
  id             uuid primary key default gen_random_uuid(),
  message_id     uuid references messages (id) on delete set null,
  community_id   text references communities (id),
  community_name text,
  message_author text,
  message_text   text,
  severity       text,
  reason         text not null,
  source         text,
  status         text not null default 'open' check (status in ('open', 'resolved')),
  resolution     text,
  reported_by    uuid references profiles (id),
  university     text references university_domains (university),
  created_at     timestamptz not null default now()
);

alter table moderation_reports enable row level security;

drop policy if exists "Moderators view reports for their university" on moderation_reports;
drop policy if exists "Any authenticated user can file a report" on moderation_reports;
drop policy if exists "Moderators can resolve reports for their university" on moderation_reports;

create policy "Moderators view reports for their university"
  on moderation_reports for select to authenticated using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'moderator'
        and p.university = moderation_reports.university
    )
  );
create policy "Any authenticated user can file a report"
  on moderation_reports for insert to authenticated
  with check (reported_by = auth.uid());
create policy "Moderators can resolve reports for their university"
  on moderation_reports for update to authenticated using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'moderator'
        and p.university = moderation_reports.university
    )
  );

-- ── 8b. Friendships / connections (Find Friends "Connect" button) ──
create table if not exists friendships (
  follower_id uuid not null references profiles (id) on delete cascade,
  followee_id uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table friendships enable row level security;

drop policy if exists "Users can view their own outgoing connections" on friendships;
create policy "Users can view their own outgoing connections"
  on friendships for select to authenticated
  using (follower_id = auth.uid());

drop policy if exists "Users can create their own connections" on friendships;
create policy "Users can create their own connections"
  on friendships for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists "Users can remove their own connections" on friendships;
create policy "Users can remove their own connections"
  on friendships for delete to authenticated
  using (follower_id = auth.uid());

-- ── 9. Realtime subscriptions ────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moderation_reports'
  ) then
    alter publication supabase_realtime add table moderation_reports;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table message_reactions;
  end if;
end $$;