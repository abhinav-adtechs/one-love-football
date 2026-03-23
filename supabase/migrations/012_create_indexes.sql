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
