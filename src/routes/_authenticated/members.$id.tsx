import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit2, Trash2, FileText, Users } from "lucide-react";
import { MemberDialog } from "./households.$id";
import { toast } from "sonner";
import {
  calcAge, fmtCurrency, fmtDate,
  POLICY_STATUS_LABEL, PREMIUM_FREQUENCY_LABEL, PRODUCT_TYPE_LABEL, productLabelOf, productTypeOf,
  BENEFICIARY_RELATIONSHIP_OPTIONS,
} from "@/lib/labels";

import { formatPhone } from "@/components/phone-input";
import { formatHeight } from "@/components/height-input";
import type { Database } from "@/integrations/supabase/types";


type PolicyStatus = Database["public"]["Enums"]["policy_status"];
type BeneficiaryType = Database["public"]["Enums"]["beneficiary_type"];

export const Route = createFileRoute("/_authenticated/members/$id")({
  head: () => ({ meta: [{ title: "Contact — AgentLifeline" }] }),
  component: MemberDetail,
});

function MemberDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      const { data: member } = await supabase.from("family_members").select("*").eq("id", id).maybeSingle();
      if (!member) return { member: null, policies: [], carriers: [] };
      const [{ data: policies }, { data: carriers }] = await Promise.all([
        supabase.from("policies").select("*, beneficiaries(*)").eq("insured_member_id", id).order("created_at", { ascending: false }),
        supabase.from("carriers").select("*").order("name"),
      ]);
      return { member, policies: policies ?? [], carriers: carriers ?? [] };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.member) return <p>Not found.</p>;
  const { member, policies, carriers } = data;
  const age = calcAge(member.date_of_birth);
  const refresh = () => qc.invalidateQueries({ queryKey: ["member", id] });
  const meds = (member.medications as Array<{ name: string; dosage?: string }> | null) ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link to="/households/$id" params={{ id: member.household_id }} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to household
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
          <div>
            <h1 className="font-display text-3xl font-bold">
              {member.first_name} {member.last_name}
              {age != null && <span className="ml-3 text-lg font-normal text-muted-foreground">age {age}</span>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {member.relationship || "—"}
              {member.date_of_birth && ` · DOB ${fmtDate(member.date_of_birth)}`}
              {member.email && ` · ${member.email}`}
              {member.phone_mobile && ` · ${formatPhone(member.phone_mobile)}`}
              {member.height_inches != null && ` · ${formatHeight(Number(member.height_inches))}`}
            </p>
            {policies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from(new Set(policies.map((p) => productLabelOf(p)).filter((t) => t !== "—"))).map((t) => (
                  <Badge key={t} variant="secondary">{t} ✓</Badge>
                ))}
              </div>
            )}

          </div>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/households/$id", params: { id: member.household_id } })}>
            View household
          </Button>
        </div>
      </div>


      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Health & medical</CardTitle>
          <MemberDialog
            householdId={member.household_id}
            member={member as never}
            onSaved={refresh}
            trigger={<Button variant="outline" size="sm"><Edit2 className="h-3 w-3 mr-1" /> Edit</Button>}
          />
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
          <p><span className="text-muted-foreground">Doctor:</span> {member.doctor_name || "—"}{member.doctor_phone && ` · ${formatPhone(member.doctor_phone)}`}</p>
          <p><span className="text-muted-foreground">Last visit:</span> {fmtDate(member.last_doctor_visit)}</p>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground mb-1">Medications:</p>
            {meds.length === 0 ? <p className="text-xs text-muted-foreground">None recorded.</p> : (
              <ul className="list-disc pl-5 space-y-0.5">
                {meds.map((m, i) => <li key={i}>{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</li>)}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Policies ({policies.length})</CardTitle>
          <PolicyDialog
            memberId={id}
            householdId={member.household_id}
            carriers={carriers}
            onSaved={refresh}
            trigger={<Button size="sm" className="bg-gold text-gold-foreground hover:bg-gold/90"><Plus className="h-4 w-4 mr-1" /> Add policy</Button>}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {policies.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No policies yet.</p>}
          {policies.map((p) => (
            <PolicyRow key={p.id} policy={p} carriers={carriers} memberId={id} householdId={member.household_id} onChange={refresh} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Policy row ----------------
type PolicyWithBens = Database["public"]["Tables"]["policies"]["Row"] & {
  beneficiaries: Database["public"]["Tables"]["beneficiaries"]["Row"][];
};
type Carrier = Database["public"]["Tables"]["carriers"]["Row"];

function PolicyRow({ policy, carriers, memberId, householdId, onChange }: {
  policy: PolicyWithBens; carriers: Carrier[]; memberId: string; householdId: string; onChange: () => void;
}) {
  async function quickStatus(status: PolicyStatus) {
    const { error } = await supabase.from("policies").update({ status }).eq("id", policy.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${POLICY_STATUS_LABEL[status]}`);
    onChange();
  }
  async function del() {
    if (!confirm("Delete this policy and its beneficiaries?")) return;
    const { error } = await supabase.from("policies").delete().eq("id", policy.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChange();
  }

  const bens = policy.beneficiaries ?? [];
  const primary = bens.filter((b) => b.beneficiary_type === "primary");
  const contingent = bens.filter((b) => b.beneficiary_type === "contingent");

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{policy.carrier || "—"}</p>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm">{productLabelOf(policy)}</span>
            <Badge variant={policy.status === "active" ? "default" : policy.status === "lapsed" || policy.status === "cancelled" ? "destructive" : "secondary"}>
              {policy.status ? POLICY_STATUS_LABEL[policy.status] : "—"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            #{policy.policy_number || "—"} · Effective {fmtDate(policy.effective_date)} · Face {fmtCurrency(Number(policy.face_amount))}
            {policy.monthly_premium != null && ` · ${fmtCurrency(Number(policy.monthly_premium))} ${policy.premium_frequency ? PREMIUM_FREQUENCY_LABEL[policy.premium_frequency as "monthly" | "quarterly" | "annual"] : ""}`}
            {policy.cash_value != null && ` · Cash value ${fmtCurrency(Number(policy.cash_value))}`}
            {policy.loan_balance != null && Number(policy.loan_balance) > 0 && ` · Loan ${fmtCurrency(Number(policy.loan_balance))}`}
            {policy.annual_review_date && ` · Annual review ${fmtDate(policy.annual_review_date)}`}
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          <Select value={policy.status ?? undefined} onValueChange={(v) => quickStatus(v as PolicyStatus)}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="lapsed">Lapsed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <PolicyDialog memberId={memberId} householdId={householdId} carriers={carriers} policy={policy} onSaved={onChange}
            trigger={<Button variant="ghost" size="icon"><Edit2 className="h-3 w-3" /></Button>} />
          <Button variant="ghost" size="icon" onClick={del}><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Beneficiaries ({bens.length})</p>
          <BeneficiaryDialog policyId={policy.id} onSaved={onChange}
            trigger={<Button variant="ghost" size="sm" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add</Button>} />
        </div>
        {bens.length === 0 && <p className="text-xs text-muted-foreground">No beneficiaries added.</p>}
        {[["Primary", primary], ["Contingent", contingent]].map(([label, list]) => (list as typeof bens).length > 0 && (
          <div key={label as string} className="mb-2">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label as string}</p>
            <div className="space-y-1">
              {(list as typeof bens).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                  <span>
                    <strong>{b.full_name}</strong>
                    {b.relationship && ` · ${b.relationship}`}
                    {b.percentage != null && ` · ${b.percentage}%`}
                  </span>
                  <div className="flex gap-1">
                    <BeneficiaryDialog policyId={policy.id} beneficiary={b} onSaved={onChange}
                      trigger={<Button variant="ghost" size="icon" className="h-6 w-6"><Edit2 className="h-3 w-3" /></Button>} />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                      if (!confirm("Delete beneficiary?")) return;
                      const { error } = await supabase.from("beneficiaries").delete().eq("id", b.id);
                      if (error) return toast.error(error.message);
                      onChange();
                    }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Policy dialog ----------------
function PolicyDialog({ memberId, householdId, carriers, policy, onSaved, trigger }: {
  memberId: string; householdId: string; carriers: Carrier[];
  policy?: Database["public"]["Tables"]["policies"]["Row"];
  onSaved: () => void; trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const knownCarriers = new Set(carriers.map((c) => c.name));
  const initialCarrier = policy?.carrier ?? "";
  const initialIsOther = !!initialCarrier && !knownCarriers.has(initialCarrier);
  const [f, setF] = useState({
    carrier: initialIsOther ? "__other__" : initialCarrier,
    customCarrier: initialIsOther ? initialCarrier : "",
    product_type: (productTypeOf(policy ?? {}) ?? "") as "" | Database["public"]["Enums"]["product_type"],
    policy_number: policy?.policy_number ?? "",
    effective_date: policy?.effective_date ?? "",
    status: (policy?.status ?? "active") as PolicyStatus,
    face_amount: policy?.face_amount != null ? String(policy.face_amount) : "",
    monthly_premium: policy?.monthly_premium != null ? String(policy.monthly_premium) : "",
    premium_frequency: (policy?.premium_frequency ?? "monthly") as "monthly" | "quarterly" | "annual",
    cash_value: policy?.cash_value != null ? String(policy.cash_value) : "",
    loan_balance: policy?.loan_balance != null ? String(policy.loan_balance) : "",
    annual_review_date: policy?.annual_review_date ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const carrierValue = f.carrier === "__other__" ? (f.customCarrier.trim() || null) : (f.carrier || null);
    if (!carrierValue) return toast.error("Carrier is required");
    if (!f.product_type) return toast.error("Policy type is required");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      agent_id: user.id,
      household_id: householdId,
      insured_member_id: memberId,
      carrier: carrierValue,
      product_type: f.product_type,
      policy_type: PRODUCT_TYPE_LABEL[f.product_type],

      policy_number: f.policy_number || null,
      effective_date: f.effective_date || null,
      status: f.status,
      face_amount: f.face_amount ? Number(f.face_amount) : null,
      monthly_premium: f.monthly_premium ? Number(f.monthly_premium) : null,
      premium_frequency: f.premium_frequency,
      cash_value: f.cash_value ? Number(f.cash_value) : null,
      loan_balance: f.loan_balance ? Number(f.loan_balance) : null,
      annual_review_date: f.annual_review_date || null,
    };
    const { error } = policy
      ? await supabase.from("policies").update(payload).eq("id", policy.id)
      : await supabase.from("policies").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(policy ? "Updated" : "Added");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{policy ? "Edit" : "Add"} policy</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Carrier *</Label>
              <Select value={f.carrier} onValueChange={(v) => setF({ ...f, carrier: v })}>
                <SelectTrigger><SelectValue placeholder="Select carrier…" /></SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  <SelectItem value="__other__">Other (type name)</SelectItem>
                </SelectContent>
              </Select>
              {f.carrier === "__other__" && (
                <Input className="mt-2" placeholder="Carrier name"
                  value={f.customCarrier} onChange={(e) => setF({ ...f, customCarrier: e.target.value })} />
              )}
            </div>

            <div>
              <Label>Policy type *</Label>
              <Select value={f.product_type} onValueChange={(v) => setF({ ...f, product_type: v as Database["public"]["Enums"]["product_type"] })}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(PRODUCT_TYPE_LABEL).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}

                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Policy #</Label><Input value={f.policy_number} onChange={(e) => setF({ ...f, policy_number: e.target.value })} /></div>
            <div><Label>Effective date</Label><Input type="date" value={f.effective_date} onChange={(e) => setF({ ...f, effective_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as PolicyStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="lapsed">Lapsed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Face / coverage amount</Label><Input type="number" step="0.01" value={f.face_amount} onChange={(e) => setF({ ...f, face_amount: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Premium amount</Label><Input type="number" step="0.01" value={f.monthly_premium} onChange={(e) => setF({ ...f, monthly_premium: e.target.value })} /></div>
            <div>
              <Label>Frequency</Label>
              <Select value={f.premium_frequency} onValueChange={(v) => setF({ ...f, premium_frequency: v as "monthly" | "quarterly" | "annual" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Cash value</Label><Input type="number" step="0.01" value={f.cash_value} onChange={(e) => setF({ ...f, cash_value: e.target.value })} /></div>
            <div><Label>Loan balance</Label><Input type="number" step="0.01" value={f.loan_balance} onChange={(e) => setF({ ...f, loan_balance: e.target.value })} /></div>
            <div><Label>Annual review date</Label><Input type="date" value={f.annual_review_date} onChange={(e) => setF({ ...f, annual_review_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Beneficiary dialog ----------------
type BenRow = Database["public"]["Tables"]["beneficiaries"]["Row"];

const emptyBenForm = {
  member_id: "" as string,
  full_name: "",
  relationship: "",
  percentage: "",
  beneficiary_type: "primary" as BeneficiaryType,
  date_of_birth: "",
  phone: "",
  ssn: "",
};

function benFormFrom(b?: BenRow) {
  if (!b) return { ...emptyBenForm };
  return {
    member_id: b.member_id ?? "",
    full_name: b.full_name ?? "",
    relationship: b.relationship ?? "",
    percentage: b.percentage != null ? String(b.percentage) : "",
    beneficiary_type: (b.beneficiary_type ?? "primary") as BeneficiaryType,
    date_of_birth: b.date_of_birth ?? "",
    phone: b.phone ?? "",
    ssn: "",
  };
}

function BeneficiaryDialog({ policyId, beneficiary, onSaved, trigger }: {
  policyId: string;
  beneficiary?: BenRow;
  onSaved: () => void; trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(beneficiary?.member_id ? "existing" : "new");
  const [f, setF] = useState(() => benFormFrom(beneficiary));
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<PersonHit | null>(null);
  const [saving, setSaving] = useState(false);
  const encryptFn = useServerFn(encryptAndStorePII);
  const { data: hits, isFetching } = usePersonSearch(mode === "existing" ? term : "");

  function reset() {
    setF(benFormFrom(beneficiary));
    setMode(beneficiary?.member_id ? "existing" : "new");
    setPicked(null);
    setTerm("");
  }

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (v) reset();
  }

  function pick(p: PersonHit) {
    setPicked(p);
    setF({
      ...f,
      member_id: p.id,
      full_name: `${p.first_name} ${p.last_name}`,
      relationship: f.relationship || (p.relationship ?? ""),
      date_of_birth: "",
      phone: "",
      ssn: "",
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "existing" && !f.member_id) return toast.error("Select an existing person or switch to Add new person");
    if (mode === "new" && !f.full_name.trim()) return toast.error("Full name is required");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const linked = mode === "existing";
    const payload = {
      agent_id: user.id,
      policy_id: policyId,
      member_id: linked ? f.member_id : null,
      full_name: f.full_name.trim(),
      relationship: f.relationship || null,
      percentage: f.percentage ? Number(f.percentage) : null,
      beneficiary_type: f.beneficiary_type,
      // Linked people keep their identity data on their person record — no duplicate copies.
      date_of_birth: linked ? null : (f.date_of_birth || null),
      phone: linked ? null : (f.phone || null),
    };

    let recordId = beneficiary?.id;
    if (recordId) {
      const { error } = await supabase.from("beneficiaries").update(payload).eq("id", recordId);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("beneficiaries").insert(payload).select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      recordId = data.id;
    }

    if (!linked && f.ssn) {
      try { await encryptFn({ data: { recordType: "beneficiary", recordId: recordId!, field: "ssn", value: f.ssn } }); }
      catch (err) { toast.error("SSN save failed: " + (err as Error).message); }
    }

    setSaving(false);
    toast.success(beneficiary ? "Updated" : "Added");
    onSaved();
    if (beneficiary) {
      setOpen(false);
    } else {
      // Clear the form so the next (e.g. contingent) beneficiary starts clean.
      setF({ ...emptyBenForm });
      setPicked(null);
      setTerm("");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{beneficiary ? "Edit" : "Add"} beneficiary</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")}>
              <Search className="h-3 w-3 mr-1" /> Select existing person
            </Button>
            <Button type="button" variant={mode === "new" ? "default" : "outline"} size="sm"
              onClick={() => { setMode("new"); setPicked(null); setF({ ...f, member_id: "" }); }}>
              <Plus className="h-3 w-3 mr-1" /> Add new person
            </Button>
          </div>

          {mode === "existing" ? (
            <div className="space-y-2">
              <Label>Search people (name, DOB, phone)</Label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="LaToya, 09/14/1982, (312) 555-0134…" />
              {picked && (
                <div className="rounded-md border border-gold/40 bg-gold/5 p-2 text-xs">
                  <p className="font-medium">{picked.first_name} {picked.last_name}</p>
                  <p className="text-muted-foreground">{personSummary(picked)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Existing person record reused — no duplicate created.</p>
                </div>
              )}
              {!picked && term.trim().length >= 2 && (
                <div className="max-h-52 overflow-y-auto space-y-1 border rounded-md p-1">
                  {isFetching && <p className="text-xs text-muted-foreground p-1">Searching…</p>}
                  {!isFetching && (hits ?? []).length === 0 && <p className="text-xs text-muted-foreground p-1">No matches.</p>}
                  {(hits ?? []).map((p) => (
                    <button key={p.id} type="button" onClick={() => pick(p)}
                      className="w-full text-left rounded px-2 py-1 hover:bg-muted text-xs">
                      <span className="font-medium">{p.first_name} {p.last_name}</span>
                      <span className="block text-muted-foreground">{personSummary(p)}</span>
                    </button>
                  ))}
                </div>
              )}
              {picked && <Button type="button" variant="ghost" size="sm" onClick={() => { setPicked(null); setF({ ...f, member_id: "", full_name: "" }); }}>Choose a different person</Button>}
            </div>
          ) : (
            <>
              <div><Label>Full name *</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date of birth</Label><Input type="date" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></div>
                <div><Label>Telephone</Label><PhoneInput value={f.phone} onChange={(v) => setF({ ...f, phone: v })} /></div>
              </div>
              <div className="rounded-md border border-gold/30 bg-gold/5 p-3">
                <Label className="text-gold">SSN (encrypted at rest, reveal is logged)</Label>
                <Input value={f.ssn} onChange={(e) => setF({ ...f, ssn: e.target.value })} placeholder="XXX-XX-XXXX" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Relationship</Label>
              <Select value={f.relationship} onValueChange={(v) => setF({ ...f, relationship: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {BENEFICIARY_RELATIONSHIP_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Percentage</Label><Input type="number" min="0" max="100" step="0.01" value={f.percentage} onChange={(e) => setF({ ...f, percentage: e.target.value })} /></div>
          </div>
          <div>
            <Label>Designation</Label>
            <Select value={f.beneficiary_type} onValueChange={(v) => setF({ ...f, beneficiary_type: v as BeneficiaryType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="contingent">Contingent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
