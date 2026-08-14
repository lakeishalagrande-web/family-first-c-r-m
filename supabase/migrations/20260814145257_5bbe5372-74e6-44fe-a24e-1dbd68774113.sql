-- 1. Product type: accidental coverage
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'accidental_death';

-- 2. Payment design: continuous pay + generic paid-to-age
ALTER TYPE public.payment_structure ADD VALUE IF NOT EXISTS 'continuous_pay';
ALTER TYPE public.payment_structure ADD VALUE IF NOT EXISTS 'paid_to_age';

-- 3. Alerts: rider termination alert type (foundation only)
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'rider_termination';

-- 4. Term design enum
DO $$ BEGIN
  CREATE TYPE public.term_design AS ENUM ('level_term', 'rop_term');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Rider type enum
DO $$ BEGIN
  CREATE TYPE public.rider_type AS ENUM ('child', 'spouse', 'other_insured');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Policies: term/payment design detail (additive, existing rows untouched)
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS term_design public.term_design,
  ADD COLUMN IF NOT EXISTS term_length_years integer,
  ADD COLUMN IF NOT EXISTS pay_to_age integer;

-- 7. Riders: generalize term_riders to child / spouse / other-insured riders
ALTER TABLE public.term_riders
  ADD COLUMN IF NOT EXISTS rider_type public.rider_type NOT NULL DEFAULT 'child',
  ADD COLUMN IF NOT EXISTS covered_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coverage_amount numeric,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS termination_age integer,
  ADD COLUMN IF NOT EXISTS termination_date date,
  ADD COLUMN IF NOT EXISTS conversion_eligible boolean,
  ADD COLUMN IF NOT EXISTS conversion_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_term_riders_covered_member ON public.term_riders(covered_member_id);
CREATE INDEX IF NOT EXISTS idx_term_riders_policy ON public.term_riders(policy_id);

DROP TRIGGER IF EXISTS trg_term_riders_updated ON public.term_riders;
CREATE TRIGGER trg_term_riders_updated BEFORE UPDATE ON public.term_riders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Insurance application details on the person record
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS employer_name text,
  ADD COLUMN IF NOT EXISTS place_of_birth text,
  ADD COLUMN IF NOT EXISTS us_citizen text;