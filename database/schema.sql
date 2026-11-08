-- Politickin' editorial platform schema
create extension if not exists pgcrypto;
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.writer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  roblox_username text not null unique,
  created_at timestamptz not null default now(),
  suspended boolean not null default false
);
create table if not exists public.op_ed_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  body text not null,
  status text not null default 'Under Review' check (status in ('Under Review','Accepted','Declined','Revision Requested')),
  editor_feedback text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  body text not null default '',
  image_url text,
  image_alt text,
  category text not null default 'National News & Analysis',
  status text not null default 'Draft' check (status in ('Draft','Published','Archived')),
  is_featured boolean not null default false,
  featured_position int unique check (featured_position between 1 and 3),
  author_name text,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.editorial_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create or replace function public.is_super_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select coalesce((auth.jwt()->>'email') = 'whitakergov@gmail.com', false)
    or exists(select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role = 'super_admin');
$$;
create or replace function public.is_editor()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select public.is_super_admin()
    or exists(select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','super_admin'));
$$;
alter table public.admin_roles enable row level security;
alter table public.writer_profiles enable row level security;
alter table public.op_ed_submissions enable row level security;
alter table public.articles enable row level security;
alter table public.editorial_settings enable row level security;
create policy "Editors read roles" on public.admin_roles for select to authenticated using (public.is_editor());
create policy "Super admins manage roles" on public.admin_roles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "Writers read own profile" on public.writer_profiles for select to authenticated using (user_id = (select auth.uid()) or public.is_editor());
create policy "Writers create own profile" on public.writer_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Writers update own profile" on public.writer_profiles for update to authenticated using (user_id = (select auth.uid()) and not suspended) with check (user_id = (select auth.uid()));
create policy "Writers read own submissions" on public.op_ed_submissions for select to authenticated using (user_id = (select auth.uid()) or public.is_editor());
create policy "Writers submit own opeds" on public.op_ed_submissions for insert to authenticated with check (user_id = (select auth.uid()) and status = 'Under Review');
create policy "Editors update submissions" on public.op_ed_submissions for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "Public read published articles" on public.articles for select to anon, authenticated using (status = 'Published' or public.is_editor());
create policy "Editors manage articles" on public.articles for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "Public read public settings" on public.editorial_settings for select to anon, authenticated using (key in ('homepage_featured'));
create policy "Editors manage settings" on public.editorial_settings for all to authenticated using (public.is_editor()) with check (public.is_editor());
grant select, insert, update on public.writer_profiles to authenticated;
grant select, insert, update on public.op_ed_submissions to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.admin_roles to authenticated;
grant select, insert, update, delete on public.editorial_settings to authenticated;
grant select on public.articles, public.editorial_settings to anon;
