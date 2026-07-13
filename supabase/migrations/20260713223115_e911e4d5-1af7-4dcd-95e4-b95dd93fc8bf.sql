GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.term_riders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_writing_numbers TO authenticated;
GRANT SELECT ON public.carriers TO authenticated;
GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT ON public.pii_access_log TO authenticated;

GRANT ALL ON public.households, public.contacts, public.policies, public.family_members,
  public.beneficiaries, public.term_riders, public.follow_ups, public.alerts,
  public.quote_scenarios, public.agent_writing_numbers, public.carriers,
  public.announcements, public.profiles, public.user_roles, public.pii_access_log
  TO service_role;