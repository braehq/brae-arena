-- Phase 4: Spectator chat + Follow system

CREATE TABLE IF NOT EXISTS arena_match_chat (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message    text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS arena_match_chat_match_idx ON arena_match_chat(match_id, created_at);
ALTER TABLE arena_match_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_public_read" ON arena_match_chat FOR SELECT USING (true);
CREATE POLICY "chat_auth_insert" ON arena_match_chat FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS arena_follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS arena_follows_follower_idx  ON arena_follows(follower_id);
CREATE INDEX IF NOT EXISTS arena_follows_following_idx ON arena_follows(following_id);
ALTER TABLE arena_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_public_read" ON arena_follows FOR SELECT USING (true);
CREATE POLICY "follows_own_insert"  ON arena_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_own_delete"  ON arena_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

ALTER PUBLICATION supabase_realtime ADD TABLE arena_match_chat;
