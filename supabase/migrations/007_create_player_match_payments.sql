-- 007: Create player_match_payments table
-- ========================================

CREATE TABLE player_match_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id),
  amount_due       INTEGER NOT NULL,
  amount_paid      INTEGER NOT NULL DEFAULT 0,
  status           payment_status NOT NULL DEFAULT 'pending',
  due_date         TIMESTAMPTZ,
  marked_to_pay_by UUID REFERENCES profiles(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (match_id, profile_id)
);

CREATE TRIGGER set_player_match_payments_updated_at
  BEFORE UPDATE ON player_match_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
