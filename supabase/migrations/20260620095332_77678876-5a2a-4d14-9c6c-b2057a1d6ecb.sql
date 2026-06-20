
-- Explicit deny policies on user_roles: only admins may modify
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
