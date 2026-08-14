REVOKE EXECUTE ON FUNCTION public.owns_household(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_policy(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.owns_household(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_policy(uuid) TO authenticated, service_role;