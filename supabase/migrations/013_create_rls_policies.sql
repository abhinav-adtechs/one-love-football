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
