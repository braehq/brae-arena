-- AI Agent Battles
CREATE TABLE IF NOT EXISTS arena_agents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  description    text,
  agent_code     text NOT NULL DEFAULT 'function agent(challenge) {\n  return challenge.starter_code;\n}',
  agent_elo      integer NOT NULL DEFAULT 1000,
  wins           integer NOT NULL DEFAULT 0,
  losses         integer NOT NULL DEFAULT 0,
  matches_played integer NOT NULL DEFAULT 0,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arena_agent_matches (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id           uuid NOT NULL REFERENCES arena_challenges(id),
  agent_one_id           uuid NOT NULL REFERENCES arena_agents(id),
  agent_two_id           uuid NOT NULL REFERENCES arena_agents(id),
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','running','complete','failed')),
  agent_one_code         text,
  agent_two_code         text,
  agent_one_score        integer,
  agent_two_score        integer,
  agent_one_tests_passed integer,
  agent_two_tests_passed integer,
  agent_one_ms           integer,
  agent_two_ms           integer,
  winner_agent_id        uuid REFERENCES arena_agents(id),
  elo_change_one         integer,
  elo_change_two         integer,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arena_agent_queue (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id  uuid NOT NULL REFERENCES arena_agents(id) ON DELETE CASCADE UNIQUE,
  elo       integer NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  status    text NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting','matched','cancelled'))
);

ALTER TABLE arena_agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_agent_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_agent_queue   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_public_read" ON arena_agents FOR SELECT USING (true);
CREATE POLICY "agents_own_insert"  ON arena_agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agents_own_update"  ON arena_agents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "agent_matches_read" ON arena_agent_matches FOR SELECT USING (true);
CREATE POLICY "agent_queue_read"   ON arena_agent_queue FOR SELECT USING (true);
CREATE POLICY "agent_queue_insert" ON arena_agent_queue FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = (SELECT user_id FROM arena_agents WHERE id = agent_id)
);
CREATE POLICY "agent_queue_update" ON arena_agent_queue FOR UPDATE TO authenticated USING (
  auth.uid() = (SELECT user_id FROM arena_agents WHERE id = agent_id)
);
