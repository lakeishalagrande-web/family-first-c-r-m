import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, RefreshCw } from "lucide-react";
import { fmtDate, daysUntil, ALERT_TYPE_LABEL } from "@/lib/labels";
import { regenerateAlerts } from "@/lib/alerts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts & Deadlines — AgentLifeline" }] }),
  component: Alerts,
});

function Alerts() {
  const qc = useQueryClient();
  const regen = useServerFn(regenerateAlerts);
  useEffect(() => { regen().then(() => qc.invalidateQueries({ queryKey: ["alerts-page"] })).catch(console.error); }, [regen, qc]);

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts-page"],
    queryFn: async () => (await supabase.from("alerts").select("*").order("due_date")).data ?? [],
  });

  async function dismiss(id: string) {
    await supabase.from("alerts").update({ is_dismissed: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["alerts-page"] });
  }
  async function refresh() {
    const r = await regen();
    toast.success(`${r.generated} alerts refreshed${r.lapsed ? `, ${r.lapsed} auto-lapsed` : ""}`);
    qc.invalidateQueries({ queryKey: ["alerts-page"] });
  }

  const active = alerts.filter((a) => !a.is_dismissed);
  const dismissed = alerts.filter((a) => a.is_dismissed);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Alerts & Deadlines</h1>
          <p className="text-sm text-muted-foreground">Reinstatement deadlines, birthdays, follow-ups — auto-generated.</p>
        </div>
        <Button variant="outline" onClick={refresh}><RefreshCw className="h-4 w-4 mr-1" /> Recalculate</Button>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display">Active ({active.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 && <p className="text-sm text-muted-foreground py-4">No active alerts.</p>}
          {active.map((a) => {
            const d = daysUntil(a.due_date);
            const target = a.related_household_id ? { to: "/households/$id" as const, params: { id: a.related_household_id } } : a.related_policy_id ? { to: "/policies/$id" as const, params: { id: a.related_policy_id } } : null;
            const Inner = (
              <Card className="shadow-card hover:shadow-card-hover">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Bell className="h-4 w-4 text-gold shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{ALERT_TYPE_LABEL[a.alert_type]} · {fmtDate(a.due_date)} {a.description && `· ${a.description}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={d != null && d <= 7 ? "destructive" : "secondary"}>{d == null ? "—" : d < 0 ? `${-d}d ago` : `in ${d}d`}</Badge>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(a.id); }}><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
            return <div key={a.id}>{target ? <Link {...target}>{Inner}</Link> : Inner}</div>;
          })}
        </CardContent>
      </Card>

      {dismissed.length > 0 && (
        <Card className="shadow-card opacity-70">
          <CardHeader><CardTitle className="font-display text-sm">Dismissed ({dismissed.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {dismissed.map((a) => (
              <p key={a.id} className="text-muted-foreground line-through">{a.title} · {fmtDate(a.due_date)}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
