import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, PhoneCall } from "lucide-react";
import { fmtDate, CONTACT_METHOD_LABEL, CONTACT_OUTCOME_LABEL } from "@/lib/labels";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({ meta: [{ title: "Follow-Up Log — AgentLifeline" }] }),
  component: FollowUps,
});

function FollowUps() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["follow-ups"],
    queryFn: async () => (await supabase.from("follow_ups").select("*, households(id, household_name), policies(id, policy_number, carrier)").order("contact_date", { ascending: false })).data ?? [],
  });
  const { data: households = [] } = useQuery({
    queryKey: ["all-households-fu"],
    queryFn: async () => (await supabase.from("households").select("id, household_name").order("household_name")).data ?? [],
  });

  async function del(id: string) { if (!confirm("Delete this follow-up?")) return; await supabase.from("follow_ups").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["follow-ups"] }); }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Follow-Up Log</h1>
          <p className="text-sm text-muted-foreground">Every conversation, every outcome — searchable history.</p>
        </div>
        <NewFollowUpDialog households={households} onSaved={() => qc.invalidateQueries({ queryKey: ["follow-ups"] })} />
      </div>

      {rows.length === 0 && <Card className="shadow-card"><CardContent className="py-10 text-center text-sm text-muted-foreground"><PhoneCall className="h-8 w-8 mx-auto mb-2" />No follow-ups yet.</CardContent></Card>}
      <div className="space-y-2">
        {rows.map((r) => {
          const hh = r.households as { id: string; household_name: string } | null;
          return (
            <Card key={r.id} className="shadow-card">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-medium">{fmtDate(r.contact_date)}</span>
                    {r.method && <span className="text-muted-foreground">· {CONTACT_METHOD_LABEL[r.method]}</span>}
                    {r.outcome && <span className="text-muted-foreground">· {CONTACT_OUTCOME_LABEL[r.outcome]}</span>}
                    {hh && <Link to="/households/$id" params={{ id: hh.id }} className="text-primary hover:underline">· {hh.household_name}</Link>}
                  </div>
                  {r.notes && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{r.notes}</p>}
                  {r.next_follow_up_date && <p className="text-xs text-gold mt-1">⏭ Next: {fmtDate(r.next_follow_up_date)}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NewFollowUpDialog({ households, onSaved }: { households: Array<{ id: string; household_name: string }>; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ household_id: "", contact_date: new Date().toISOString().slice(0, 10), method: "", notes: "", outcome: "", next_follow_up_date: "" });

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("follow_ups").insert({
      agent_id: user.id,
      household_id: f.household_id || null,
      contact_date: f.contact_date,
      method: (f.method || null) as never,
      outcome: (f.outcome || null) as never,
      notes: f.notes || null,
      next_follow_up_date: f.next_follow_up_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Logged");
    setOpen(false);
    setF({ household_id: "", contact_date: new Date().toISOString().slice(0, 10), method: "", notes: "", outcome: "", next_follow_up_date: "" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-gold text-gold-foreground hover:bg-gold/90"><Plus className="h-4 w-4 mr-1" /> Log contact</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Log follow-up</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Household</Label>
            <Select value={f.household_id} onValueChange={(v) => setF({ ...f, household_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{households.map((h) => <SelectItem key={h.id} value={h.id}>{h.household_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={f.contact_date} onChange={(e) => setF({ ...f, contact_date: e.target.value })} /></div>
            <div><Label>Method</Label>
              <Select value={f.method} onValueChange={(v) => setF({ ...f, method: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{Object.entries(CONTACT_METHOD_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Outcome</Label>
              <Select value={f.outcome} onValueChange={(v) => setF({ ...f, outcome: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{Object.entries(CONTACT_OUTCOME_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Next follow-up</Label><Input type="date" value={f.next_follow_up_date} onChange={(e) => setF({ ...f, next_follow_up_date: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
