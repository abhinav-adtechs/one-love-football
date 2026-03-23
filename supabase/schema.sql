-- 001: Create all custom enums for One Love Football
-- ================================================

CREATE TYPE user_role AS ENUM ('player', 'host', 'admin');

CREATE TYPE match_type AS ENUM ('community', 'friendly', 'tournament');

CREATE TYPE match_status AS ENUM (
  'roster_open',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TYPE game_format AS ENUM ('5v5', '6v6', '7v7', '8v8', '11v11');

CREATE TYPE roster_status AS ENUM (
  'confirmed',
  'waitlisted',
  'dropped',
  'no_show',
  'late_arrival'
);

CREATE TYPE player_source AS ENUM ('community', 'playo', 'external', 'guest_plus_one');

CREATE TYPE payment_method AS ENUM ('cash', 'google_pay', 'phonepe', 'upi_id', 'bank_transfer', 'other');

CREATE TYPE ledger_approval_status AS ENUM ('pending_approval', 'approved', 'rejected');

CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'waived');

CREATE TYPE ledger_entry_type AS ENUM (
  'game_fee',
  'late_fee',
  'no_show_fee',
  'extension_fee',
  'advance_payment',
  'topup',
  'refund',
  'adjustment'
);

CREATE TYPE turf_payment_terms AS ENUM ('pre_full', 'pre_partial', 'post_game');

CREATE TYPE player_position AS ENUM (
  'goalkeeper',
  'center_back',
  'left_back',
  'right_back',
  'defensive_mid',
  'central_mid',
  'attacking_mid',
  'left_wing',
  'right_wing',
  'striker',
  'any'
);

CREATE TYPE attendance_mark AS ENUM ('on_time', 'late', 'no_show', 'absent_notified');
-- 002: Create profiles table and auth trigger
-- =============================================

-- Helper function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone            TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  avatar_url       TEXT,
  jersey_number    SMALLINT,
  role             user_role NOT NULL DEFAULT 'player',
  default_positions player_position[] DEFAULT '{}',
  bio              TEXT,
  is_banned        BOOLEAN NOT NULL DEFAULT false,
  ban_reason       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, display_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
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
-- 008: Create ledger table (append-only transaction log)
-- ======================================================

CREATE TABLE ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(id),
  match_id         UUID REFERENCES matches(id),
  entry_type       ledger_entry_type NOT NULL,
  amount           INTEGER NOT NULL,
  running_balance  INTEGER,
  method           payment_method,
  proof_url        TEXT,
  transaction_ref  TEXT,
  description      TEXT,
  approval_status  ledger_approval_status NOT NULL DEFAULT 'pending_approval',
  approved_by      UUID REFERENCES profiles(id),
  approved_at      TIMESTAMPTZ,
  submitted_by     UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No updated_at trigger — ledger entries are immutable.
-- Corrections are handled by inserting new adjustment entries.
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
-- 011: Create notifications table
-- ================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  match_id    UUID REFERENCES matches(id) ON DELETE SET NULL,
  ledger_id   UUID REFERENCES ledger(id) ON DELETE SET NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 012: Create indexes for common query patterns
-- ===============================================

-- Profiles
CREATE INDEX idx_profiles_phone ON profiles (phone);

-- Matches
CREATE INDEX idx_matches_scheduled_date ON matches (scheduled_date DESC);
CREATE INDEX idx_matches_status ON matches (status);
CREATE INDEX idx_matches_created_by ON matches (created_by);

-- Games
CREATE INDEX idx_games_match ON games (match_id);

-- Match roster
CREATE INDEX idx_match_roster_match_status ON match_roster (match_id, status);
CREATE INDEX idx_match_roster_profile ON match_roster (profile_id);
CREATE INDEX idx_match_roster_waitlist ON match_roster (match_id, position)
  WHERE status = 'waitlisted';

-- Game player stats
CREATE INDEX idx_game_player_stats_profile ON game_player_stats (profile_id);
CREATE INDEX idx_game_player_stats_game ON game_player_stats (game_id);

-- Match billing
CREATE INDEX idx_match_billing_match ON match_billing (match_id);

-- Player match payments
CREATE INDEX idx_player_match_payments_match ON player_match_payments (match_id);
CREATE INDEX idx_player_match_payments_profile ON player_match_payments (profile_id);
CREATE INDEX idx_player_match_payments_outstanding ON player_match_payments (status)
  WHERE status IN ('pending', 'overdue');

-- Ledger
CREATE INDEX idx_ledger_profile_date ON ledger (profile_id, created_at DESC);
CREATE INDEX idx_ledger_match ON ledger (match_id);
CREATE INDEX idx_ledger_approval ON ledger (approval_status)
  WHERE approval_status = 'pending_approval';

-- Venue payments
CREATE INDEX idx_venue_payments_match ON venue_payments (match_id);

-- Venue bookings
CREATE INDEX idx_venue_bookings_match ON venue_bookings (match_id);
CREATE INDEX idx_venue_bookings_venue_date ON venue_bookings (venue_id, booking_date);

-- Notifications
CREATE INDEX idx_notifications_profile_unread ON notifications (profile_id, is_read, created_at DESC);
-- 013: Enable RLS and create policies for all tables
-- ===================================================

-- Helper: check if current user has host or admin role
CREATE OR REPLACE FUNCTION is_host_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('host', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==================
-- PROFILES
-- ==================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ==================
-- VENUES
-- ==================
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view venues"
  ON venues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hosts and admins can create venues"
  ON venues FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "Hosts and admins can update venues"
  ON venues FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- MATCHES
-- ==================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view matches"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hosts and admins can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "Hosts and admins can update matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- GAMES
-- ==================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view games"
  ON games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hosts and admins can create games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "Hosts and admins can update games"
  ON games FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- MATCH ROSTER
-- ==================
ALTER TABLE match_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view roster"
  ON match_roster FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Players can add themselves to roster"
  ON match_roster FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR is_host_or_admin()
  );

CREATE POLICY "Players can update own roster entry, hosts can update any"
  ON match_roster FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR is_host_or_admin()
  );

CREATE POLICY "Hosts and admins can remove roster entries"
  ON match_roster FOR DELETE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- MATCH BILLING
-- ==================
ALTER TABLE match_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view billing"
  ON match_billing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hosts and admins can manage billing"
  ON match_billing FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "Hosts and admins can update billing"
  ON match_billing FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- PLAYER MATCH PAYMENTS
-- ==================
ALTER TABLE player_match_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own payments, hosts see all"
  ON player_match_payments FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR is_host_or_admin()
  );

CREATE POLICY "Hosts and admins can create payment records"
  ON player_match_payments FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "Hosts and admins can update payment records"
  ON player_match_payments FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- LEDGER
-- ==================
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own ledger entries, hosts see all"
  ON ledger FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR is_host_or_admin()
  );

CREATE POLICY "Authenticated users can submit ledger entries"
  ON ledger FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    OR is_host_or_admin()
  );

-- No UPDATE or DELETE policies — ledger is append-only

-- ==================
-- VENUE PAYMENTS
-- ==================
ALTER TABLE venue_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts and admins can view venue payments"
  ON venue_payments FOR SELECT
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "Hosts and admins can create venue payments"
  ON venue_payments FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

-- ==================
-- VENUE BOOKINGS
-- ==================
ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts and admins can view venue bookings"
  ON venue_bookings FOR SELECT
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "Hosts and admins can create venue bookings"
  ON venue_bookings FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "Hosts and admins can update venue bookings"
  ON venue_bookings FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- GAME PLAYER STATS
-- ==================
ALTER TABLE game_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view stats"
  ON game_player_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hosts and admins can create stats"
  ON game_player_stats FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "Hosts and admins can update stats"
  ON game_player_stats FOR UPDATE
  TO authenticated
  USING (is_host_or_admin());

-- ==================
-- NOTIFICATIONS
-- ==================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON notifications FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "System and hosts can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());
-- 014: Create Supabase Storage buckets
-- =====================================

-- Avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Payment proofs bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for payment proofs
CREATE POLICY "Users can view own payment proofs, hosts see all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('host', 'admin')
      )
    )
  );

CREATE POLICY "Users can upload payment proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
