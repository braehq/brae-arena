-- In-browser game modes
ALTER TABLE arena_challenges
  ADD COLUMN IF NOT EXISTS challenge_type text NOT NULL DEFAULT 'url_submit'
    CHECK (challenge_type IN ('url_submit','code_duel','css_battle','bug_hunt_code')),
  ADD COLUMN IF NOT EXISTS starter_code    text,
  ADD COLUMN IF NOT EXISTS language        text NOT NULL DEFAULT 'javascript',
  ADD COLUMN IF NOT EXISTS test_cases      jsonb,
  ADD COLUMN IF NOT EXISTS target_image_url text,
  ADD COLUMN IF NOT EXISTS solution_code   text;

ALTER TABLE arena_submissions
  ADD COLUMN IF NOT EXISTS submitted_code  text,
  ADD COLUMN IF NOT EXISTS test_results    jsonb,
  ADD COLUMN IF NOT EXISTS tests_passed    integer,
  ADD COLUMN IF NOT EXISTS tests_total     integer;

-- 'any' game_type — matches any opponent regardless of game type
ALTER TABLE arena_queue DROP CONSTRAINT IF EXISTS arena_queue_game_type_check;
ALTER TABLE arena_queue ADD CONSTRAINT arena_queue_game_type_check
  CHECK (game_type IN ('speed_build','clone_battle','bug_hunt','any'));
