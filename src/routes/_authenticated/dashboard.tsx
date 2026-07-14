import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileText, AlertTriangle, PhoneCall, Plus, Bell, ChevronDown, ChevronRight, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { regenerateAlerts } from "@/lib/alerts.functions";
import { fmtDate, daysUntil, calcAge, ALERT_TYPE_LABEL, DISMISS_REASON_OPTIONS } from "@/lib/labels";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AgentLifeline" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const regen = useServerFn(regenerateAlerts);

  useEffect(() => { regen().catch(console.error); }, [regen]);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const [hh, expiring, reinst, fu, recent, alerts, announcements] = await Promise.all([
        supabase.from("households").select("id", { count: "exact", head: true }),
        supabase.from("policies").select("id", { count: "exact", head: true }).gte("reinstatement_deadline", today).lte("reinstatement_deadline", in30),
        supabase.from("policies").select("id", { count: "exact", head: true }).gte("reinstatement_deadline", today).lte("reinstatement_deadline", in7),
        supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("next_follow_up_date", today),
        supabase.from("follow_ups").select("id, contact_date, notes, method, household_id").order("created_at", { ascending: false }).limit(6),
        supabase.from("alerts").select("*").eq("is_dismissed", false).order("due_date").limit(8),
        supabase.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      return {
        households: hh.count ?? 0,
        expiring: expiring.count ?? 0,
        reinst: reinst.count ?? 0,
        followUpsToday: fu.count ?? 0,
        recent: recent.data ?? [],
        alerts: alerts.data ?? [],
        announcements: announcements.data ?? [],
      };
    },
  });


  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your client intelligence at a glance.</p>
        </div>
        <Button onClick={() => navigate({ to: "/households/new" })} className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Plus className="h-4 w-4 mr-1" /> Quick add client
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active clients" value={stats?.households ?? "—"} tint="primary" />
        <StatCard icon={FileText} label="Policies expiring (30d)" value={stats?.expiring ?? "—"} tint="warning" />
        <StatCard icon={AlertTriangle} label="Reinstatement (7d)" value={stats?.reinst ?? "—"} tint="destructive" />
        <StatCard icon={PhoneCall} label="Follow-ups today" value={stats?.followUpsToday ?? "—"} tint="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">Active alerts</CardTitle>
              <CardDescription>Deadlines, birthdays, and follow-ups within range.</CardDescription>
            </div>
            <Link to="/alerts" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {!stats?.alerts.length && (
              <p className="text-sm text-muted-foreground py-4">No active alerts. You're all caught up.</p>
            )}
            {stats?.alerts.map((a) => {
              const d = daysUntil(a.due_date);
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Bell className="h-4 w-4 text-gold shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{ALERT_TYPE_LABEL[a.alert_type]} · {fmtDate(a.due_date)}</p>
                    </div>
                  </div>
                  <Badge variant={d != null && d <= 7 ? "destructive" : "secondary"}>
                    {d == null ? "—" : d < 0 ? `${-d}d ago` : `${d}d`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Recent activity</CardTitle>
            <CardDescription>Latest follow-up entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats?.recent.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            {stats?.recent.map((r) => (
              <div key={r.id} className="text-sm border-l-2 border-gold/40 pl-3">
                <p className="font-medium">{fmtDate(r.contact_date)} · {r.method || "—"}</p>
                <p className="text-muted-foreground line-clamp-2">{r.notes || "No notes"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {!!stats?.announcements.length && (
        <Card className="shadow-card border-gold/30">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Bell className="h-4 w-4 text-gold" /> Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.announcements.map((a) => (
              <div key={a.id}>
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; tint: "primary" | "gold" | "warning" | "destructive" }) {
  const tintClasses = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-gold/15 text-gold",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  }[tint];
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tintClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
