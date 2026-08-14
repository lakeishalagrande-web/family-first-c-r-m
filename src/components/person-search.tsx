import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/components/phone-input";
import { calcAge, fmtDate } from "@/lib/labels";

export type PersonHit = {
  id: string;
  household_id: string;
  first_name: string;
  last_name: string;
  relationship: string | null;
  date_of_birth: string | null;
  phone_mobile: string | null;
  phone_home: string | null;
  email: string | null;
  ssn_last4: string | null;
  households: { household_name: string } | null;
};

const SELECT =
  "id, household_id, first_name, last_name, relationship, date_of_birth, phone_mobile, phone_home, email, ssn_last4, households(household_name)";

function isDateLike(q: string) {
  return /^\d{4}-\d{2}(-\d{2})?$/.test(q) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(q);
}

function toISO(q: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  const m = q.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

/** Global person search by first name, last name, DOB or phone number. */
export function usePersonSearch(term: string, limit = 25) {
  const q = term.trim();
  return useQuery({
    queryKey: ["person-search", q, limit],
    enabled: q.length >= 2,
    staleTime: 15_000,
    queryFn: async (): Promise<PersonHit[]> => {
      const digits = q.replace(/\D/g, "");

      if (isDateLike(q)) {
        const iso = toISO(q);
        const query = supabase.from("family_members").select(SELECT).limit(limit);
        const { data } = iso
          ? await query.eq("date_of_birth", iso)
          : await query.gte("date_of_birth", `${q}-01`).lte("date_of_birth", `${q}-31`);
        return (data ?? []) as unknown as PersonHit[];
      }

      const filters = [`first_name.ilike.%${q}%`, `last_name.ilike.%${q}%`, `email.ilike.%${q}%`];
      if (digits.length >= 3) {
        filters.push(`phone_mobile.ilike.%${digits}%`, `phone_home.ilike.%${digits}%`);
        // phones are stored formatted, so also match on the formatted fragment
        const f = formatPhone(digits);
        filters.push(`phone_mobile.ilike.%${f}%`, `phone_home.ilike.%${f}%`);
      }
      const { data } = await supabase
        .from("family_members")
        .select(SELECT)
        .or(filters.join(","))
        .order("last_name")
        .limit(limit);
      return (data ?? []) as unknown as PersonHit[];
    },
  });
}

export function personSummary(p: PersonHit) {
  const age = calcAge(p.date_of_birth);
  return [
    p.households?.household_name ? `${p.households.household_name} household` : null,
    p.relationship,
    p.date_of_birth ? `DOB ${fmtDate(p.date_of_birth)}${age != null ? ` (age ${age})` : ""}` : null,
    p.phone_mobile ? formatPhone(p.phone_mobile) : p.phone_home ? formatPhone(p.phone_home) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
