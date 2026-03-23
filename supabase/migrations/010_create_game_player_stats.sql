-- 010: Create game_player_stats table
-- ====================================

CREATE TABLE game_player_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  goals           SMALLINT NOT NULL DEFAULT 0,
  assists         SMALLINT NOT NULL DEFAULT 0,
  own_goals       SMALLINT NOT NULL DEFAULT 0,
  clean_sheet     BOOLEAN DEFAULT false,
  hard_play       BOOLEAN NOT NULL DEFAULT false,
  is_motm         BOOLEAN NOT NULL DEFAULT false,
  position_played player_position,
  team            TEXT,
  rating          NUMERIC(3,1),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (game_id, profile_id)
);

CREATE TRIGGER set_game_player_stats_updated_at
  BEFORE UPDATE ON game_player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
