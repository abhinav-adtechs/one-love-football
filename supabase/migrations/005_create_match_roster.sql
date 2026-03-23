-- 005: Create match_roster table
-- ===============================

CREATE TABLE match_roster (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  profile_id       UUID REFERENCES profiles(id),
  guest_name       TEXT,
  guest_phone      TEXT,
  invited_by       UUID REFERENCES profiles(id),
  source           player_source NOT NULL DEFAULT 'community',
  status           roster_status NOT NULL DEFAULT 'confirmed',
  position         SMALLINT,
  attendance       attendance_mark,
  arrived_at       TIMESTAMPTZ,
  team             TEXT,
  playing_position player_position,
  signed_up_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  dropped_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A registered player can only appear once per match
CREATE UNIQUE INDEX idx_match_roster_unique_profile
  ON match_roster (match_id, profile_id)
  WHERE profile_id IS NOT NULL;

CREATE TRIGGER set_match_roster_updated_at
  BEFORE UPDATE ON match_roster
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
