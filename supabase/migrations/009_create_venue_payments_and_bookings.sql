-- 009: Create venue_payments and venue_bookings tables
-- =====================================================

CREATE TABLE venue_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  venue_id         UUID NOT NULL REFERENCES venues(id),
  paid_by          UUID NOT NULL REFERENCES profiles(id),
  amount           INTEGER NOT NULL,
  method           payment_method,
  proof_url        TEXT,
  transaction_ref  TEXT,
  payment_terms    turf_payment_terms,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE venue_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  venue_id          UUID NOT NULL REFERENCES venues(id),
  booked_by         UUID NOT NULL REFERENCES profiles(id),
  booking_date      DATE NOT NULL,
  start_time        TIMETZ NOT NULL,
  end_time          TIMETZ NOT NULL,
  total_cost        INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'INR',
  payment_terms     turf_payment_terms NOT NULL DEFAULT 'pre_partial',
  extended_end_time TIMETZ,
  extension_cost    INTEGER DEFAULT 0,
  confirmation_ref  TEXT,
  status            TEXT NOT NULL DEFAULT 'tentative',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_venue_bookings_updated_at
  BEFORE UPDATE ON venue_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
