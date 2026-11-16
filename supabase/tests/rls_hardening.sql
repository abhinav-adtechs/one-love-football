-- Checks the policies and triggers from 018_harden_rls_policies.sql.
--
-- Run with psql against a local or throwaway database that has every
-- migration applied, e.g. a local Supabase stack:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls_hardening.sql
--
-- Each check prints "PASS: ...". Any "FAIL: ..." error means a rule is not
-- enforced. Everything runs in one transaction and is rolled back.

\set ON_ERROR_STOP on

BEGIN;

-- Fixtures, as the database owner -------------------------------------------

INSERT INTO auth.users (id, phone, raw_user_meta_data) VALUES
  ('00000000-0000-4000-a000-000000000001', '919000000001', '{"display_name": "Player"}'),
  ('00000000-0000-4000-a000-000000000002', '919000000002', '{"display_name": "Host"}'),
  ('00000000-0000-4000-a000-000000000003', '919000000003', '{"display_name": "Banned"}');

UPDATE profiles SET role = 'host' WHERE id = '00000000-0000-4000-a000-000000000002';
UPDATE profiles SET is_banned = true, ban_reason = 'test'
  WHERE id = '00000000-0000-4000-a000-000000000003';

INSERT INTO matches (id, title, scheduled_date, created_by) VALUES
  ('00000000-0000-4000-b000-000000000001', 'Match 1', current_date, '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-b000-000000000002', 'Match 2', current_date, '00000000-0000-4000-a000-000000000002');

INSERT INTO match_roster (id, match_id, profile_id) VALUES
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001');

SET LOCAL ROLE authenticated;

-- Profiles ------------------------------------------------------------------

SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}', true);

DO $$
DECLARE n int;
BEGIN
  UPDATE profiles SET display_name = 'Renamed', jersey_number = 10 WHERE id = auth.uid();
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: player cannot edit own name'; END IF;
  RAISE NOTICE 'PASS: player can edit own name and jersey';
END $$;

DO $$ BEGIN
  UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
  RAISE EXCEPTION 'FAIL: player changed own role';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: player cannot change own role';
END $$;

SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000003", "role": "authenticated"}', true);

DO $$ BEGIN
  UPDATE profiles SET is_banned = false, ban_reason = NULL WHERE id = auth.uid();
  RAISE EXCEPTION 'FAIL: banned player lifted own ban';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: banned player cannot lift own ban';
END $$;

-- Ledger --------------------------------------------------------------------

SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}', true);

DO $$ BEGIN
  INSERT INTO ledger (profile_id, entry_type, amount, approval_status, submitted_by, approved_by, approved_at)
  VALUES (auth.uid(), 'topup', 100000, 'approved', auth.uid(), auth.uid(), now());
  RAISE EXCEPTION 'FAIL: player inserted an approved credit';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: player cannot insert an approved credit';
END $$;

DO $$ BEGIN
  INSERT INTO ledger (profile_id, entry_type, amount, submitted_by)
  VALUES ('00000000-0000-4000-a000-000000000002', 'game_fee', -100000, auth.uid());
  RAISE EXCEPTION 'FAIL: player inserted an entry on another balance';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: player cannot insert an entry on another balance';
END $$;

DO $$
DECLARE n int;
BEGIN
  INSERT INTO ledger (profile_id, entry_type, amount, method, approval_status, submitted_by)
  VALUES (auth.uid(), 'topup', 50000, 'google_pay', 'pending_approval', auth.uid());
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: player cannot submit a pending top-up'; END IF;
  RAISE NOTICE 'PASS: player can submit a pending top-up';
END $$;

SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);

DO $$
DECLARE n int;
BEGIN
  INSERT INTO ledger (profile_id, entry_type, amount, method, approval_status, submitted_by, approved_by, approved_at)
  VALUES ('00000000-0000-4000-a000-000000000001', 'topup', 50000, 'cash', 'approved', auth.uid(), auth.uid(), now());
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: host cannot record a cash payment'; END IF;
  RAISE NOTICE 'PASS: host can record an approved cash payment';
END $$;

-- Match roster --------------------------------------------------------------

SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}', true);

DO $$ BEGIN
  UPDATE match_roster SET amount_collected = 50000, paid_at = now()
  WHERE id = '00000000-0000-4000-c000-000000000001';
  RAISE EXCEPTION 'FAIL: player marked own fee collected';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: player cannot mark own fee collected';
END $$;

DO $$ BEGIN
  UPDATE match_roster SET match_id = '00000000-0000-4000-b000-000000000002'
  WHERE id = '00000000-0000-4000-c000-000000000001';
  RAISE EXCEPTION 'FAIL: player moved own roster entry to another match';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: player cannot move own roster entry to another match';
END $$;

DO $$ BEGIN
  INSERT INTO match_roster (match_id, profile_id, amount_collected, paid_at)
  VALUES ('00000000-0000-4000-b000-000000000002', auth.uid(), 50000, now());
  RAISE EXCEPTION 'FAIL: player joined a match already marked paid';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: player cannot join a match already marked paid';
END $$;

DO $$
DECLARE n int;
BEGIN
  INSERT INTO match_roster (match_id, profile_id)
  VALUES ('00000000-0000-4000-b000-000000000002', auth.uid());
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: player cannot join a match'; END IF;
  RAISE NOTICE 'PASS: player can join a match';
END $$;

SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);

DO $$
DECLARE n int;
BEGIN
  UPDATE match_roster SET amount_collected = 50000, paid_at = now()
  WHERE id = '00000000-0000-4000-c000-000000000001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: host cannot mark a fee collected'; END IF;
  RAISE NOTICE 'PASS: host can mark a fee collected';
END $$;

ROLLBACK;
