import type { Database } from "@/integrations/supabase/types";
export type Tables = Database["public"]["Tables"];
export type Enums = Database["public"]["Enums"];
export type Household = Tables["households"]["Row"];
export type FamilyMember = Tables["family_members"]["Row"];
export type Policy = Tables["policies"]["Row"];
export type Beneficiary = Tables["beneficiaries"]["Row"];
export type TermRider = Tables["term_riders"]["Row"];
export type QuoteScenario = Tables["quote_scenarios"]["Row"];
export type FollowUp = Tables["follow_ups"]["Row"];
export type Alert = Tables["alerts"]["Row"];
export type Profile = Tables["profiles"]["Row"];

export const PRODUCT_TYPE_LABEL: Record<Enums["product_type"], string> = {
  life: "Life",
  term: "Term Life",
  whole_life: "Whole Life",
  final_expense: "Final Expense",
  medicare_supplement: "Medicare Supplement",
  medicare_advantage: "Medicare Advantage",
  annuity: "Annuity",
  disability: "Disability",
  long_term_care: "Long-Term Care",
  health: "Health",
  fire: "Fire",
  legal_shield: "Legal Shield",
  auto: "Auto",
  home: "Home",
  renters: "Renters",
  accidental_death: "Accidental Death",
  other: "Other",
};
// Non-life / service products — rendered as service badges, not death benefit
export const SERVICE_PRODUCT_TYPES: Array<Enums["product_type"]> = ["fire", "legal_shield", "auto", "home", "renters"];
// Accident-only coverage — must never be presented as traditional life insurance
export const ACCIDENT_ONLY_PRODUCT_TYPES: Array<Enums["product_type"]> = ["accidental_death"];
export function isAccidentOnly(p: { product_type?: Enums["product_type"] | null; policy_type?: string | null }) {
  const t = productTypeOf(p);
  return !!t && ACCIDENT_ONLY_PRODUCT_TYPES.includes(t);
}
export const POLICY_STATUS_LABEL: Record<Enums["policy_status"], string> = {
  active: "Active",
  lapsed: "Lapsed",
  pending: "Pending",
  cancelled: "Cancelled",
  extended_term: "Extended Term",
  reinstatement_eligible: "Reinstatement Eligible",
  surrendered: "Surrendered",
  paid_up: "Paid Up",
};

export const PREMIUM_FREQUENCY_LABEL: Record<"monthly" | "quarterly" | "annual", string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

export const POLICY_TYPE_OPTIONS = [
  "Life", "Fire", "Medicare", "Legal Shield",
  "Health", "Auto", "Home", "Renters", "Annuity", "Long-Term Care", "Disability", "Other",
] as const;


export const BENEFICIARY_RELATIONSHIP_OPTIONS = [
  "Spouse", "Child", "Mother", "Father", "Grandmother", "Grandfather", "Sibling", "Trust", "Other",
] as const;

export const MARITAL_STATUS_OPTIONS = [
  "Single", "Married", "Divorced", "Widowed", "Separated", "Engaged", "Domestic Partner", "Other", "Unknown",
] as const;

export const LEAD_SOURCE_OPTIONS = [
  "Existing Client", "Referral", "Workshop", "Wealth Building Wednesday", "Community Event",
  "Mosque", "Church", "Social Media", "Website", "Other",
] as const;

export const QUOTE_STATUS_OPTIONS = ["Quoted", "Presented", "Accepted", "Declined"] as const;
export type QuoteStatus = (typeof QUOTE_STATUS_OPTIONS)[number];

export const DISMISS_REASON_OPTIONS = [
  "Not interested", "Follow up later", "Has coverage elsewhere",
] as const;

export const PAYMENT_STRUCTURE_LABEL: Record<Enums["payment_structure"], string> = {
  continuous_pay: "Continuous Pay",
  ten_pay: "10-Pay",
  twenty_pay: "20-Pay",
  pay_to_65: "Pay to Age 65",
  paid_to_age: "Paid to Age …",
  whole_life_lifetime: "Whole Life (Lifetime Pay)",
  single_premium: "Single Pay",
};
// Term policy design (level vs return-of-premium)
export const TERM_DESIGN_LABEL: Record<Enums["term_design"], string> = {
  level_term: "Level Term",
  rop_term: "ROP Term",
};
export const RIDER_TYPE_LABEL: Record<Enums["rider_type"], string> = {
  child: "Child Rider",
  spouse: "Spouse Rider",
  other_insured: "Other Insured Rider",
};
export const RATE_CLASS_LABEL: Record<Enums["rate_class"], string> = {
  preferred_plus: "Preferred Plus",
  preferred: "Preferred",
  standard: "Standard",
  graded_benefit: "Graded Benefit (2-yr wait)",
  guaranteed_issue: "Guaranteed Issue",
};
export const OWNER_TYPE_LABEL: Record<Enums["owner_type"], string> = {
  individual: "Individual",
  corporation: "Corporation",
  partnership: "Partnership",
  trust: "Trust",
};
export const CONTACT_METHOD_LABEL: Record<Enums["contact_method"], string> = {
  phone: "Phone", email: "Email", text: "Text", in_person: "In-person", mail: "Mail",
};
export const CONTACT_OUTCOME_LABEL: Record<Enums["contact_outcome"], string> = {
  reached: "Reached", left_voicemail: "Left voicemail", no_answer: "No answer",
  email_sent: "Email sent", other: "Other",
};
export const ALERT_TYPE_LABEL: Record<Enums["alert_type"], string> = {
  reinstatement: "Reinstatement Deadline",
  anniversary: "Policy Anniversary",
  client_birthday: "Client Birthday",
  beneficiary_birthday: "Beneficiary Birthday",
  follow_up: "Follow-up Due",
  rider_termination: "Rider Termination Approaching",
};

export function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
export function calcAge(dob: string | null | undefined) {
  if (!dob) return null;
  const b = new Date(dob); const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}
export function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  const diff = new Date(d).getTime() - new Date().setHours(0,0,0,0);
  return Math.round(diff / 86400000);
}
export function mask(last4: string | null | undefined, len = 9) {
  if (!last4) return "—";
  const dashes = len === 9 ? "XXX-XX-" : "XXXX-XXX-XX-";
  return dashes + last4;
}

// Legacy free-text policy_type -> canonical product_type enum (read-only compatibility)
export const LEGACY_POLICY_TYPE_MAP: Record<string, Enums["product_type"]> = {
  "Life": "life",
  "Term": "term",
  "Term Life": "term",
  "Whole Life": "whole_life",
  "Final Expense": "final_expense",
  "Fire": "fire",
  "Medicare": "medicare_advantage",
  "Medicare Supplement": "medicare_supplement",
  "Medicare Advantage": "medicare_advantage",
  "Legal Shield": "legal_shield",
  "Health": "health",
  "Auto": "auto",
  "Home": "home",
  "Renters": "renters",
  "Annuity": "annuity",
  "Long-Term Care": "long_term_care",
  "Disability": "disability",
  "Other": "other",
};

export function productTypeOf(p: { product_type?: Enums["product_type"] | null; policy_type?: string | null }): Enums["product_type"] | null {
  if (p.product_type) return p.product_type;
  if (p.policy_type && LEGACY_POLICY_TYPE_MAP[p.policy_type]) return LEGACY_POLICY_TYPE_MAP[p.policy_type];
  return null;
}

export function productLabelOf(p: { product_type?: Enums["product_type"] | null; policy_type?: string | null }): string {
  const t = productTypeOf(p);
  return t ? PRODUCT_TYPE_LABEL[t] : (p.policy_type || "—");
}

// ---- Policy design summary --------------------------------------------------
// Builds a human summary like "Whole Life — 20-Pay", "ROP Term — 30 Year",
// "Whole Life — Paid to Age 65", "Accidental Death (accident-only)".
export function paymentDesignLabel(p: {
  payment_structure?: Enums["payment_structure"] | null;
  pay_to_age?: number | null;
}): string | null {
  const ps = p.payment_structure;
  if (!ps) return null;
  if (ps === "paid_to_age") return p.pay_to_age ? `Paid to Age ${p.pay_to_age}` : "Paid to Age …";
  return PAYMENT_STRUCTURE_LABEL[ps];
}

export function policyDesignSummary(p: {
  product_type?: Enums["product_type"] | null;
  policy_type?: string | null;
  term_design?: Enums["term_design"] | null;
  term_length_years?: number | null;
  payment_structure?: Enums["payment_structure"] | null;
  pay_to_age?: number | null;
}): string {
  const t = productTypeOf(p);
  const isTerm = t === "term";
  const base = isTerm && p.term_design ? TERM_DESIGN_LABEL[p.term_design] : productLabelOf(p);
  const parts: string[] = [];
  if (isTerm && p.term_length_years) parts.push(`${p.term_length_years} Year`);
  const pay = paymentDesignLabel(p);
  if (pay) parts.push(pay);
  return parts.length ? `${base} — ${parts.join(" · ")}` : base;
}

export const CITIZENSHIP_OPTIONS = ["yes", "no", "unknown"] as const;
export const CITIZENSHIP_LABEL: Record<(typeof CITIZENSHIP_OPTIONS)[number], string> = {
  yes: "Yes", no: "No", unknown: "Unknown",
};

// ---- Riders -----------------------------------------------------------------
export type RiderCoverage = Tables["term_riders"]["Row"] & {
  policy?: {
    id: string;
    carrier: string | null;
    policy_number: string | null;
    product_type: Enums["product_type"] | null;
    policy_type: string | null;
    term_design: Enums["term_design"] | null;
    term_length_years: number | null;
    payment_structure: Enums["payment_structure"] | null;
    pay_to_age: number | null;
    insured?: { id: string; first_name: string; last_name: string } | null;
  } | null;
};

// "Dad's Whole Life — 20-Pay (Illinois Mutual)" style label for the base policy
export function riderBaseLabel(r: RiderCoverage): string {
  const p = r.policy;
  if (!p) return "—";
  const insured = p.insured ? `${p.insured.first_name} ${p.insured.last_name}` : null;
  const design = policyDesignSummary(p);
  const carrier = p.carrier || p.policy_number || null;
  return [insured, design, carrier ? `(${carrier})` : null].filter(Boolean).join(" · ");
}

// Rider termination alert foundation: the date an alert should fire on.
export function riderTerminationDate(r: {
  termination_date?: string | null;
  termination_age?: number | null;
  date_of_birth?: string | null;
}): string | null {
  if (r.termination_date) return r.termination_date;
  if (r.termination_age != null && r.date_of_birth) {
    const dob = new Date(r.date_of_birth);
    const d = new Date(Date.UTC(dob.getUTCFullYear() + r.termination_age, dob.getUTCMonth(), dob.getUTCDate()));
    return d.toISOString().slice(0, 10);
  }
  return null;
}
