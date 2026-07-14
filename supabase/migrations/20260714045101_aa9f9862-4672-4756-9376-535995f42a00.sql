
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS doctor_phone text,
  ADD COLUMN IF NOT EXISTS last_doctor_visit date,
  ADD COLUMN IF NOT EXISTS medications jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS loan_balance numeric,
  ADD COLUMN IF NOT EXISTS cash_value numeric,
  ADD COLUMN IF NOT EXISTS annual_review_date date;

ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS annual_review_date date;

ALTER TABLE public.quote_scenarios
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quoted_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Quoted'
    CHECK (status IN ('Quoted','Presented','Accepted','Declined'));

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS dismiss_reason text;

INSERT INTO public.carriers (name, is_global)
SELECT 'Colombian Financial Group (CFG)', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.carriers WHERE name = 'Colombian Financial Group (CFG)'
);

INSERT INTO public.family_members (
  household_id, agent_id, first_name, last_name, email, phone_mobile, is_primary, relationship
)
SELECT
  h.id,
  h.agent_id,
  COALESCE(NULLIF(h.primary_contact_first_name, ''), 'Primary'),
  COALESCE(NULLIF(h.primary_contact_last_name, ''), h.household_name),
  h.primary_contact_email,
  h.primary_contact_phone,
  true,
  'Head of Household'
FROM public.households h
WHERE NOT EXISTS (
  SELECT 1 FROM public.family_members fm WHERE fm.household_id = h.id AND fm.is_primary = true
);
