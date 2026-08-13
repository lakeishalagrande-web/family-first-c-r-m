-- Backfill canonical product_type from legacy free-text policy_type
UPDATE public.policies SET product_type = m.pt::public.product_type
FROM (VALUES
  ('Life','life'),('Term','term'),('Term Life','term'),('Whole Life','whole_life'),
  ('Final Expense','final_expense'),('Fire','fire'),('Medicare','medicare_advantage'),
  ('Medicare Supplement','medicare_supplement'),('Medicare Advantage','medicare_advantage'),
  ('Legal Shield','legal_shield'),('Health','health'),('Auto','auto'),('Home','home'),
  ('Renters','renters'),('Annuity','annuity'),('Long-Term Care','long_term_care'),
  ('Disability','disability'),('Other','other')
) AS m(pl, pt)
WHERE public.policies.product_type IS NULL
  AND public.policies.policy_type = m.pl;

-- Backfill legacy label from canonical enum
UPDATE public.policies SET policy_type = m.pl
FROM (VALUES
  ('Life','life'),('Term Life','term'),('Whole Life','whole_life'),
  ('Final Expense','final_expense'),('Fire','fire'),
  ('Medicare Supplement','medicare_supplement'),('Medicare Advantage','medicare_advantage'),
  ('Legal Shield','legal_shield'),('Health','health'),('Auto','auto'),('Home','home'),
  ('Renters','renters'),('Annuity','annuity'),('Long-Term Care','long_term_care'),
  ('Disability','disability'),('Other','other')
) AS m(pl, pt)
WHERE public.policies.policy_type IS NULL
  AND public.policies.product_type::text = m.pt;

-- Keep the two in sync going forward (canonical = product_type)
CREATE OR REPLACE FUNCTION public.sync_policy_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.product_type IS NOT NULL THEN
    NEW.policy_type := CASE NEW.product_type::text
      WHEN 'life' THEN 'Life'
      WHEN 'term' THEN 'Term Life'
      WHEN 'whole_life' THEN 'Whole Life'
      WHEN 'final_expense' THEN 'Final Expense'
      WHEN 'medicare_supplement' THEN 'Medicare Supplement'
      WHEN 'medicare_advantage' THEN 'Medicare Advantage'
      WHEN 'annuity' THEN 'Annuity'
      WHEN 'disability' THEN 'Disability'
      WHEN 'long_term_care' THEN 'Long-Term Care'
      WHEN 'health' THEN 'Health'
      WHEN 'fire' THEN 'Fire'
      WHEN 'legal_shield' THEN 'Legal Shield'
      WHEN 'auto' THEN 'Auto'
      WHEN 'home' THEN 'Home'
      WHEN 'renters' THEN 'Renters'
      ELSE 'Other'
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_policy_classification ON public.policies;
CREATE TRIGGER trg_sync_policy_classification
BEFORE INSERT OR UPDATE OF product_type ON public.policies
FOR EACH ROW EXECUTE FUNCTION public.sync_policy_classification();