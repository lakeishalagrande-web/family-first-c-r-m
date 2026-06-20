import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { platformStats } from "@/lib/admin.functions";
import { Users, FileText, PhoneCall, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/platform")({
  head: () => ({ meta: [{ title: "Platform Reports — AgentLifeline" }] }),
  component: Platform,
});

function Platform() {
  const stats = useServerFn(platformStats);
  const { data } = useQuery({ queryKey: ["admin-platform"], queryFn: () => stats() });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Platform Reports</h1>
        <p className="text-sm text-muted-foreground">Aggregate stats across every agent.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total agents" v={data?.agents} Icon={Users} />
        <Stat label="Total households" v={data?.households} Icon={Home} />
        <Stat label="Total family members" v={data?.members} Icon={Users} />
        <Stat label="Total policies" v={data?.policies} Icon={FileText} />
        <Stat label="Active policies" v={data?.activePolicies} Icon={FileText} />
        <Stat label="Follow-ups logged" v={data?.followUps} Icon={PhoneCall} />
      </div>
      <Card className="shadow-card border-gold/30">
        <CardContent className="p-6 text-sm">
          <p className="font-medium">Billing & subscriptions</p>
          <p className="text-muted-foreground mt-1">Payment processing will be enabled in a future release. Subscription tiers are admin-managed today (Agents → Tier).</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, v, Icon }: { label: string; v: number | undefined; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">{v ?? "—"}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}
