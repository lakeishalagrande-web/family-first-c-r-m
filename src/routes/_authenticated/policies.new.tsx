import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PRODUCT_TYPE_LABEL, OWNER_TYPE_LABEL, PAYMENT_STRUCTURE_LABEL, RATE_CLASS_LABEL, POLICY_STATUS_LABEL } from "@/lib/labels";

const searchSchema = z.object({ household: z.string().optional() });

export const Route = createFileRoute("/_authenticated/policies/new")({
  head: () => ({ meta: [{ title: "New Policy — AgentLifeline" }] }),
  validateSearch: searchSchema,
  component: NewPolicy,
});

function NewPolicy() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [householdId, setHouseholdId] = useState<string>(search.household ?? "");
  const [saving, setSaving] = useState(false);

  const { data: households = [] } = useQuery({
    queryKey: ["all-households"],
    queryFn: async () => (await supabase.from("households").select("id, household_name").order("household_name")).data ?? [],
  });
  const { data: carriers = [] } = useQuery({
    queryKey: ["carriers"],
    queryFn: async () => (await supabase.from("carriers").select("id, name").order("name")).data ?? [],
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members-for-household", householdId],
    enabled: !!householdId,
    queryFn: async () => (await supabase.from("family_members").select("id, first_name, last_name").eq("household_id", householdId)).data ?? [],
  });

  const [f, setF] = useState({
    policy_number: "", carrier: "", product_type: "" as string,
    insured_member_id: "", owner_name: "", owner_type: "" as string,
    face_amount: "", monthly_premium: "", payment_structure: "" as string,
    rate_class: "" as string, status: "active" as string,
    reinstatement_deadline: "", cash_value: "", cash_value_checked_on: "",
    has_policy_loan: false, policy_loan_amount: "",
    automated_premium_loan: false, existing_coverage: false,
    application_date: "", issue_date: "", notes: "",
  });

  useEffect(() => { if (search.household) setHouseholdId(search.household); }, [search.household]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId) return toast.error("Pick a household");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("policies").insert({
      agent_id: user.id, household_id: householdId,
      insured_member_id: f.insured_member_id || null,
      policy_number: f.policy_number || null, carrier: f.carrier || null,
      product_type: (f.product_type || null) as never,
      owner_name: f.owner_name || null, owner_type: (f.owner_type || null) as never,
      face_amount: f.face_amount ? Number(f.face_amount) : null,
      monthly_premium: f.monthly_premium ? Number(f.monthly_premium) : null,
      payment_structure: (f.payment_structure || null) as never,
      rate_class: (f.rate_class || null) as never,
      status: (f.status || "active") as never,
      reinstatement_deadline: f.reinstatement_deadline || null,
      cash_value: f.cash_value ? Number(f.cash_value) : null,
      cash_value_checked_on: f.cash_value_checked_on || null,
      has_policy_loan: f.has_policy_loan,
      policy_loan_amount: f.policy_loan_amount ? Number(f.policy_loan_amount) : null,
      automated_premium_loan: f.automated_premium_loan,
      existing_coverage: f.existing_coverage,
      application_date: f.application_date || null,
      issue_date: f.issue_date || null,
      notes: f.notes || null,
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Policy created");
    navigate({ to: "/policies/$id", params: { id: data.id } });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">New policy</h1>
        <p className="text-sm text-muted-foreground">Create a new policy. You can add beneficiaries and riders after saving.</p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <Card className="shadow-card"><CardHeader><CardTitle className="font-display text-lg">Where this policy belongs</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Household *</Label>
            <Select value={householdId} onValueChange={setHouseholdId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{households.map((h) => <SelectItem key={h.id} value={h.id}>{h.household_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Insured family member</Label>
            <Select value={f.insured_member_id} onValueChange={(v) => setF({ ...f, insured_member_id: v })} disabled={!householdId}>
              <SelectTrigger><SelectValue placeholder={householdId ? "Select…" : "Pick household first"} /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="font-display text-lg">Policy basics</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-3">
          <div><Label>Policy number</Label><Input value={f.policy_number} onChange={(e) => setF({ ...f, policy_number: e.target.value })} /></div>
          <div>
            <Label>Carrier</Label>
            <Select value={f.carrier} onValueChange={(v) => setF({ ...f, carrier: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent className="max-h-72">{carriers.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Product type</Label>
            <EnumSelect value={f.product_type} onChange={(v) => setF({ ...f, product_type: v })} options={PRODUCT_TYPE_LABEL} />
          </div>
          <div>
            <Label>Status</Label>
            <EnumSelect value={f.status} onChange={(v) => setF({ ...f, status: v })} options={POLICY_STATUS_LABEL} />
          </div>
        </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="font-display text-lg">Ownership</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-3">
          <div><Label>Owner name (if different from insured)</Label><Input value={f.owner_name} onChange={(e) => setF({ ...f, owner_name: e.target.value })} /></div>
          <div><Label>Owner type</Label><EnumSelect value={f.owner_type} onChange={(v) => setF({ ...f, owner_type: v })} options={OWNER_TYPE_LABEL} /></div>
        </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="font-display text-lg">Coverage & premium</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-3">
          <div><Label>Face amount / death benefit</Label><Input type="number" value={f.face_amount} onChange={(e) => setF({ ...f, face_amount: e.target.value })} /></div>
          <div><Label>Monthly premium</Label><Input type="number" step="0.01" value={f.monthly_premium} onChange={(e) => setF({ ...f, monthly_premium: e.target.value })} /></div>
          <div><Label>Payment structure</Label><EnumSelect value={f.payment_structure} onChange={(v) => setF({ ...f, payment_structure: v })} options={PAYMENT_STRUCTURE_LABEL} /></div>
          <div><Label>Rate class</Label><EnumSelect value={f.rate_class} onChange={(v) => setF({ ...f, rate_class: v })} options={RATE_CLASS_LABEL} /></div>
        </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="font-display text-lg">Dates & deadlines</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-3 gap-3">
          <div><Label>Application date</Label><Input type="date" value={f.application_date} onChange={(e) => setF({ ...f, application_date: e.target.value })} /></div>
          <div><Label>Issue date</Label><Input type="date" value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></div>
          <div><Label>Reinstatement deadline</Label><Input type="date" value={f.reinstatement_deadline} onChange={(e) => setF({ ...f, reinstatement_deadline: e.target.value })} /></div>
        </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="font-display text-lg">Cash value & flags</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Cash value</Label><Input type="number" value={f.cash_value} onChange={(e) => setF({ ...f, cash_value: e.target.value })} /></div>
            <div><Label>Cash value checked on</Label><Input type="date" value={f.cash_value_checked_on} onChange={(e) => setF({ ...f, cash_value_checked_on: e.target.value })} /></div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.has_policy_loan} onChange={(e) => setF({ ...f, has_policy_loan: e.target.checked })} /> Policy loan outstanding</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.automated_premium_loan} onChange={(e) => setF({ ...f, automated_premium_loan: e.target.checked })} /> Automated premium loan</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.existing_coverage} onChange={(e) => setF({ ...f, existing_coverage: e.target.checked })} /> Replacing existing coverage</label>
          </div>
          {f.has_policy_loan && <div><Label>Loan amount</Label><Input type="number" value={f.policy_loan_amount} onChange={(e) => setF({ ...f, policy_loan_amount: e.target.value })} /></div>}
        </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="font-display text-lg">Notes</CardTitle></CardHeader><CardContent>
          <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </CardContent></Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/policies" })}>Cancel</Button>
          <Button type="submit" disabled={saving || !householdId}>{saving ? "Saving…" : "Create policy"}</Button>
        </div>
      </form>
    </div>
  );
}

function EnumSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>{Object.entries(options).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
