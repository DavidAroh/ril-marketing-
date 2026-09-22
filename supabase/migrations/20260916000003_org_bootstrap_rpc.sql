-- Atomic org bootstrap. Why an RPC and not three RLS-gated statements:
-- Postgres checks SELECT policies on INSERT...RETURNING rows, so a client
-- insert with `.select()` can never see its own not-yet-member org.
-- This SECURITY DEFINER function does all three writes atomically and can
-- only ever add the CALLER as owner of a brand-new org — least privilege
-- preserved, no service-role key needed in the app.

CREATE OR REPLACE FUNCTION create_organization_with_owner(org_name text)
RETURNS uuid AS $$
DECLARE
  new_org_id uuid;
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF char_length(btrim(COALESCE(org_name, ''))) < 2
     OR char_length(org_name) > 120 THEN
    RAISE EXCEPTION 'Invalid organization name' USING ERRCODE = '22000';
  END IF;

  INSERT INTO organizations (name)
  VALUES (btrim(org_name))
  RETURNING id INTO new_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, caller, 'owner');

  INSERT INTO profiles (id, organization_id)
  VALUES (caller, new_org_id)
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_organization_with_owner(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_organization_with_owner(text) TO authenticated;
