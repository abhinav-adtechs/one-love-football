-- Add quick cash tracking columns to match_roster
-- Lets hosts mark any player (including guests) as cash collected in the field
ALTER TABLE match_roster
  ADD COLUMN amount_collected integer NOT NULL DEFAULT 0,
  ADD COLUMN paid_at timestamptz;

-- Make venue_id nullable in venue_payments
-- Allows recording ad-hoc turf payments without a pre-created venue record
ALTER TABLE venue_payments
  ALTER COLUMN venue_id DROP NOT NULL;
