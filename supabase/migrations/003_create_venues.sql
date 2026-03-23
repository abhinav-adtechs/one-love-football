-- 003: Create venues table
-- ========================

CREATE TABLE venues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  address           TEXT,
  city              TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  cost_per_hour     INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'INR',
  surface_type      TEXT,
  facilities        TEXT[] DEFAULT '{}',
  supported_formats game_format[] DEFAULT '{}',
  contact_phone     TEXT,
  contact_name      TEXT,
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
