-- Migration: fix_rls_funding_gate
-- Description: Add BEFORE UPDATE triggers on draw_requests and wire_batches to enforce
-- fund_draws permission when status is being SET TO 'funded'.
--
-- The existing RLS USING clause checks the CURRENT row status (pre-update), not the
-- NEW status being written. This means a processor without fund_draws can set status
-- to 'funded' because the USING clause sees the old status ('pending_wire').
-- A BEFORE UPDATE trigger checks NEW.status and properly blocks unauthorized funding.

CREATE OR REPLACE FUNCTION enforce_funding_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when status is being changed TO 'funded'
  IF NEW.status = 'funded' AND (OLD.status IS DISTINCT FROM 'funded') THEN
    -- Allow service role (auth.uid() is NULL for service role calls)
    IF auth.uid() IS NOT NULL AND NOT has_permission(auth.uid(), 'fund_draws') THEN
      RAISE EXCEPTION 'Permission denied: fund_draws required to set status to funded'
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_funding_permission_draw_requests ON draw_requests;
CREATE TRIGGER enforce_funding_permission_draw_requests
  BEFORE UPDATE ON draw_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_funding_permission();

DROP TRIGGER IF EXISTS enforce_funding_permission_wire_batches ON wire_batches;
CREATE TRIGGER enforce_funding_permission_wire_batches
  BEFORE UPDATE ON wire_batches
  FOR EACH ROW EXECUTE FUNCTION enforce_funding_permission();
