ALTER TABLE arena_agents
  ADD COLUMN IF NOT EXISTS avatar_emoji    text NOT NULL DEFAULT '🤖',
  ADD COLUMN IF NOT EXISTS color_accent    text NOT NULL DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS personality_tag text,
  ADD COLUMN IF NOT EXISTS model_tag       text NOT NULL DEFAULT 'Pattern Matcher';
