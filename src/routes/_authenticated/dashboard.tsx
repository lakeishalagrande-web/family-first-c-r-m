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

      <UrgentAlertsCard />

      <AnnualReviewsCard />



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

// ---------- Urgent Alerts (collapsed category counts) ----------
type DismissedMap = Record<string, string[]>;
const DISMISS_KEY = "dashboard-dismissed-v1";
function loadDismissed(): DismissedMap {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch { return {}; }
}
function saveDismissed(m: DismissedMap) { localStorage.setItem(DISMISS_KEY, JSON.stringify(m)); }

function UrgentAlertsCard() {
  const [dismissed, setDismissed] = useState<DismissedMap>(() => (typeof window !== "undefined" ? loadDismissed() : {}));
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["urgent-alerts"],
    queryFn: async () => {
      const today = new Date();
      const in6mo = new Date(today); in6mo.setMonth(in6mo.getMonth() + 6);
      const [{ data: members }, { data: policies }, { data: hhs }] = await Promise.all([
        supabase.from("family_members").select("id, first_name, last_name, date_of_birth, household_id"),
        supabase.from("policies").select("id, carrier, policy_number, status, household_id, insured_member_id"),
        supabase.from("households").select("id, household_name"),
      ]);
      const m = members ?? []; const p = policies ?? []; const h = hhs ?? [];

      const turning65 = m.filter((mem) => {
        if (!mem.date_of_birth) return false;
        const dob = new Date(mem.date_of_birth);
        const at65 = new Date(dob.getFullYear() + 65, dob.getMonth(), dob.getDate());
        return at65 >= today && at65 <= in6mo;
      });

      const lapsed = p.filter((pol) => pol.status === "lapsed");

      const activeByMember = new Set(p.filter((pol) => pol.status === "active" && pol.insured_member_id).map((pol) => pol.insured_member_id));
      const uninsured = m.filter((mem) => !activeByMember.has(mem.id));

      const hhMap = new Map(h.map((x) => [x.id, x.household_name]));
      return {
        turning65: turning65.map((x) => ({ id: x.id, label: `${x.first_name} ${x.last_name} (age ${calcAge(x.date_of_birth)})`, householdId: x.household_id })),
        lapsed: lapsed.map((x) => ({ id: x.id, label: `${x.carrier || "—"} #${x.policy_number || "—"} · ${hhMap.get(x.household_id) || ""}`, householdId: x.household_id })),
        uninsured: uninsured.map((x) => ({ id: x.id, label: `${x.first_name} ${x.last_name} · ${hhMap.get(x.household_id) || ""}`, householdId: x.household_id })),
      };
    },
  });

  function dismiss(cat: string, id: string, reason: string) {
    const next = { ...dismissed, [cat]: [...(dismissed[cat] ?? []), id] };
    setDismissed(next); saveDismissed(next);
    toast.success(`Dismissed: ${reason}`);
  }
  const visible = (cat: string, list: Array<{ id: string; label: string; householdId: string }>) =>
    list.filter((x) => !(dismissed[cat] ?? []).includes(x.id));

  const cats: Array<{ key: string; label: string; list: Array<{ id: string; label: string; householdId: string }> }> = [
    { key: "turning65", label: "Members turning 65 within 6 months", list: visible("turning65", data?.turning65 ?? []) },
    { key: "lapsed", label: "Lapsed policies", list: visible("lapsed", data?.lapsed ?? []) },
    { key: "uninsured", label: "Uninsured family members", list: visible("uninsured", data?.uninsured ?? []) },
  ];

  return (
    <Card className="shadow-card border-destructive/30">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Urgent Alerts</CardTitle>
        <CardDescription>Click a row to expand. Dismiss with a reason.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {cats.map((c) => {
          const isOpen = expanded === c.key;
          return (
            <div key={c.key} className="border rounded-md">
              <button type="button" onClick={() => setExpanded(isOpen ? null : c.key)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {c.label}
                </span>
                <Badge variant={c.list.length > 0 ? "destructive" : "secondary"}>{c.list.length}</Badge>
              </button>
              {isOpen && (
                <div className="px-3 py-2 border-t space-y-1">
                  {c.list.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
                  {c.list.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-sm py-1">
                      <Link to="/households/$id" params={{ id: item.householdId }} className="hover:underline truncate">{item.label}</Link>
                      <Select onValueChange={(v) => dismiss(c.key, item.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Dismiss…" /></SelectTrigger>
                        <SelectContent>
                          {DISMISS_REASON_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ---------- Annual review reminders ----------
function AnnualReviewsCard() {
  const { data } = useQuery({
    queryKey: ["annual-reviews"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const { data: hhs } = await supabase.from("households")
        .select("id, household_name, annual_review_date")
        .not("annual_review_date", "is", null)
        .gte("annual_review_date", today)
        .lte("annual_review_date", in30)
        .order("annual_review_date");
      return hhs ?? [];
    },
  });
  if (!data || data.length === 0) return null;
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Annual reviews due (30d)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((h) => {
          const d = daysUntil(h.annual_review_date);
          return (
            <Link key={h.id} to="/households/$id" params={{ id: h.id }} className="flex items-center justify-between border rounded-md p-2 hover:bg-muted/40">
              <span className="text-sm font-medium">{h.household_name}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(h.annual_review_date)} · {d == null ? "" : `${d}d`}</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

