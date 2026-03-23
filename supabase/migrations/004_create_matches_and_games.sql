-- 004: Create matches and games tables
-- =====================================

CREATE TABLE matches (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                     TEXT NOT NULL,
  match_type                match_type NOT NULL DEFAULT 'community',
  status                    match_status NOT NULL DEFAULT 'roster_open',
  format                    game_format NOT NULL DEFAULT '7v7',
  scheduled_date            DATE NOT NULL,
  start_time                TIMETZ,
  end_time                  TIMETZ,
  actual_end_time           TIMETZ,
  venue_id                  UUID REFERENCES venues(id),
  max_players               SMALLINT NOT NULL DEFAULT 14,
  min_players               SMALLINT NOT NULL DEFAULT 10,
  fee_per_player            INTEGER NOT NULL DEFAULT 0,
  late_fee                  INTEGER DEFAULT 0,
  no_show_fee               INTEGER DEFAULT 0,
  extension_fee_per_player  INTEGER DEFAULT 0,
  currency                  TEXT NOT NULL DEFAULT 'INR',
  payment_deadline          TIMESTAMPTZ,
  opponent_name             TEXT,
  notes                     TEXT,
  created_by                UUID NOT NULL REFERENCES profiles(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE games (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  game_number       SMALLINT NOT NULL DEFAULT 1,
  status            game_status NOT NULL DEFAULT 'scheduled',
  format            game_format,
  start_time        TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,
  is_extension      BOOLEAN NOT NULL DEFAULT false,
  extension_minutes SMALLINT DEFAULT 0,
  team_a_name       TEXT DEFAULT 'Team A',
  team_b_name       TEXT DEFAULT 'Team B',
  team_a_score      SMALLINT DEFAULT 0,
  team_b_score      SMALLINT DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (match_id, game_number)
);

CREATE TRIGGER set_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
