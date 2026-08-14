-- helper ownership checks
CREATE OR REPLACE FUNCTION public.owns_household(_household_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _household_id IS NULL OR public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.households h WHERE h.id = _household_id AND h.agent_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_policy(_policy_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _policy_id IS NULL OR public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.policies p WHERE p.id = _policy_id AND p.agent_id = auth.uid()
  )
$$;

-- clean up injected test rows
DELETE FROM public.beneficiaries WHERE agent_id = '1f423237-cab4-43e2-8bd1-e418516518b8';
DELETE FROM public.follow_ups WHERE agent_id = '1f423237-cab4-43e2-8bd1-e418516518b8';
DELETE FROM public.quote_scenarios WHERE agent_id = '1f423237-cab4-43e2-8bd1-e418516518b8';
DELETE FROM public.policies WHERE agent_id = '1f423237-cab4-43e2-8bd1-e418516518b8';
DELETE FROM public.family_members WHERE agent_id = '1f423237-cab4-43e2-8bd1-e418516518b8';

DROP POLICY IF EXISTS "own members" ON public.family_members;
CREATE POLICY "own members" ON public.family_members FOR ALL TO authenticated
USING ((agent_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK (((agent_id = auth.uid()) OR is_admin(auth.uid())) AND public.owns_household(household_id));

DROP POLICY IF EXISTS "own policies" ON public.policies;
CREATE POLICY "own policies" ON public.policies FOR ALL TO authenticated
USING ((agent_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK (((agent_id = auth.uid()) OR is_admin(auth.uid())) AND public.owns_household(household_id));

DROP POLICY IF EXISTS "own beneficiaries" ON public.beneficiaries;
CREATE POLICY "own beneficiaries" ON public.beneficiaries FOR ALL TO authenticated
USING ((agent_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK (((agent_id = auth.uid()) OR is_admin(auth.uid())) AND public.owns_policy(policy_id));

DROP POLICY IF EXISTS "own follow ups" ON public.follow_ups;
CREATE POLICY "own follow ups" ON public.follow_ups FOR ALL TO authenticated
USING ((agent_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK (((agent_id = auth.uid()) OR is_admin(auth.uid())) AND public.owns_household(household_id) AND public.owns_policy(policy_id));

DROP POLICY IF EXISTS "own quotes" ON public.quote_scenarios;
CREATE POLICY "own quotes" ON public.quote_scenarios FOR ALL TO authenticated
USING ((agent_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK (((agent_id = auth.uid()) OR is_admin(auth.uid())) AND public.owns_household(household_id));

DROP POLICY IF EXISTS "own riders" ON public.term_riders;
CREATE POLICY "own riders" ON public.term_riders FOR ALL TO authenticated
USING ((agent_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK (((agent_id = auth.uid()) OR is_admin(auth.uid())) AND public.owns_policy(policy_id));

DROP POLICY IF EXISTS "own alerts" ON public.alerts;
CREATE POLICY "own alerts" ON public.alerts FOR ALL TO authenticated
USING ((agent_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK (((agent_id = auth.uid()) OR is_admin(auth.uid())) AND public.owns_household(related_household_id) AND public.owns_policy(related_policy_id));