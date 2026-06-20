import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Regenerates dashboard alerts for the current agent based on policy dates,
// member birthdays, beneficiary birthdays, and pending follow-ups.
// Idempotent: clears existing auto-alerts then inserts fresh ones.
export const regenerateAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Wipe existing non-dismissed auto alerts
    await supabase.from("alerts").delete().eq("agent_id", userId).eq("is_dismissed", false);

    const today = new Date();
    const yyyy = today.getFullYear();
    const toMD = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    const inDays = (n: number) => {
      const d = new Date(today); d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    type AlertInsert = {
      agent_id: string;
      alert_type: "reinstatement" | "anniversary" | "client_birthday" | "beneficiary_birthday" | "follow_up";
      title: string;
      description?: string | null;
      due_date: string;
      related_household_id?: string | null;
      related_policy_id?: string | null;
    };
    const alerts: AlertInsert[] = [];

    const [policiesRes, membersRes, beneficiariesRes, followUpsRes] = await Promise.all([
      supabase.from("policies").select("id, policy_number, carrier, household_id, reinstatement_deadline, issue_date, status").eq("agent_id", userId),
      supabase.from("family_members").select("id, first_name, last_name, date_of_birth, household_id").eq("agent_id", userId),
      supabase.from("beneficiaries").select("id, full_name, date_of_birth, policy_id").eq("agent_id", userId),
      supabase.from("follow_ups").select("id, next_follow_up_date, notes, household_id, policy_id").eq("agent_id", userId).not("next_follow_up_date", "is", null),
    ]);

    // Reinstatement deadlines
    for (const p of policiesRes.data ?? []) {
      if (!p.reinstatement_deadline) continue;
      const d = new Date(p.reinstatement_deadline);
      const days = Math.round((d.getTime() - today.setHours(0,0,0,0)) / 86400000);
      today.setHours(0,0,0,0);
      if (days >= 0 && days <= 30) {
        alerts.push({
          agent_id: userId,
          alert_type: "reinstatement",
          title: `Reinstatement deadline${days <= 7 ? " — URGENT" : ""}`,
          description: `Policy ${p.policy_number || ""} (${p.carrier || ""}) — ${days} day${days===1?"":"s"} remaining`,
          due_date: p.reinstatement_deadline,
          related_household_id: p.household_id,
          related_policy_id: p.id,
        });
      }
    }

    // Anniversaries (within 30 days)
    for (const p of policiesRes.data ?? []) {
      if (!p.issue_date) continue;
      const iss = new Date(p.issue_date);
      const next = new Date(yyyy, iss.getMonth(), iss.getDate());
      if (next < today) next.setFullYear(yyyy + 1);
      const days = Math.round((next.getTime() - today.getTime()) / 86400000);
      if (days >= 0 && days <= 30) {
        alerts.push({
          agent_id: userId,
          alert_type: "anniversary",
          title: "Policy anniversary",
          description: `Policy ${p.policy_number || ""} (${p.carrier || ""})`,
          due_date: next.toISOString().slice(0, 10),
          related_household_id: p.household_id,
          related_policy_id: p.id,
        });
      }
    }

    // Birthdays — clients
    for (const m of membersRes.data ?? []) {
      if (!m.date_of_birth) continue;
      const dob = new Date(m.date_of_birth);
      const next = new Date(yyyy, dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(yyyy + 1);
      const days = Math.round((next.getTime() - today.getTime()) / 86400000);
      if (days >= 0 && days <= 30) {
        alerts.push({
          agent_id: userId,
          alert_type: "client_birthday",
          title: `Birthday: ${m.first_name} ${m.last_name}`,
          due_date: next.toISOString().slice(0, 10),
          related_household_id: m.household_id,
        });
      }
    }

    // Birthdays — beneficiaries
    for (const b of beneficiariesRes.data ?? []) {
      if (!b.date_of_birth) continue;
      const dob = new Date(b.date_of_birth);
      const next = new Date(yyyy, dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(yyyy + 1);
      const days = Math.round((next.getTime() - today.getTime()) / 86400000);
      if (days >= 0 && days <= 30) {
        alerts.push({
          agent_id: userId,
          alert_type: "beneficiary_birthday",
          title: `Beneficiary birthday: ${b.full_name}`,
          due_date: next.toISOString().slice(0, 10),
          related_policy_id: b.policy_id,
        });
      }
    }

    // Follow-ups due
    for (const f of followUpsRes.data ?? []) {
      if (!f.next_follow_up_date) continue;
      const d = new Date(f.next_follow_up_date);
      const days = Math.round((d.getTime() - today.getTime()) / 86400000);
      if (days >= -1 && days <= 14) {
        alerts.push({
          agent_id: userId,
          alert_type: "follow_up",
          title: "Follow-up due",
          description: f.notes?.slice(0, 80) || null,
          due_date: f.next_follow_up_date,
          related_household_id: f.household_id,
          related_policy_id: f.policy_id,
        });
      }
    }

    // Auto-lapse policies with passed reinstatement deadlines
    const lapseIds = (policiesRes.data ?? [])
      .filter((p) => p.reinstatement_deadline && new Date(p.reinstatement_deadline) < today && p.status !== "lapsed" && p.status !== "surrendered")
      .map((p) => p.id);
    if (lapseIds.length > 0) {
      await supabase.from("policies").update({ status: "lapsed" }).in("id", lapseIds);
    }

    if (alerts.length > 0) {
      await supabase.from("alerts").insert(alerts);
    }

    void inDays;
    void toMD;
    return { generated: alerts.length, lapsed: lapseIds.length };
  });
