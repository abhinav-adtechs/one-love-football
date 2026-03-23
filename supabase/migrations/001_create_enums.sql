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
