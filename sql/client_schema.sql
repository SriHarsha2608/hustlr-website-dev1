-- ============================================================
-- Client-side tables for Hustlr
-- Run this in your Supabase SQL editor
-- ============================================================

-- Client company profiles (created/updated after onboarding)
create table if not exists client_profiles (
  email           text primary key,
  company_name    text not null,
  website         text,
  linkedin        text,
  industry        text,
  company_size    text,
  country         text,
  description     text,
  student_work_reason text,
  phone           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Job posts created by clients
create table if not exists job_posts (
  id               uuid default gen_random_uuid() primary key,
  client_email     text not null references client_profiles(email) on delete cascade,
  title            text not null,
  category         text not null,
  description      text not null,
  timeline_estimate text,
  deliverables     text,
  budget           numeric,
  skills           jsonb default '[]'::jsonb,
  status           text default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Index for quick lookup of all posts by a client
create index if not exists idx_job_posts_client_email on job_posts(client_email);
create index if not exists idx_job_posts_status on job_posts(status);

-- Auto-update updated_at on client_profiles rows
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_client_profiles_updated_at on client_profiles;
create trigger set_client_profiles_updated_at
  before update on client_profiles
  for each row execute function update_updated_at_column();

drop trigger if exists set_job_posts_updated_at on job_posts;
create trigger set_job_posts_updated_at
  before update on job_posts
  for each row execute function update_updated_at_column();
