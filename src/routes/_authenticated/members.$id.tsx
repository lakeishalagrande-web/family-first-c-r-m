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
import { toast } from "sonner";
import {
  calcAge, fmtCurrency, fmtDate,
  POLICY_STATUS_LABEL, PREMIUM_FREQUENCY_LABEL, POLICY_TYPE_OPTIONS,
} from "@/lib/labels";
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
              {member.phone_mobile && ` · ${member.phone_mobile}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/households/$id", params: { id: member.household_id } })}>
            View household
          </Button>
        </div>
      </div>

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
            <span className="text-sm">{policy.policy_type || "—"}</span>
            <Badge variant={policy.status === "active" ? "default" : policy.status === "lapsed" || policy.status === "cancelled" ? "destructive" : "secondary"}>
              {policy.status ? POLICY_STATUS_LABEL[policy.status] : "—"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            #{policy.policy_number || "—"} · Effective {fmtDate(policy.effective_date)} · Face {fmtCurrency(Number(policy.face_amount))}
            {policy.monthly_premium != null && ` · ${fmtCurrency(Number(policy.monthly_premium))} ${policy.premium_frequency ? PREMIUM_FREQUENCY_LABEL[policy.premium_frequency as "monthly" | "quarterly" | "annual"] : ""}`}
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
  const [f, setF] = useState({
    carrier: policy?.carrier ?? "",
    policy_type: policy?.policy_type ?? "",
    policy_number: policy?.policy_number ?? "",
    effective_date: policy?.effective_date ?? "",
    status: (policy?.status ?? "active") as PolicyStatus,
    face_amount: policy?.face_amount != null ? String(policy.face_amount) : "",
    monthly_premium: policy?.monthly_premium != null ? String(policy.monthly_premium) : "",
    premium_frequency: (policy?.premium_frequency ?? "monthly") as "monthly" | "quarterly" | "annual",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = {
      agent_id: user.id,
      household_id: householdId,
      insured_member_id: memberId,
      carrier: f.carrier || null,
      policy_type: f.policy_type || null,
      policy_number: f.policy_number || null,
      effective_date: f.effective_date || null,
      status: f.status,
      face_amount: f.face_amount ? Number(f.face_amount) : null,
      monthly_premium: f.monthly_premium ? Number(f.monthly_premium) : null,
      premium_frequency: f.premium_frequency,
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
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Policy type *</Label>
              <Select value={f.policy_type} onValueChange={(v) => setF({ ...f, policy_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {POLICY_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
function BeneficiaryDialog({ policyId, beneficiary, onSaved, trigger }: {
  policyId: string;
  beneficiary?: Database["public"]["Tables"]["beneficiaries"]["Row"];
  onSaved: () => void; trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    full_name: beneficiary?.full_name ?? "",
    relationship: beneficiary?.relationship ?? "",
    percentage: beneficiary?.percentage != null ? String(beneficiary.percentage) : "",
    beneficiary_type: (beneficiary?.beneficiary_type ?? "primary") as BeneficiaryType,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = {
      agent_id: user.id,
      policy_id: policyId,
      full_name: f.full_name,
      relationship: f.relationship || null,
      percentage: f.percentage ? Number(f.percentage) : null,
      beneficiary_type: f.beneficiary_type,
    };
    const { error } = beneficiary
      ? await supabase.from("beneficiaries").update(payload).eq("id", beneficiary.id)
      : await supabase.from("beneficiaries").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(beneficiary ? "Updated" : "Added");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">{beneficiary ? "Edit" : "Add"} beneficiary</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Full name *</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Relationship</Label><Input value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} placeholder="e.g. Spouse" /></div>
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
