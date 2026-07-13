-- AgentLifeline requested CRM schema
-- This migration creates public.contacts and updates public.households/public.policies
-- so the database has the requested households, contacts, and policies structure.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- households: household name, primary contact info, address, created date
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS primary_contact_first_name text,
  ADD COLUMN IF NOT EXISTS primary_contact_last_name text,
  ADD COLUMN IF NOT EXISTS primary_contact_phone text,
  ADD COLUMN IF NOT EXISTS primary_contact_email text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text;

UPDATE public.households
SET
  address_line1 = COALESCE(address_line1, primary_street),
  city = COALESCE(city, primary_city),
  state = COALESCE(state, primary_state),
  postal_code = COALESCE(postal_code, primary_zip)
WHERE address_line1 IS NULL
   OR city IS NULL
   OR state IS NULL
   OR postal_code IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_households_agent_id ON public.households(agent_id);
CREATE INDEX IF NOT EXISTS idx_households_household_name ON public.households(household_name);

DROP TRIGGER IF EXISTS update_households_updated_at ON public.households;
CREATE TRIGGER update_households_updated_at
BEFORE UPDATE ON public.households
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- contacts: linked to households through household_id
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL DEFAULT auth.uid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  dob date,
  relationship text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can manage contacts in their own households" ON public.contacts;
CREATE POLICY "Agents can manage contacts in their own households"
ON public.contacts
FOR ALL
TO authenticated
USING (
  agent_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.households h
    WHERE h.id = contacts.household_id
      AND (h.agent_id = auth.uid() OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  agent_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.households h
    WHERE h.id = contacts.household_id
      AND (h.agent_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_contacts_agent_id ON public.contacts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contacts_household_id ON public.contacts(household_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.contacts(last_name, first_name);

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- policies: linked to contacts through contact_id, with requested policy fields
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS policy_type text,
  ADD COLUMN IF NOT EXISTS effective_date date;

UPDATE public.policies
SET
  policy_type = COALESCE(policy_type, product_type::text),
  effective_date = COALESCE(effective_date, issue_date)
WHERE policy_type IS NULL
   OR effective_date IS NULL;

ALTER TABLE public.policies
  ALTER COLUMN status SET DEFAULT 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_policies_agent_id ON public.policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_policies_contact_id ON public.policies(contact_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_effective_date ON public.policies(effective_date);

DROP TRIGGER IF EXISTS update_policies_updated_at ON public.policies;
CREATE TRIGGER update_policies_updated_at
BEFORE UPDATE ON public.policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();