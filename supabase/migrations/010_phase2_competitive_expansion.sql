-- ─────────────────────────────────────────────
-- PHASE 2: Competitive Expansion
-- ─────────────────────────────────────────────

create table if not exists arena_seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  number      integer not null unique,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists arena_seasons_active_unique
  on arena_seasons (is_active) where is_active = true;

create table if not exists arena_season_rankings (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references arena_seasons(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  final_elo     integer not null,
  final_tier    text not null,
  rank_position integer not null,
  matches_played integer not null default 0,
  wins          integer not null default 0,
  losses        integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (season_id, user_id)
);

create table if not exists arena_tournaments (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  description        text,
  season_id          uuid references arena_seasons(id),
  game_type          text not null check (game_type in ('speed_build','clone_battle','bug_hunt')),
  bracket_type       text not null default 'single_elimination'
                       check (bracket_type in ('single_elimination','double_elimination','round_robin')),
  max_participants   integer not null default 8 check (max_participants in (4,8,16,32)),
  min_elo            integer not null default 0,
  status             text not null default 'upcoming'
                       check (status in ('upcoming','registration','active','complete','cancelled')),
  registration_ends  timestamptz,
  starts_at          timestamptz,
  prize_description  text,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now()
);

create table if not exists arena_tournament_participants (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references arena_tournaments(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  seed           integer,
  status         text not null default 'registered'
                   check (status in ('registered','active','eliminated','winner')),
  eliminated_round integer,
  registered_at  timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table if not exists arena_tournament_matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references arena_tournaments(id) on delete cascade,
  match_id        uuid references arena_matches(id),
  round           integer not null,
  bracket_slot    integer not null,
  player_one_id   uuid references auth.users(id),
  player_two_id   uuid references auth.users(id),
  winner_id       uuid references auth.users(id),
  status          text not null default 'pending'
                    check (status in ('pending','waiting_players','active','complete','bye')),
  created_at      timestamptz not null default now(),
  unique (tournament_id, round, bracket_slot)
);

create table if not exists arena_spectators (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references arena_matches(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  left_at     timestamptz,
  unique (match_id, user_id)
);

create table if not exists arena_match_events (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references arena_matches(id) on delete cascade,
  user_id      uuid references auth.users(id),
  event_type   text not null,
  payload      jsonb not null default '{}',
  occurred_at  timestamptz not null default now()
);

create index if not exists arena_match_events_match_id_idx on arena_match_events(match_id);
create index if not exists arena_season_rankings_season_idx on arena_season_rankings(season_id, rank_position);
create index if not exists arena_tournament_participants_tournament_idx on arena_tournament_participants(tournament_id);
create index if not exists arena_spectators_match_idx on arena_spectators(match_id) where left_at is null;

alter table arena_seasons enable row level security;
alter table arena_season_rankings enable row level security;
alter table arena_tournaments enable row level security;
alter table arena_tournament_participants enable row level security;
alter table arena_tournament_matches enable row level security;
alter table arena_spectators enable row level security;
alter table arena_match_events enable row level security;

create policy "seasons_public_read" on arena_seasons for select using (true);
create policy "season_rankings_public_read" on arena_season_rankings for select using (true);
create policy "tournaments_public_read" on arena_tournaments for select using (true);
create policy "tournament_participants_public_read" on arena_tournament_participants for select using (true);
create policy "tournament_matches_public_read" on arena_tournament_matches for select using (true);
create policy "spectators_public_read" on arena_spectators for select using (true);
create policy "match_events_public_read" on arena_match_events for select using (true);

create policy "spectators_self_insert" on arena_spectators for insert to authenticated with check (auth.uid() = user_id);
create policy "spectators_self_update" on arena_spectators for update to authenticated using (auth.uid() = user_id);
create policy "tournament_participants_self_insert" on arena_tournament_participants for insert to authenticated with check (auth.uid() = user_id);

insert into arena_seasons (name, number, starts_at, ends_at, is_active)
values ('Season 1', 1, now(), now() + interval '28 days', true)
on conflict (number) do nothing;
