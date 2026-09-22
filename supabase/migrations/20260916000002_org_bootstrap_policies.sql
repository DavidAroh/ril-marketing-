-- Allow first-run bootstrap: any signed-in user may create an organization
-- and add THEMSELVES as a member. Nothing broader (no org UPDATE/DELETE here;
-- no UI edits organizations in v1).

DROP POLICY IF EXISTS org_insert_authenticated ON organizations;
CREATE POLICY org_insert_authenticated ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- A user may only ever insert their own membership row.
DROP POLICY IF EXISTS members_insert_self ON organization_members;
CREATE POLICY members_insert_self ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
