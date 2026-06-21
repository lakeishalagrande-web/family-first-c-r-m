
-- Replace insert policy to enforce agent_id = auth.uid() (or admin)
DROP POLICY IF EXISTS "insert pii log" ON public.pii_access_log;
CREATE POLICY "insert pii log"
ON public.pii_access_log
FOR INSERT
TO authenticated
WITH CHECK (
  accessor_id = auth.uid()
  AND (agent_id = auth.uid() OR public.is_admin(auth.uid()))
);

-- Explicit admin-only UPDATE policy (makes intent clear; non-admins blocked)
DROP POLICY IF EXISTS "admin update pii log" ON public.pii_access_log;
CREATE POLICY "admin update pii log"
ON public.pii_access_log
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Explicit admin-only DELETE policy
DROP POLICY IF EXISTS "admin delete pii log" ON public.pii_access_log;
CREATE POLICY "admin delete pii log"
ON public.pii_access_log
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
