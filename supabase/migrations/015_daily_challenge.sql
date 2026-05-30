-- Daily challenge attempts
-- One best-score row per user per day. Can retry — score only improves.
CREATE TABLE IF NOT EXISTS arena_daily_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id  uuid NOT NULL REFERENCES arena_challenges(id),
  date          date NOT NULL,
  score         integer NOT NULL DEFAULT 0,
  tests_passed  integer NOT NULL DEFAULT 0,
  tests_total   integer NOT NULL DEFAULT 0,
  submitted_code text,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  attempts      integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS arena_daily_attempts_date_idx ON arena_daily_attempts(date, score DESC);
CREATE INDEX IF NOT EXISTS arena_daily_attempts_user_idx ON arena_daily_attempts(user_id);

ALTER TABLE arena_daily_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_public_read" ON arena_daily_attempts FOR SELECT USING (true);
CREATE POLICY "daily_own_insert" ON arena_daily_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_own_update" ON arena_daily_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
