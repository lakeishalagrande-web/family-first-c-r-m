import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { fmtDate } from "@/lib/labels";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — AgentLifeline" }] }),
  component: Announcements,
});

function Announcements() {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", body: "" });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function post() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !f.title || !f.body) return;
    const { error } = await supabase.from("announcements").insert({ author_id: user.id, title: f.title, body: f.body });
    if (error) return toast.error(error.message);
    toast.success("Posted to all agents");
    setF({ title: "", body: "" });
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await supabase.from("announcements").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-announcements"] }); }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Post messages that appear on every agent's dashboard.</p>
      </div>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">New announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Body</Label><Textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
          <Button onClick={post} disabled={!f.title || !f.body}>Post</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {rows.map((a) => (
          <Card key={a.id} className="shadow-card">
            <CardContent className="p-4 flex justify-between gap-3">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtDate(a.created_at)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
