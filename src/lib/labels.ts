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
  term: "Term Life",
  whole_life: "Whole Life",
  final_expense: "Final Expense",
  medicare_supplement: "Medicare Supplement",
  medicare_advantage: "Medicare Advantage",
  annuity: "Annuity",
  disability: "Disability",
  other: "Other",
};
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

export const QUOTE_STATUS_OPTIONS = ["Quoted", "Presented", "Accepted", "Declined"] as const;
export type QuoteStatus = (typeof QUOTE_STATUS_OPTIONS)[number];

export const DISMISS_REASON_OPTIONS = [
  "Not interested", "Follow up later", "Has coverage elsewhere",
] as const;

export const PAYMENT_STRUCTURE_LABEL: Record<Enums["payment_structure"], string> = {
  ten_pay: "10-Pay",
  twenty_pay: "20-Pay",
  pay_to_65: "Pay to Age 65",
  whole_life_lifetime: "Whole Life (Lifetime Pay)",
  single_premium: "Single Premium",
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
