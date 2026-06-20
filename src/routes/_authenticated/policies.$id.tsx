import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { fmtCurrency, fmtDate, mask, PRODUCT_TYPE_LABEL, POLICY_STATUS_LABEL, OWNER_TYPE_LABEL, PAYMENT_STRUCTURE_LABEL, RATE_CLASS_LABEL } from "@/lib/labels";
import { encryptAndStorePII, revealPII } from "@/lib/pii.functions";

export const Route = createFileRoute("/_authenticated/policies/$id")({
  head: () => ({ meta: [{ title: "Policy — AgentLifeline" }] }),
  component: PolicyDetail,
});

function PolicyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["policy", id],
    queryFn: async () => {
      const [{ data: p }, { data: bens }, { data: riders }] = await Promise.all([
        supabase.from("policies").select("*, households(id, household_name), family_members:insured_member_id(first_name, last_name)").eq("id", id).maybeSingle(),
        supabase.from("beneficiaries").select("*").eq("policy_id", id).order("beneficiary_type"),
        supabase.from("term_riders").select("*").eq("policy_id", id),
      ]);
      return { p, bens: bens ?? [], riders: riders ?? [] };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.p) return <p>Not found.</p>;
  const { p, bens, riders } = data;

  async function deletePolicy() {
    if (!confirm("Delete this policy?")) return;
    const { error } = await supabase.from("policies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/policies" });
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link to="/policies" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> All policies
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
          <div>
            <h1 className="font-display text-3xl font-bold">{p.carrier || "—"} · {p.policy_number || "no #"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={p.status === "active" ? "default" : p.status === "lapsed" ? "destructive" : "secondary"}>{p.status ? POLICY_STATUS_LABEL[p.status] : "—"}</Badge>
              <p className="text-sm text-muted-foreground">
                {p.product_type ? PRODUCT_TYPE_LABEL[p.product_type] : "—"}
                {(p.households as { id: string; household_name: string } | null) && (
                  <> · <Link to="/households/$id" params={{ id: (p.households as { id: string }).id }} className="text-primary hover:underline">
                    {(p.households as { household_name: string }).household_name}
                  </Link></>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={deletePolicy} className="text-destructive"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries ({bens.length})</TabsTrigger>
          <TabsTrigger value="riders">Term Riders ({riders.length})</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Face amount" value={fmtCurrency(Number(p.face_amount))} />
            <Field label="Monthly premium" value={fmtCurrency(Number(p.monthly_premium))} />
            <Field label="Payment structure" value={p.payment_structure ? PAYMENT_STRUCTURE_LABEL[p.payment_structure] : "—"} />
            <Field label="Rate class" value={p.rate_class ? RATE_CLASS_LABEL[p.rate_class] : "—"} />
            <Field label="Owner" value={p.owner_name || "—"} />
            <Field label="Owner type" value={p.owner_type ? OWNER_TYPE_LABEL[p.owner_type] : "—"} />
            <Field label="Application date" value={fmtDate(p.application_date)} />
            <Field label="Issue date" value={fmtDate(p.issue_date)} />
            <Field label="Reinstatement deadline" value={fmtDate(p.reinstatement_deadline)} highlight={!!p.reinstatement_deadline} />
            <Field label="Cash value" value={fmtCurrency(Number(p.cash_value))} sub={p.cash_value_checked_on ? `checked ${fmtDate(p.cash_value_checked_on)}` : undefined} />
            <Field label="Policy loan" value={p.has_policy_loan ? fmtCurrency(Number(p.policy_loan_amount)) : "None"} />
            <Field label="Automated premium loan" value={p.automated_premium_loan ? "Yes" : "No"} />
            <Field label="Replaces existing coverage" value={p.existing_coverage ? "Yes" : "No"} />
          </div>
          {p.notes && <Card className="mt-4 shadow-card"><CardHeader><CardTitle className="font-display text-lg">Notes</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm">{p.notes}</CardContent></Card>}
        </TabsContent>

        <TabsContent value="beneficiaries">
          <BeneficiariesPanel policyId={id} bens={bens} onChange={() => qc.invalidateQueries({ queryKey: ["policy", id] })} />
        </TabsContent>

        <TabsContent value="riders">
          <RidersPanel policyId={id} riders={riders} onChange={() => qc.invalidateQueries({ queryKey: ["policy", id] })} />
        </TabsContent>

        <TabsContent value="edit">
          <EditPolicyForm policy={p} onSaved={() => qc.invalidateQueries({ queryKey: ["policy", id] })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border bg-card p-3 ${highlight ? "border-gold" : ""}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BeneficiariesPanel({ policyId, bens, onChange }: { policyId: string; bens: Array<Record<string, unknown> & { id: string }>; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ beneficiary_type: "primary", full_name: "", phone: "", date_of_birth: "", mailing_address: "", relationship: "", percentage: "" });

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("beneficiaries").insert({
      agent_id: user.id, policy_id: policyId,
      beneficiary_type: f.beneficiary_type as never,
      full_name: f.full_name, phone: f.phone || null,
      date_of_birth: f.date_of_birth || null,
      mailing_address: f.mailing_address || null,
      relationship: f.relationship || null,
      percentage: f.percentage ? Number(f.percentage) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setOpen(false);
    setF({ beneficiary_type: "primary", full_name: "", phone: "", date_of_birth: "", mailing_address: "", relationship: "", percentage: "" });
    onChange();
  }

  async function del(id: string) {
    if (!confirm("Delete beneficiary?")) return;
    await supabase.from("beneficiaries").delete().eq("id", id);
    onChange();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add beneficiary</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add beneficiary</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={f.beneficiary_type} onValueChange={(v) => setF({ ...f, beneficiary_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="contingent">Contingent</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Full name *</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
                <div><Label>DOB</Label><Input type="date" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></div>
              </div>
              <div><Label>Mailing address</Label><Input value={f.mailing_address} onChange={(e) => setF({ ...f, mailing_address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Relationship</Label><Input value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} /></div>
                <div><Label>Percentage %</Label><Input type="number" value={f.percentage} onChange={(e) => setF({ ...f, percentage: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={!f.full_name}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {bens.length === 0 && <Card className="shadow-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">No beneficiaries.</CardContent></Card>}
      <div className="grid gap-3 md:grid-cols-2">
        {bens.map((b) => {
          const bb = b as Record<string, unknown> & { id: string; full_name: string; beneficiary_type: string; phone: string | null; date_of_birth: string | null; relationship: string | null; percentage: number | null; mailing_address: string | null };
          return (
            <Card key={bb.id} className="shadow-card">
              <CardContent className="p-4 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{bb.full_name}</p>
                    <Badge variant={bb.beneficiary_type === "primary" ? "default" : "secondary"}>{bb.beneficiary_type}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del(bb.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">{bb.relationship || "—"}{bb.percentage != null && ` · ${bb.percentage}%`}</p>
                {bb.phone && <p className="text-xs">📱 {bb.phone}</p>}
                {bb.date_of_birth && <p className="text-xs">🎂 {fmtDate(bb.date_of_birth)}</p>}
                {bb.mailing_address && <p className="text-xs text-muted-foreground">{bb.mailing_address}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function RidersPanel({ policyId, riders, onChange }: { policyId: string; riders: Array<Record<string, unknown> & { id: string }>; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const encryptFn = useServerFn(encryptAndStorePII);
  const reveal = useServerFn(revealPII);
  const [revealed, setRevealed] = useState<Record<string, string | undefined>>({});
  const [f, setF] = useState({ child_name: "", height_inches: "", weight_lbs: "", date_of_birth: "", sex: "", beneficiary: "", ssn: "" });

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("term_riders").insert({
      agent_id: user.id, policy_id: policyId,
      child_name: f.child_name,
      height_inches: f.height_inches ? Number(f.height_inches) : null,
      weight_lbs: f.weight_lbs ? Number(f.weight_lbs) : null,
      date_of_birth: f.date_of_birth || null, sex: f.sex || null,
      beneficiary: f.beneficiary || null,
    }).select().single();
    if (error) return toast.error(error.message);
    if (f.ssn) {
      try { await encryptFn({ data: { recordType: "term_rider", recordId: data.id, field: "ssn", value: f.ssn } }); }
      catch (e) { toast.error("SSN: " + (e as Error).message); }
    }
    toast.success("Added");
    setOpen(false);
    setF({ child_name: "", height_inches: "", weight_lbs: "", date_of_birth: "", sex: "", beneficiary: "", ssn: "" });
    onChange();
  }
  async function del(id: string) { if (!confirm("Delete rider?")) return; await supabase.from("term_riders").delete().eq("id", id); onChange(); }
  async function doReveal(id: string) {
    if (revealed[id]) return setRevealed({ ...revealed, [id]: undefined });
    try { const r = await reveal({ data: { recordType: "term_rider", recordId: id, field: "ssn" } }); setRevealed({ ...revealed, [id]: r.value || "—" }); toast.success("Access logged"); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add child term rider</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add term rider</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Child name *</Label><Input value={f.child_name} onChange={(e) => setF({ ...f, child_name: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>DOB</Label><Input type="date" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></div>
                <div><Label>Sex</Label><Input value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value })} /></div>
                <div><Label>Beneficiary</Label><Input value={f.beneficiary} onChange={(e) => setF({ ...f, beneficiary: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Height (in)</Label><Input type="number" value={f.height_inches} onChange={(e) => setF({ ...f, height_inches: e.target.value })} /></div>
                <div><Label>Weight (lbs)</Label><Input type="number" value={f.weight_lbs} onChange={(e) => setF({ ...f, weight_lbs: e.target.value })} /></div>
              </div>
              <div className="rounded-md border border-gold/30 bg-gold/5 p-3">
                <Label className="text-gold">SSN (encrypted)</Label>
                <Input value={f.ssn} onChange={(e) => setF({ ...f, ssn: e.target.value })} placeholder="XXX-XX-XXXX" />
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={!f.child_name}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {riders.length === 0 && <Card className="shadow-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">No term riders.</CardContent></Card>}
      <div className="grid gap-3 md:grid-cols-2">
        {riders.map((r) => {
          const rr = r as Record<string, unknown> & { id: string; child_name: string; date_of_birth: string | null; sex: string | null; beneficiary: string | null; height_inches: number | null; weight_lbs: number | null; ssn_last4: string | null };
          return (
            <Card key={rr.id} className="shadow-card">
              <CardContent className="p-4 space-y-1">
                <div className="flex justify-between"><p className="font-medium">{rr.child_name}</p>
                  <Button variant="ghost" size="icon" onClick={() => del(rr.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">{rr.sex || "—"} · {fmtDate(rr.date_of_birth)} · {rr.height_inches || "—"}in / {rr.weight_lbs || "—"}lbs</p>
                {rr.beneficiary && <p className="text-xs">Beneficiary: {rr.beneficiary}</p>}
                {rr.ssn_last4 && (
                  <div className="text-xs flex items-center gap-2">
                    SSN: <span className="font-mono">{revealed[rr.id] || mask(rr.ssn_last4)}</span>
                    <button onClick={() => doReveal(rr.id)} className="text-primary hover:underline inline-flex items-center gap-1">
                      {revealed[rr.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {revealed[rr.id] ? "Hide" : "Reveal"}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function EditPolicyForm({ policy, onSaved }: { policy: Record<string, unknown> & { id: string }; onSaved: () => void }) {
  type P = Record<string, unknown> & { id: string };
  const get = (k: string) => (policy as P)[k];
  const [f, setF] = useState({
    policy_number: (get("policy_number") as string) ?? "",
    carrier: (get("carrier") as string) ?? "",
    status: ((get("status") as string) ?? "active"),
    face_amount: String(get("face_amount") ?? ""),
    monthly_premium: String(get("monthly_premium") ?? ""),
    reinstatement_deadline: ((get("reinstatement_deadline") as string) ?? ""),
    issue_date: ((get("issue_date") as string) ?? ""),
    application_date: ((get("application_date") as string) ?? ""),
    notes: ((get("notes") as string) ?? ""),
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("policies").update({
      policy_number: f.policy_number || null, carrier: f.carrier || null,
      status: f.status as never,
      face_amount: f.face_amount ? Number(f.face_amount) : null,
      monthly_premium: f.monthly_premium ? Number(f.monthly_premium) : null,
      reinstatement_deadline: f.reinstatement_deadline || null,
      issue_date: f.issue_date || null, application_date: f.application_date || null,
      notes: f.notes || null,
    }).eq("id", policy.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  return (
    <Card className="shadow-card"><CardContent className="p-6">
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Policy number</Label><Input value={f.policy_number} onChange={(e) => setF({ ...f, policy_number: e.target.value })} /></div>
          <div><Label>Carrier</Label><Input value={f.carrier} onChange={(e) => setF({ ...f, carrier: e.target.value })} /></div>
          <div><Label>Face amount</Label><Input type="number" value={f.face_amount} onChange={(e) => setF({ ...f, face_amount: e.target.value })} /></div>
          <div><Label>Monthly premium</Label><Input type="number" step="0.01" value={f.monthly_premium} onChange={(e) => setF({ ...f, monthly_premium: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(POLICY_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Reinstatement deadline</Label><Input type="date" value={f.reinstatement_deadline} onChange={(e) => setF({ ...f, reinstatement_deadline: e.target.value })} /></div>
          <div><Label>Application date</Label><Input type="date" value={f.application_date} onChange={(e) => setF({ ...f, application_date: e.target.value })} /></div>
          <div><Label>Issue date</Label><Input type="date" value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></div>
        </div>
        <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </form>
    </CardContent></Card>
  );
}
