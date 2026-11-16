-- 018: Harden RLS policies
-- ========================
-- RLS policies can't compare a row's old and new values, so the per-column
-- rules on profiles and match_roster are enforced with BEFORE triggers.
-- The triggers only restrict client roles (anon / authenticated); the
-- service role, the SQL editor and SECURITY DEFINER functions are not affected.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ==================
-- PROFILES
-- ==================
-- Users keep editing their own name, jersey, positions, bio and avatar.
-- Role, ban status and phone (the verified login identity) are admin-only.

CREATE OR REPLACE FUNCTION protect_profile_admin_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NOT public.is_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
       OR NEW.phone IS DISTINCT FROM OLD.phone
     )
  THEN
    RAISE EXCEPTION 'Only admins can change role, ban status or phone'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_profile_admin_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_admin_columns();

-- ==================
-- LEDGER
-- ==================
-- Players may only submit pending entries against their own balance.
-- Approved entries come from hosts/admins (cash payments, match fees) or
-- from approving a pending entry via the UPDATE policy in 015.

DROP POLICY "Authenticated users can submit ledger entries" ON ledger;

CREATE POLICY "Players can submit own pending entries, hosts can submit any"
  ON ledger FOR INSERT
  TO authenticated
  WITH CHECK (
    is_host_or_admin()
    OR (
      profile_id = auth.uid()
      AND submitted_by = auth.uid()
      AND approval_status = 'pending_approval'
      AND approved_by IS NULL
      AND approved_at IS NULL
    )
  );

-- ==================
-- MATCH ROSTER
-- ==================
-- Payment collection and attendance are recorded by hosts/admins only.
-- Players can still add themselves and edit the rest of their own entry.

CREATE OR REPLACE FUNCTION protect_roster_host_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_host_or_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.amount_collected <> 0
       OR NEW.paid_at IS NOT NULL
       OR NEW.attendance IS NOT NULL
       OR NEW.arrived_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'Only hosts and admins can record payment or attendance'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.amount_collected IS DISTINCT FROM OLD.amount_collected
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.attendance IS DISTINCT FROM OLD.attendance
     OR NEW.arrived_at IS DISTINCT FROM OLD.arrived_at
     OR NEW.match_id IS DISTINCT FROM OLD.match_id
  THEN
    RAISE EXCEPTION 'Only hosts and admins can record payment or attendance'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_roster_host_columns
  BEFORE INSERT OR UPDATE ON match_roster
  FOR EACH ROW EXECUTE FUNCTION protect_roster_host_columns();
