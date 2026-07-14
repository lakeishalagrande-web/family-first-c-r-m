ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS premium_frequency text
  CHECK (premium_frequency IS NULL OR premium_frequency IN ('monthly','quarterly','annual'));
