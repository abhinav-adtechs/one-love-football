-- 015: Add UPDATE policy on ledger for payment approval workflow
-- ==============================================================

CREATE POLICY "Hosts and admins can update ledger approval status"
  ON ledger FOR UPDATE
  TO authenticated
  USING (is_host_or_admin())
  WITH CHECK (is_host_or_admin());
