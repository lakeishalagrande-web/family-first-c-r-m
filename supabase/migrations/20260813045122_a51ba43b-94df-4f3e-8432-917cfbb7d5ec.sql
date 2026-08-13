-- 1) Add missing product classifications (non-destructive)
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'life';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'fire';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'legal_shield';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'health';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'auto';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'home';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'renters';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'long_term_care';

-- 2) Clean up existing duplicate primaries: keep earliest created
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY household_id ORDER BY created_at, id) AS rn
  FROM public.family_members
  WHERE is_primary IS TRUE
)
UPDATE public.family_members m
SET is_primary = false
FROM ranked r
WHERE m.id = r.id AND r.rn > 1;

-- 3) Enforce a single primary per household
CREATE OR REPLACE FUNCTION public.enforce_single_primary_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary IS TRUE THEN
    UPDATE public.family_members
    SET is_primary = false
    WHERE household_id = NEW.household_id
      AND id <> NEW.id
      AND is_primary IS TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_primary_member ON public.family_members;
CREATE TRIGGER trg_single_primary_member
BEFORE INSERT OR UPDATE OF is_primary, household_id ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_primary_member();

CREATE UNIQUE INDEX IF NOT EXISTS family_members_one_primary_per_household
ON public.family_members (household_id)
WHERE is_primary IS TRUE;

-- 4) Default new members to non-primary at the database level
ALTER TABLE public.family_members ALTER COLUMN is_primary SET DEFAULT false;