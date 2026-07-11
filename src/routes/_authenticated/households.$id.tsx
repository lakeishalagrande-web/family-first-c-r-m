import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Eye, EyeOff, ArrowLeft, FileText, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { calcAge, fmtCurrency, fmtDate, mask, PRODUCT_TYPE_LABEL, POLICY_STATUS_LABEL } from "@/lib/labels";
import { encryptAndStorePII, revealPII } from "@/lib/pii.functions";

export const Route = createFileRoute("/_authenticated/households/$id")({
  head: () => ({ meta: [{ title: "Household — AgentLifeline" }] }),
  component: HouseholdDetail,
});

function HouseholdDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["household", id],
    queryFn: async () => {
      const [{ data: hh }, { data: members }, { data: policies }, { data: quotes }] = await Promise.all([
        supabase.from("households").select("*").eq("id", id).maybeSingle(),
        supabase.from("family_members").select("*").eq("household_id", id).order("is_primary", { ascending: false }).order("created_at"),
        supabase.from("policies").select("*").eq("household_id", id).order("created_at", { ascending: false }),
        supabase.from("quote_scenarios").select("*").eq("household_id", id).order("slot"),
      ]);
      return { hh, members: members ?? [], policies: policies ?? [], quotes: quotes ?? [] };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data?.hh) return <p>Not found.</p>;
  const { hh, members, policies, quotes } = data;

  async function deleteHousehold() {
    if (!confirm("Delete this household and all its members and policies? This cannot be undone.")) return;
    const { error } = await supabase.from("households").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Household deleted");
    navigate({ to: "/households" });
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <Link to="/households" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> All households
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
          <div>
            <h1 className="font-display text-3xl font-bold">{hh.household_name}</h1>
            <p className="text-sm text-muted-foreground">
              {[hh.primary_city, hh.primary_state].filter(Boolean).join(", ") || "No address on file"}
              {hh.household_income != null && ` · Income ${fmtCurrency(Number(hh.household_income))}`}
            </p>
          </div>
          <div className="flex gap-2">
            <MemberDialog
              householdId={id}
              onSaved={() => qc.invalidateQueries({ queryKey: ["household", id] })}
              trigger={<Button size="sm" className="bg-gold text-gold-foreground hover:bg-gold/90"><UserPlus className="h-4 w-4 mr-1" /> Add Family Member</Button>}
            />
            <Button variant="outline" size="sm" onClick={() => { void qc.invalidateQueries({ queryKey: ["household", id] }); }}>Refresh</Button>
            <Button variant="outline" size="sm" onClick={deleteHousehold} className="text-destructive"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Family ({members.length})</TabsTrigger>
          <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
          <TabsTrigger value="quotes">Quote Scenarios</TabsTrigger>
          <TabsTrigger value="info">Household Info</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-3">
          <div className="flex justify-end">
            <MemberDialog householdId={id} onSaved={() => qc.invalidateQueries({ queryKey: ["household", id] })} />
          </div>
          {members.length === 0 && <Card className="shadow-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">No family members yet. Add the primary insured to begin.</CardContent></Card>}
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((m) => (
              <MemberCard key={m.id} member={m} onChange={() => qc.invalidateQueries({ queryKey: ["household", id] })} householdId={id} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => navigate({ to: "/policies/new", search: { household: id } as never })} className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Plus className="h-4 w-4 mr-1" /> New policy
            </Button>
          </div>
          {policies.length === 0 && <Card className="shadow-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">No policies yet.</CardContent></Card>}
          <div className="space-y-2">
            {policies.map((p) => {
              const insured = members.find((m) => m.id === p.insured_member_id);
              return (
                <Link key={p.id} to="/policies/$id" params={{ id: p.id }}>
                  <Card className="shadow-card hover:shadow-card-hover">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <p className="font-medium truncate">{p.carrier || "—"} · {p.policy_number || "no #"}</p>
                          <Badge variant={p.status === "active" ? "default" : p.status === "lapsed" ? "destructive" : "secondary"}>{p.status ? POLICY_STATUS_LABEL[p.status] : "—"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.product_type ? PRODUCT_TYPE_LABEL[p.product_type] : "—"} · Insured: {insured ? `${insured.first_name} ${insured.last_name}` : "—"} · Face {fmtCurrency(Number(p.face_amount))} · Premium {fmtCurrency(Number(p.monthly_premium))}/mo
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="quotes">
          <QuotesPanel householdId={id} quotes={quotes} onChange={() => qc.invalidateQueries({ queryKey: ["household", id] })} />
        </TabsContent>

        <TabsContent value="info">
          <HouseholdInfoForm hh={hh} onSaved={() => qc.invalidateQueries({ queryKey: ["household", id] })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Member Card ----------
function MemberCard({ member, onChange, householdId }: { member: ReturnType<typeof Object> & Record<string, unknown> & { id: string; first_name: string; last_name: string; relationship: string | null; date_of_birth: string | null; gender: string | null; email: string | null; phone_mobile: string | null; ssn_last4: string | null; medicare_last4: string | null; is_primary: boolean | null }; onChange: () => void; householdId: string }) {
  const reveal = useServerFn(revealPII);
  const [revealed, setRevealed] = useState<{ ssn?: string; medicare?: string }>({});

  async function doReveal(field: "ssn" | "medicare") {
    if (revealed[field]) { setRevealed({ ...revealed, [field]: undefined }); return; }
    try {
      const r = await reveal({ data: { recordType: "family_member", recordId: member.id, field } });
      setRevealed({ ...revealed, [field]: r.value || "—" });
      toast.success("Access logged");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function deleteMember() {
    if (!confirm(`Delete ${member.first_name} ${member.last_name}?`)) return;
    const { error } = await supabase.from("family_members").delete().eq("id", member.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChange();
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{member.first_name} {member.last_name}</p>
              {member.is_primary && <Badge className="bg-gold text-gold-foreground">Primary</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {member.relationship || "—"}{member.date_of_birth && ` · age ${calcAge(member.date_of_birth)}`}
            </p>
          </div>
          <div className="flex gap-1">
            <MemberDialog householdId={householdId} member={member as never} onSaved={onChange} trigger={<Button variant="ghost" size="icon"><Edit2 className="h-3 w-3" /></Button>} />
            <Button variant="ghost" size="icon" onClick={deleteMember}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        </div>
        <div className="text-xs space-y-1 text-muted-foreground">
          {member.email && <p>📧 {member.email}</p>}
          {member.phone_mobile && <p>📱 {member.phone_mobile}</p>}
          <div className="flex items-center gap-2">
            <span>SSN: <span className="font-mono">{revealed.ssn || mask(member.ssn_last4)}</span></span>
            {member.ssn_last4 && (
              <button onClick={() => doReveal("ssn")} className="text-primary hover:underline inline-flex items-center gap-1">
                {revealed.ssn ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {revealed.ssn ? "Hide" : "Reveal"}
              </button>
            )}
          </div>
          {(member.medicare_last4 || revealed.medicare) && (
            <div className="flex items-center gap-2">
              <span>Medicare: <span className="font-mono">{revealed.medicare || mask(member.medicare_last4, 11)}</span></span>
              <button onClick={() => doReveal("medicare")} className="text-primary hover:underline inline-flex items-center gap-1">
                {revealed.medicare ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {revealed.medicare ? "Hide" : "Reveal"}
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Member Dialog ----------
function MemberDialog({ householdId, member, onSaved, trigger }: { householdId: string; member?: { id: string } & Record<string, unknown>; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const encryptFn = useServerFn(encryptAndStorePII);

  const initial = member ?? {};
  const [f, setF] = useState({
    first_name: (initial as { first_name?: string }).first_name ?? "",
    middle_name: (initial as { middle_name?: string }).middle_name ?? "",
    last_name: (initial as { last_name?: string }).last_name ?? "",
    relationship: (initial as { relationship?: string }).relationship ?? "",
    date_of_birth: (initial as { date_of_birth?: string }).date_of_birth ?? "",
    gender: (initial as { gender?: string }).gender ?? "",
    height_inches: String((initial as { height_inches?: number }).height_inches ?? ""),
    weight_lbs: String((initial as { weight_lbs?: number }).weight_lbs ?? ""),
    occupation: (initial as { occupation?: string }).occupation ?? "",
    annual_income: String((initial as { annual_income?: number }).annual_income ?? ""),
    email: (initial as { email?: string }).email ?? "",
    phone_mobile: (initial as { phone_mobile?: string }).phone_mobile ?? "",
    phone_home: (initial as { phone_home?: string }).phone_home ?? "",
    has_disability: !!(initial as { has_disability?: boolean }).has_disability,
    disability_notes: (initial as { disability_notes?: string }).disability_notes ?? "",
    smoker: !!(initial as { smoker?: boolean }).smoker,
    is_primary: !!(initial as { is_primary?: boolean }).is_primary,
    ssn: "",
    medicare: "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      agent_id: user.id,
      household_id: householdId,
      first_name: f.first_name, middle_name: f.middle_name || null, last_name: f.last_name,
      relationship: f.relationship || null,
      date_of_birth: f.date_of_birth || null,
      gender: f.gender || null,
      height_inches: f.height_inches ? Number(f.height_inches) : null,
      weight_lbs: f.weight_lbs ? Number(f.weight_lbs) : null,
      occupation: f.occupation || null,
      annual_income: f.annual_income ? Number(f.annual_income) : null,
      email: f.email || null,
      phone_mobile: f.phone_mobile || null,
      phone_home: f.phone_home || null,
      has_disability: f.has_disability,
      disability_notes: f.disability_notes || null,
      smoker: f.smoker,
      is_primary: f.is_primary,
    };

    let recordId = member?.id;
    if (recordId) {
      const { error } = await supabase.from("family_members").update(payload).eq("id", recordId);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("family_members").insert(payload).select().single();
      if (error) { setSaving(false); return toast.error(error.message); }
      recordId = data.id;
    }

    // Encrypt PII if provided
    try {
      if (f.ssn) await encryptFn({ data: { recordType: "family_member", recordId: recordId!, field: "ssn", value: f.ssn } });
      if (f.medicare) await encryptFn({ data: { recordType: "family_member", recordId: recordId!, field: "medicare", value: f.medicare } });
    } catch (e) { toast.error("PII save failed: " + (e as Error).message); }

    setSaving(false);
    toast.success(member ? "Updated" : "Added");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button><UserPlus className="h-4 w-4 mr-1" /> Add family member</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{member ? "Edit" : "Add"} family member</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>First *</Label><Input required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
            <div><Label>Middle</Label><Input value={f.middle_name} onChange={(e) => setF({ ...f, middle_name: e.target.value })} /></div>
            <div><Label>Last *</Label><Input required value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Relationship</Label><Input value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} placeholder="Self, Spouse, Child…" /></div>
            <div><Label>DOB</Label><Input type="date" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={f.gender} onValueChange={(v) => setF({ ...f, gender: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Height (in)</Label><Input type="number" value={f.height_inches} onChange={(e) => setF({ ...f, height_inches: e.target.value })} /></div>
            <div><Label>Weight (lbs)</Label><Input type="number" value={f.weight_lbs} onChange={(e) => setF({ ...f, weight_lbs: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Occupation</Label><Input value={f.occupation} onChange={(e) => setF({ ...f, occupation: e.target.value })} /></div>
            <div><Label>Annual income</Label><Input type="number" value={f.annual_income} onChange={(e) => setF({ ...f, annual_income: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={f.phone_mobile} onChange={(e) => setF({ ...f, phone_mobile: e.target.value })} /></div>
            <div><Label>Home phone</Label><Input value={f.phone_home} onChange={(e) => setF({ ...f, phone_home: e.target.value })} /></div>
          </div>
          <div className="rounded-md border border-gold/30 bg-gold/5 p-3 space-y-3">
            <p className="text-xs font-medium text-gold uppercase tracking-wider">Encrypted — stored at rest</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SSN {member && "(re-enter to update)"}</Label><Input value={f.ssn} onChange={(e) => setF({ ...f, ssn: e.target.value })} placeholder="XXX-XX-XXXX" /></div>
              <div><Label>Medicare ID</Label><Input value={f.medicare} onChange={(e) => setF({ ...f, medicare: e.target.value })} /></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_primary} onChange={(e) => setF({ ...f, is_primary: e.target.checked })} /> Primary insured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.smoker} onChange={(e) => setF({ ...f, smoker: e.target.checked })} /> Smoker</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.has_disability} onChange={(e) => setF({ ...f, has_disability: e.target.checked })} /> Disability/special needs</label>
          </div>
          {f.has_disability && <Textarea rows={2} value={f.disability_notes} onChange={(e) => setF({ ...f, disability_notes: e.target.value })} placeholder="Disability notes…" />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Household info edit ----------
function HouseholdInfoForm({ hh, onSaved }: { hh: Record<string, unknown> & { id: string }; onSaved: () => void }) {
  const get = (k: string) => (hh as Record<string, unknown>)[k] as string | number | null;
  const [f, setF] = useState({
    household_name: (get("household_name") as string) ?? "",
    primary_street: (get("primary_street") as string) ?? "",
    primary_city: (get("primary_city") as string) ?? "",
    primary_state: (get("primary_state") as string) ?? "",
    primary_zip: (get("primary_zip") as string) ?? "",
    mailing_street: (get("mailing_street") as string) ?? "",
    mailing_city: (get("mailing_city") as string) ?? "",
    mailing_state: (get("mailing_state") as string) ?? "",
    mailing_zip: (get("mailing_zip") as string) ?? "",
    household_income: String(get("household_income") ?? ""),
    agent_notes: (get("agent_notes") as string) ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("households").update({
      household_name: f.household_name,
      primary_street: f.primary_street || null, primary_city: f.primary_city || null,
      primary_state: f.primary_state || null, primary_zip: f.primary_zip || null,
      mailing_street: f.mailing_street || null, mailing_city: f.mailing_city || null,
      mailing_state: f.mailing_state || null, mailing_zip: f.mailing_zip || null,
      household_income: f.household_income ? Number(f.household_income) : null,
      agent_notes: f.agent_notes || null,
    }).eq("id", hh.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-6">
        <form onSubmit={save} className="space-y-4">
          <div><Label>Household name</Label><Input value={f.household_name} onChange={(e) => setF({ ...f, household_name: e.target.value })} /></div>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2"><Label>Primary street</Label><Input value={f.primary_street} onChange={(e) => setF({ ...f, primary_street: e.target.value })} /></div>
            <div><Label>City</Label><Input value={f.primary_city} onChange={(e) => setF({ ...f, primary_city: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label>St</Label><Input value={f.primary_state} onChange={(e) => setF({ ...f, primary_state: e.target.value.toUpperCase() })} /></div><div><Label>Zip</Label><Input value={f.primary_zip} onChange={(e) => setF({ ...f, primary_zip: e.target.value })} /></div></div>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2"><Label>Mailing street</Label><Input value={f.mailing_street} onChange={(e) => setF({ ...f, mailing_street: e.target.value })} /></div>
            <div><Label>City</Label><Input value={f.mailing_city} onChange={(e) => setF({ ...f, mailing_city: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label>St</Label><Input value={f.mailing_state} onChange={(e) => setF({ ...f, mailing_state: e.target.value.toUpperCase() })} /></div><div><Label>Zip</Label><Input value={f.mailing_zip} onChange={(e) => setF({ ...f, mailing_zip: e.target.value })} /></div></div>
          </div>
          <div><Label>Household income</Label><Input type="number" value={f.household_income} onChange={(e) => setF({ ...f, household_income: e.target.value })} /></div>
          <div><Label>Agent notes</Label><Textarea rows={4} value={f.agent_notes} onChange={(e) => setF({ ...f, agent_notes: e.target.value })} /></div>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------- Quotes Panel ----------
function QuotesPanel({ householdId, quotes, onChange }: { householdId: string; quotes: Array<Record<string, unknown> & { id: string; slot: number }>; onChange: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((slot) => {
        const q = quotes.find((qq) => qq.slot === slot);
        return <QuoteCard key={slot} householdId={householdId} slot={slot} quote={q} onChange={onChange} />;
      })}
    </div>
  );
}

function QuoteCard({ householdId, slot, quote, onChange }: { householdId: string; slot: number; quote?: Record<string, unknown> & { id: string }; onChange: () => void }) {
  const get = (k: string) => quote ? (quote as Record<string, unknown>)[k] : null;
  const [f, setF] = useState({
    label: (get("label") as string) ?? "",
    carrier: (get("carrier") as string) ?? "",
    face_amount: String(get("face_amount") ?? ""),
    monthly_premium: String(get("monthly_premium") ?? ""),
    notes: (get("notes") as string) ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      agent_id: user.id, household_id: householdId, slot,
      label: f.label || null, carrier: f.carrier || null,
      face_amount: f.face_amount ? Number(f.face_amount) : null,
      monthly_premium: f.monthly_premium ? Number(f.monthly_premium) : null,
      notes: f.notes || null,
    };
    if (quote) {
      await supabase.from("quote_scenarios").update(payload).eq("id", quote.id);
    } else {
      await supabase.from("quote_scenarios").insert(payload);
    }
    setSaving(false);
    toast.success("Saved");
    onChange();
  }

  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="font-display text-lg">Scenario {slot}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Label</Label><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. 20-yr term" /></div>
        <div><Label>Carrier</Label><Input value={f.carrier} onChange={(e) => setF({ ...f, carrier: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Face amount</Label><Input type="number" value={f.face_amount} onChange={(e) => setF({ ...f, face_amount: e.target.value })} /></div>
          <div><Label>Monthly premium</Label><Input type="number" step="0.01" value={f.monthly_premium} onChange={(e) => setF({ ...f, monthly_premium: e.target.value })} /></div>
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save scenario"}</Button>
      </CardContent>
    </Card>
  );
}
