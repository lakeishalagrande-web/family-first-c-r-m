
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');
CREATE TYPE public.subscription_tier AS ENUM ('starter', 'professional', 'agency');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended');
CREATE TYPE public.product_type AS ENUM ('term','whole_life','final_expense','medicare_supplement','medicare_advantage','annuity','disability','other');
CREATE TYPE public.owner_type AS ENUM ('individual','corporation','partnership','trust');
CREATE TYPE public.payment_structure AS ENUM ('ten_pay','twenty_pay','pay_to_65','whole_life_lifetime','single_premium');
CREATE TYPE public.rate_class AS ENUM ('preferred_plus','preferred','standard','graded_benefit','guaranteed_issue');
CREATE TYPE public.policy_status AS ENUM ('active','lapsed','extended_term','reinstatement_eligible','surrendered','paid_up');
CREATE TYPE public.contact_method AS ENUM ('phone','email','text','in_person','mail');
CREATE TYPE public.contact_outcome AS ENUM ('reached','left_voicemail','no_answer','email_sent','other');
CREATE TYPE public.alert_type AS ENUM ('reinstatement','anniversary','client_birthday','beneficiary_birthday','follow_up');
CREATE TYPE public.beneficiary_type AS ENUM ('primary','contingent');

-- =========================================================
-- UTILITY FUNCTION: update_updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  npn TEXT,
  license_states TEXT[],
  subscription_tier public.subscription_tier NOT NULL DEFAULT 'starter',
  account_status public.account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- Profiles policies
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "admin can delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- User roles policies
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Trigger: auto-create profile + assign agent role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- AGENT WRITING NUMBERS
-- =========================================================
CREATE TABLE public.agent_writing_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  writing_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_writing_numbers TO authenticated;
GRANT ALL ON public.agent_writing_numbers TO service_role;
ALTER TABLE public.agent_writing_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own writing numbers" ON public.agent_writing_numbers FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));

-- =========================================================
-- HOUSEHOLDS
-- =========================================================
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_name TEXT NOT NULL,
  primary_street TEXT,
  primary_city TEXT,
  primary_state TEXT,
  primary_zip TEXT,
  mailing_street TEXT,
  mailing_city TEXT,
  mailing_state TEXT,
  mailing_zip TEXT,
  household_income NUMERIC,
  agent_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own households" ON public.households FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_households_agent ON public.households(agent_id);
CREATE TRIGGER trg_households_updated BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- FAMILY MEMBERS (SSN + Medicare ID stored encrypted as bytea)
-- =========================================================
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  relationship TEXT,
  date_of_birth DATE,
  gender TEXT,
  height_inches INTEGER,
  weight_lbs INTEGER,
  ssn_encrypted BYTEA,
  ssn_last4 TEXT,
  medicare_encrypted BYTEA,
  medicare_last4 TEXT,
  occupation TEXT,
  annual_income NUMERIC,
  email TEXT,
  phone_mobile TEXT,
  phone_home TEXT,
  has_disability BOOLEAN DEFAULT false,
  disability_notes TEXT,
  smoker BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own members" ON public.family_members FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_members_household ON public.family_members(household_id);
CREATE INDEX idx_members_agent ON public.family_members(agent_id);
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- POLICIES
-- =========================================================
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  insured_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  policy_number TEXT,
  carrier TEXT,
  product_type public.product_type,
  owner_name TEXT,
  owner_type public.owner_type,
  face_amount NUMERIC,
  monthly_premium NUMERIC,
  payment_structure public.payment_structure,
  rate_class public.rate_class,
  status public.policy_status DEFAULT 'active',
  reinstatement_deadline DATE,
  cash_value NUMERIC,
  cash_value_checked_on DATE,
  has_policy_loan BOOLEAN DEFAULT false,
  policy_loan_amount NUMERIC,
  automated_premium_loan BOOLEAN DEFAULT false,
  existing_coverage BOOLEAN DEFAULT false,
  application_date DATE,
  issue_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own policies" ON public.policies FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_policies_agent ON public.policies(agent_id);
CREATE INDEX idx_policies_household ON public.policies(household_id);
CREATE TRIGGER trg_policies_updated BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- BENEFICIARIES
-- =========================================================
CREATE TABLE public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beneficiary_type public.beneficiary_type NOT NULL DEFAULT 'primary',
  full_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  mailing_address TEXT,
  relationship TEXT,
  percentage NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiaries TO authenticated;
GRANT ALL ON public.beneficiaries TO service_role;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own beneficiaries" ON public.beneficiaries FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_ben_policy ON public.beneficiaries(policy_id);

-- =========================================================
-- TERM RIDERS
-- =========================================================
CREATE TABLE public.term_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  height_inches INTEGER,
  weight_lbs INTEGER,
  date_of_birth DATE,
  sex TEXT,
  ssn_encrypted BYTEA,
  ssn_last4 TEXT,
  beneficiary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.term_riders TO authenticated;
GRANT ALL ON public.term_riders TO service_role;
ALTER TABLE public.term_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own riders" ON public.term_riders FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_riders_policy ON public.term_riders(policy_id);

-- =========================================================
-- QUOTE SCENARIOS (two saved side by side)
-- =========================================================
CREATE TABLE public.quote_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot IN (1,2)),
  label TEXT,
  carrier TEXT,
  product_type public.product_type,
  face_amount NUMERIC,
  monthly_premium NUMERIC,
  rate_class public.rate_class,
  payment_structure public.payment_structure,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_scenarios TO authenticated;
GRANT ALL ON public.quote_scenarios TO service_role;
ALTER TABLE public.quote_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quotes" ON public.quote_scenarios FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));

-- =========================================================
-- FOLLOW UPS
-- =========================================================
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method public.contact_method,
  notes TEXT,
  outcome public.contact_outcome,
  next_follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follow ups" ON public.follow_ups FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_fu_agent ON public.follow_ups(agent_id);
CREATE INDEX idx_fu_next ON public.follow_ups(next_follow_up_date);

-- =========================================================
-- ALERTS (auto-generated)
-- =========================================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type public.alert_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  related_household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  related_policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.alerts FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_alerts_agent_due ON public.alerts(agent_id, due_date);

-- =========================================================
-- CARRIERS (shared dropdown, admin manages, agents can add custom)
-- =========================================================
CREATE TABLE public.carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, created_by)
);
GRANT SELECT, INSERT ON public.carriers TO authenticated;
GRANT ALL ON public.carriers TO service_role;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see carriers" ON public.carriers FOR SELECT TO authenticated
  USING (is_global = true OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "add own carriers" ON public.carriers FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Seed common carriers
INSERT INTO public.carriers (name, is_global) VALUES
('Aetna', true), ('AIG', true), ('Allianz', true), ('American General', true),
('Banner Life', true), ('Cigna', true), ('Foresters', true), ('Gerber Life', true),
('Globe Life', true), ('Humana', true), ('John Hancock', true), ('Lincoln Financial', true),
('Mass Mutual', true), ('Mutual of Omaha', true), ('Nationwide', true), ('New York Life', true),
('North American', true), ('Pacific Life', true), ('Principal', true), ('Protective Life', true),
('Prudential', true), ('Sagicor', true), ('Securian', true), ('State Farm', true),
('Symetra', true), ('Transamerica', true), ('United Healthcare', true), ('Wellcare', true);

-- =========================================================
-- PII ACCESS LOG (audit)
-- =========================================================
CREATE TABLE public.pii_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  agent_id UUID,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pii_access_log TO authenticated;
GRANT ALL ON public.pii_access_log TO service_role;
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own pii log" ON public.pii_access_log FOR SELECT TO authenticated
  USING (accessor_id = auth.uid() OR agent_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "insert pii log" ON public.pii_access_log FOR INSERT TO authenticated
  WITH CHECK (accessor_id = auth.uid());
CREATE INDEX idx_pii_log_agent ON public.pii_access_log(agent_id, accessed_at DESC);

-- =========================================================
-- ANNOUNCEMENTS (admin -> all agents)
-- =========================================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all see announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin updates announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "admin deletes announcements" ON public.announcements FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
