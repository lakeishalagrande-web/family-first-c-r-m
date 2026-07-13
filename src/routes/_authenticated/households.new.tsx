import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/households/new")({
  head: () => ({ meta: [{ title: "New Household — AgentLifeline" }] }),
  component: NewHousehold,
});

function NewHousehold() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    household_name: "",
    primary_contact_first_name: "", primary_contact_last_name: "",
    primary_contact_phone: "", primary_contact_email: "",
    primary_street: "", primary_city: "", primary_state: "", primary_zip: "",
    mailing_street: "", mailing_city: "", mailing_state: "", mailing_zip: "",
    household_income: "", agent_notes: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase.from("households").insert({
      agent_id: user.id,
      household_name: form.household_name,
      primary_contact_first_name: form.primary_contact_first_name || null,
      primary_contact_last_name: form.primary_contact_last_name || null,
      primary_contact_phone: form.primary_contact_phone || null,
      primary_contact_email: form.primary_contact_email || null,
      primary_street: form.primary_street || null,
      primary_city: form.primary_city || null,
      primary_state: form.primary_state || null,
      primary_zip: form.primary_zip || null,
      mailing_street: form.mailing_street || null,
      mailing_city: form.mailing_city || null,
      mailing_state: form.mailing_state || null,
      mailing_zip: form.mailing_zip || null,
      household_income: form.household_income ? Number(form.household_income) : null,
      agent_notes: form.agent_notes || null,
    }).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Household created");
    navigate({ to: "/households/$id", params: { id: data.id } });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">New household</h1>
        <p className="text-sm text-muted-foreground">Start with the primary insured. You can add family members next.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display text-lg">Household</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Household name <span className="text-destructive">*</span></Label>
              <Input required value={form.household_name} onChange={(e) => set("household_name", e.target.value)} placeholder="e.g. Johnson Family" />
            </div>
            <div className="space-y-2">
              <Label>Household income</Label>
              <Input type="number" value={form.household_income} onChange={(e) => set("household_income", e.target.value)} placeholder="Annual" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display text-lg">Primary contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>First name</Label><Input value={form.primary_contact_first_name} onChange={(e) => set("primary_contact_first_name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Last name</Label><Input value={form.primary_contact_last_name} onChange={(e) => set("primary_contact_last_name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={form.primary_contact_phone} onChange={(e) => set("primary_contact_phone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.primary_contact_email} onChange={(e) => set("primary_contact_email", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display text-lg">Primary address</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Street</Label><Input value={form.primary_street} onChange={(e) => set("primary_street", e.target.value)} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.primary_city} onChange={(e) => set("primary_city", e.target.value)} /></div>
            <div className="space-y-2 grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>State</Label><Input maxLength={2} value={form.primary_state} onChange={(e) => set("primary_state", e.target.value.toUpperCase())} /></div>
              <div className="space-y-2"><Label>Zip</Label><Input value={form.primary_zip} onChange={(e) => set("primary_zip", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display text-lg">Mailing address <span className="text-xs text-muted-foreground font-normal">(if different)</span></CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Street</Label><Input value={form.mailing_street} onChange={(e) => set("mailing_street", e.target.value)} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.mailing_city} onChange={(e) => set("mailing_city", e.target.value)} /></div>
            <div className="space-y-2 grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>State</Label><Input maxLength={2} value={form.mailing_state} onChange={(e) => set("mailing_state", e.target.value.toUpperCase())} /></div>
              <div className="space-y-2"><Label>Zip</Label><Input value={form.mailing_zip} onChange={(e) => set("mailing_zip", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display text-lg">Agent notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={4} value={form.agent_notes} onChange={(e) => set("agent_notes", e.target.value)} placeholder="Anything you'll want to remember…" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/households" })}>Cancel</Button>
          <Button type="submit" disabled={loading || !form.household_name}>{loading ? "Saving…" : "Create household"}</Button>
        </div>
      </form>
    </div>
  );
}
