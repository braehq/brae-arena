-- Brae Arena — initial schema
-- Run AFTER all existing brae-identity migrations (001–008)
-- Safe to rerun: all use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- ── Extend profiles (shared table) ──────────────────────────────────────────
alter table profiles add column if not exists total_xp          integer not null default 0;
alter table profiles add column if not exists arena_elo         integer not null default 1000;
alter table profiles add column if not exists arena_rank_tier   text    not null default 'bronze'
  check (arena_rank_tier in ('bronze','silver','gold','platinum','diamond','mythic'));
alter table profiles add column if not exists arena_wins        integer not null default 0;
alter table profiles add column if not exists arena_losses      integer not null default 0;
alter table profiles add column if not exists arena_streak      integer not null default 0;
alter table profiles add column if not exists arena_matches_played integer not null default 0;

-- Index for leaderboard queries
create index if not exists profiles_arena_elo_idx on profiles (arena_elo desc);
create index if not exists profiles_total_xp_idx  on profiles (total_xp desc);

-- ── arena_challenges ─────────────────────────────────────────────────────────
create table if not exists arena_challenges (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  description     text not null,
  mode            text not null
                    check (mode in ('speed_build','clone_battle','bug_hunt')),
  difficulty      text not null default 'medium'
                    check (difficulty in ('easy','medium','hard','extreme')),
  time_limit_mins integer not null default 30,
  reference_url   text,
  starter_repo    text,
  scoring_weights jsonb not null default '{
    "deployment_success": 30,
    "lighthouse_performance": 20,
    "lighthouse_accessibility": 15,
    "lighthouse_best_practices": 15,
    "lighthouse_seo": 10,
    "speed_bonus": 10
  }',
  active          boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists arena_challenges_mode_idx on arena_challenges (mode, active);

alter table arena_challenges enable row level security;

create policy "Anyone can read active challenges"
  on arena_challenges for select using (active = true);

create policy "Admins can manage challenges"
  on arena_challenges for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.plan = 'workspace'
    )
  );

-- ── arena_queue ──────────────────────────────────────────────────────────────
create table if not exists arena_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade unique,
  mode        text not null check (mode in ('ranked','casual')),
  game_type   text not null check (game_type in ('speed_build','clone_battle','bug_hunt')),
  elo         integer not null,
  joined_at   timestamptz not null default now(),
  status      text not null default 'waiting'
                check (status in ('waiting','matched','cancelled')),
  match_id    uuid
);

create index if not exists arena_queue_waiting_idx on arena_queue (mode, game_type, elo) where status = 'waiting';

alter table arena_queue enable row level security;

create policy "Users can manage own queue entry"
  on arena_queue for all using (auth.uid() = user_id);

create policy "Users can read own queue entry"
  on arena_queue for select using (auth.uid() = user_id);

-- ── arena_matches ────────────────────────────────────────────────────────────
create table if not exists arena_matches (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null references arena_challenges(id),
  player_one_id   uuid not null references auth.users(id),
  player_two_id   uuid not null references auth.users(id),
  mode            text not null check (mode in ('ranked','casual')),
  game_type       text not null,
  status          text not null default 'pending'
                    check (status in (
                      'pending','active','scoring','complete','cancelled','draw'
                    )),
  started_at      timestamptz,
  ends_at         timestamptz,
  winner_id       uuid references auth.users(id),
  elo_change_p1   integer,
  elo_change_p2   integer,
  xp_awarded_p1   integer,
  xp_awarded_p2   integer,
  created_at      timestamptz not null default now()
);

create index if not exists arena_matches_player_one_idx on arena_matches (player_one_id, created_at desc);
create index if not exists arena_matches_player_two_idx on arena_matches (player_two_id, created_at desc);
create index if not exists arena_matches_status_idx     on arena_matches (status);

alter table arena_matches enable row level security;

create policy "Players can read own matches"
  on arena_matches for select using (
    auth.uid() = player_one_id or auth.uid() = player_two_id
  );

create policy "Leaderboard: anyone can read complete matches (limited fields)"
  on arena_matches for select using (status = 'complete');

-- ── arena_submissions ────────────────────────────────────────────────────────
create table if not exists arena_submissions (
  id                    uuid primary key default gen_random_uuid(),
  match_id              uuid not null references arena_matches(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  deployed_url          text not null,
  github_url            text,
  submitted_at          timestamptz not null default now(),
  score_performance     integer,
  score_accessibility   integer,
  score_best_practices  integer,
  score_seo             integer,
  score_speed_bonus     integer,
  score_total           integer,
  scoring_status        text not null default 'pending'
                          check (scoring_status in ('pending','running','complete','failed')),
  scoring_raw           jsonb,
  error_message         text,
  unique (match_id, user_id)
);

create index if not exists arena_submissions_match_idx on arena_submissions (match_id);

alter table arena_submissions enable row level security;

create policy "Players can read submissions for their matches"
  on arena_submissions for select using (
    exists (
      select 1 from arena_matches m
      where m.id = arena_submissions.match_id
        and (m.player_one_id = auth.uid() or m.player_two_id = auth.uid())
    )
  );

create policy "Users can insert own submission"
  on arena_submissions for insert with check (auth.uid() = user_id);

-- ── arena_anti_cheat_logs ────────────────────────────────────────────────────
create table if not exists arena_anti_cheat_logs (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references arena_matches(id),
  user_id     uuid references auth.users(id),
  event_type  text not null,
  detail      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table arena_anti_cheat_logs enable row level security;
-- Only service role can read/write (admin only, via service key)

-- ── Seed challenges ──────────────────────────────────────────────────────────
insert into arena_challenges (slug, title, description, mode, difficulty, time_limit_mins, scoring_weights)
values
  (
    'landing-page-sprint',
    'Landing Page Sprint',
    'Build a responsive SaaS landing page with a hero section, feature grid, pricing table (3 tiers), and a working contact form. Deploy it live. Your build will be scored on performance, accessibility, and completeness.',
    'speed_build', 'medium', 30,
    '{"deployment_success":30,"lighthouse_performance":20,"lighthouse_accessibility":15,"lighthouse_best_practices":15,"lighthouse_seo":10,"speed_bonus":10}'
  ),
  (
    'dashboard-ui-build',
    'Dashboard UI Build',
    'Build an analytics dashboard UI with a sidebar nav, stat cards, a line chart, and a data table. Use any stack. Deploy live — no static HTML.',
    'speed_build', 'hard', 45,
    '{"deployment_success":30,"lighthouse_performance":20,"lighthouse_accessibility":15,"lighthouse_best_practices":15,"lighthouse_seo":10,"speed_bonus":10}'
  ),
  (
    'component-library-blitz',
    'Component Library Blitz',
    'Build a live-deployed page showcasing at least 8 UI components: button variants, input states, badge types, modal, dropdown, toast, card, and data table. All components must be interactive.',
    'speed_build', 'medium', 25,
    '{"deployment_success":30,"lighthouse_performance":20,"lighthouse_accessibility":15,"lighthouse_best_practices":15,"lighthouse_seo":10,"speed_bonus":10}'
  ),
  (
    'mobile-first-profile',
    'Mobile-First Profile Page',
    'Build a public developer profile page — avatar, bio, skill tags, project showcase (3 items), GitHub stats widget, and contact links. Must be mobile-first and score 90+ on mobile Lighthouse.',
    'speed_build', 'easy', 20,
    '{"deployment_success":30,"lighthouse_performance":25,"lighthouse_accessibility":20,"lighthouse_best_practices":10,"lighthouse_seo":5,"speed_bonus":10}'
  ),
  (
    'stripe-pricing-clone',
    'Stripe Pricing Clone',
    'Recreate the Stripe pricing page (https://stripe.com/gb/pricing) as closely as possible. Match the layout, toggle, card design, and feature lists. Deploy it live.',
    'clone_battle', 'hard', 40,
    '{"deployment_success":30,"lighthouse_performance":20,"lighthouse_accessibility":15,"lighthouse_best_practices":15,"lighthouse_seo":10,"speed_bonus":10}'
  ),
  (
    'vercel-homepage-clone',
    'Vercel Homepage Clone',
    'Clone the Vercel homepage (https://vercel.com). Recreate the hero, feature sections, and footer. Pixel-perfect wins — match typography, spacing, and dark mode.',
    'clone_battle', 'extreme', 50,
    '{"deployment_success":30,"lighthouse_performance":20,"lighthouse_accessibility":15,"lighthouse_best_practices":15,"lighthouse_seo":10,"speed_bonus":10}'
  ),
  (
    'broken-nav-fix',
    'Broken Navigation Fix',
    'You are given a Next.js app with a broken navigation system. The mobile menu does not open, active link states are wrong, and the auth guard redirects are broken. Clone the repo, fix all three bugs, deploy a working version.',
    'bug_hunt', 'medium', 35,
    '{"deployment_success":40,"lighthouse_performance":15,"lighthouse_accessibility":15,"lighthouse_best_practices":15,"lighthouse_seo":5,"speed_bonus":10}'
  )
on conflict (slug) do nothing;
