-- ─────────────────────────────────────────────
-- PHASE 3: Team Battles
-- ─────────────────────────────────────────────

create table if not exists arena_teams (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  tag                 text not null check (char_length(tag) between 2 and 5),
  description         text,
  avatar_url          text,
  owner_id            uuid not null references auth.users(id) on delete restrict,
  team_elo            integer not null default 1000,
  team_rank_tier      text not null default 'bronze'
                        check (team_rank_tier in ('bronze','silver','gold','platinum','diamond','mythic')),
  team_wins           integer not null default 0,
  team_losses         integer not null default 0,
  team_matches_played integer not null default 0,
  max_members         integer not null default 5 check (max_members between 2 and 10),
  is_open             boolean not null default false,
  created_at          timestamptz not null default now()
);

create table if not exists arena_team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references arena_teams(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','captain','member')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists arena_team_invites (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references arena_teams(id) on delete cascade,
  invited_by  uuid not null references auth.users(id) on delete cascade,
  invitee_id  uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz not null default now()
);

create unique index if not exists arena_team_invites_pending_unique
  on arena_team_invites (team_id, invitee_id) where status = 'pending';

create table if not exists arena_team_matches (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null references arena_challenges(id),
  team_one_id     uuid not null references arena_teams(id),
  team_two_id     uuid not null references arena_teams(id),
  format          text not null default '2v2' check (format in ('2v2','3v3')),
  status          text not null default 'pending'
                    check (status in ('pending','accepted','active','scoring','complete','cancelled','draw')),
  started_at      timestamptz,
  ends_at         timestamptz,
  winner_team_id  uuid references arena_teams(id),
  team_one_score  integer,
  team_two_score  integer,
  elo_change_t1   integer,
  elo_change_t2   integer,
  challenged_by   uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create table if not exists arena_team_match_players (
  id                    uuid primary key default gen_random_uuid(),
  team_match_id         uuid not null references arena_team_matches(id) on delete cascade,
  team_id               uuid not null references arena_teams(id),
  user_id               uuid not null references auth.users(id),
  deployed_url          text,
  github_url            text,
  submitted_at          timestamptz,
  score_performance     integer,
  score_accessibility   integer,
  score_best_practices  integer,
  score_seo             integer,
  score_speed_bonus     integer,
  score_total           integer,
  scoring_status        text not null default 'pending'
                          check (scoring_status in ('pending','running','complete','failed')),
  unique (team_match_id, user_id)
);

create index if not exists arena_team_members_user_idx on arena_team_members(user_id);
create index if not exists arena_team_members_team_idx on arena_team_members(team_id);
create index if not exists arena_team_invites_invitee_idx on arena_team_invites(invitee_id) where status = 'pending';
create index if not exists arena_team_matches_team_one_idx on arena_team_matches(team_one_id);
create index if not exists arena_team_matches_team_two_idx on arena_team_matches(team_two_id);

alter table arena_teams enable row level security;
alter table arena_team_members enable row level security;
alter table arena_team_invites enable row level security;
alter table arena_team_matches enable row level security;
alter table arena_team_match_players enable row level security;

create policy "teams_public_read" on arena_teams for select using (true);
create policy "team_members_public_read" on arena_team_members for select using (true);
create policy "team_matches_public_read" on arena_team_matches for select using (true);
create policy "team_match_players_public_read" on arena_team_match_players for select using (true);
create policy "team_invites_read" on arena_team_invites for select to authenticated
  using (auth.uid() = invitee_id or auth.uid() = invited_by);
create policy "teams_insert" on arena_teams for insert to authenticated with check (auth.uid() = owner_id);
create policy "teams_update_owner" on arena_teams for update to authenticated using (auth.uid() = owner_id);
create policy "team_members_insert" on arena_team_members for insert to authenticated with check (auth.uid() = user_id);
create policy "team_members_delete_self" on arena_team_members for delete to authenticated using (auth.uid() = user_id);
create policy "team_invites_insert" on arena_team_invites for insert to authenticated with check (auth.uid() = invited_by);
create policy "team_invites_update_invitee" on arena_team_invites for update to authenticated using (auth.uid() = invitee_id);
create policy "team_match_players_insert" on arena_team_match_players for insert to authenticated with check (auth.uid() = user_id);
create policy "team_match_players_update" on arena_team_match_players for update to authenticated using (auth.uid() = user_id);
