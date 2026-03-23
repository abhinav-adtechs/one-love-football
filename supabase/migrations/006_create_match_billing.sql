-- 006: Create match_billing table
-- ================================

CREATE TABLE match_billing (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id               UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  turf_booking_cost      INTEGER NOT NULL,
  per_player_share       INTEGER NOT NULL,
  round_off              INTEGER NOT NULL DEFAULT 0,
  additional_charges     INTEGER NOT NULL DEFAULT 0,
  additional_charges_note TEXT,
  total_collected_target INTEGER NOT NULL,
  currency               TEXT NOT NULL DEFAULT 'INR',
  created_by             UUID NOT NULL REFERENCES profiles(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_match_billing_updated_at
  BEFORE UPDATE ON match_billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
