-- 1. Person profile additions
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS first_met_date date;

-- 2. Beneficiaries reuse existing person records (no new people table)
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ssn_encrypted bytea,
  ADD COLUMN IF NOT EXISTS ssn_last4 text;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_member_id ON public.beneficiaries(member_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_policy_id ON public.beneficiaries(policy_id);

-- 3. Fast global person search
CREATE INDEX IF NOT EXISTS idx_fm_first_name_lower ON public.family_members(lower(first_name));
CREATE INDEX IF NOT EXISTS idx_fm_last_name_lower ON public.family_members(lower(last_name));
CREATE INDEX IF NOT EXISTS idx_fm_dob ON public.family_members(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_fm_phone_mobile ON public.family_members(phone_mobile);
CREATE INDEX IF NOT EXISTS idx_fm_phone_home ON public.family_members(phone_home);
CREATE INDEX IF NOT EXISTS idx_fm_agent_household ON public.family_members(agent_id, household_id);