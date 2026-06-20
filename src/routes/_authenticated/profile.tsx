import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Agent Profile — AgentLifeline" }] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });
  const { data: writingNumbers = [] } = useQuery({
    queryKey: ["writing-numbers"],
    queryFn: async () => (await supabase.from("agent_writing_numbers").select("*").order("carrier")).data ?? [],
  });

  const [f, setF] = useState({ full_name: "", phone: "", npn: "", license_states: "" });
  useEffect(() => {
    if (profile) setF({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      npn: profile.npn ?? "",
      license_states: (profile.license_states ?? []).join(", "),
    });
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name || null,
      phone: f.phone || null,
      npn: f.npn || null,
      license_states: f.license_states.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    }).eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    qc.invalidateQueries({ queryKey: ["current-user"] });
  }

  const [newWN, setNewWN] = useState({ carrier: "", writing_number: "" });
  async function addWN() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newWN.carrier || !newWN.writing_number) return;
    const { error } = await supabase.from("agent_writing_numbers").insert({ agent_id: user.id, carrier: newWN.carrier, writing_number: newWN.writing_number });
    if (error) return toast.error(error.message);
    setNewWN({ carrier: "", writing_number: "" });
    qc.invalidateQueries({ queryKey: ["writing-numbers"] });
  }
  async function delWN(id: string) { await supabase.from("agent_writing_numbers").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["writing-numbers"] }); }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Agent Profile</h1>
        <p className="text-sm text-muted-foreground">Your contact info, NPN, license states, and writing numbers.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Personal info</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div><Label>NPN number</Label><Input value={f.npn} onChange={(e) => setF({ ...f, npn: e.target.value })} /></div>
              <div><Label>License states (comma separated)</Label><Input value={f.license_states} onChange={(e) => setF({ ...f, license_states: e.target.value })} placeholder="GA, FL, TX" /></div>
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Writing numbers per carrier</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {writingNumbers.length === 0 && <p className="text-sm text-muted-foreground">None added yet.</p>}
            {writingNumbers.map((w) => (
              <div key={w.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <span><strong>{w.carrier}</strong> · {w.writing_number}</span>
                <Button variant="ghost" size="icon" onClick={() => delWN(w.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end pt-2 border-t">
            <div><Label>Carrier</Label><Input value={newWN.carrier} onChange={(e) => setNewWN({ ...newWN, carrier: e.target.value })} /></div>
            <div><Label>Writing #</Label><Input value={newWN.writing_number} onChange={(e) => setNewWN({ ...newWN, writing_number: e.target.value })} /></div>
            <Button onClick={addWN}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
