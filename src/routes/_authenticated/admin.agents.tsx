import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAgents, setAgentStatus, setAgentTier, grantAdminRole, deleteAgent, resetAgentPassword } from "@/lib/admin.functions";
import { fmtDate } from "@/lib/labels";
import { toast } from "sonner";
import { Trash2, Mail, ShieldCheck, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/agents")({
  head: () => ({ meta: [{ title: "Manage Agents — AgentLifeline" }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAgents);
  const status = useServerFn(setAgentStatus);
  const tier = useServerFn(setAgentTier);
  const grant = useServerFn(grantAdminRole);
  const del = useServerFn(deleteAgent);
  const resetPwd = useServerFn(resetAgentPassword);

  const { data: agents = [] } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => list(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-agents"] });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Agents</h1>
        <p className="text-sm text-muted-foreground">Manage every agent on the platform.</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left"><th className="p-3">Agent</th><th>Email</th><th>Joined</th><th>Status</th><th>Tier</th><th>Role</th><th className="text-right p-3">Actions</th></tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const isAdmin = a.roles.includes("admin");
                return (
                  <tr key={a.id} className="border-b">
                    <td className="p-3">{a.full_name || "—"}</td>
                    <td>{a.email}</td>
                    <td>{fmtDate(a.created_at)}</td>
                    <td>
                      <Select value={a.account_status} onValueChange={async (v) => { await status({ data: { userId: a.id, status: v as "active" | "suspended" } }); toast.success("Updated"); refresh(); }}>
                        <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
                      </Select>
                    </td>
                    <td>
                      <Select value={a.subscription_tier} onValueChange={async (v) => { await tier({ data: { userId: a.id, tier: v as "starter" | "professional" | "agency" } }); toast.success("Updated"); refresh(); }}>
                        <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td><Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Admin" : "Agent"}</Badge></td>
                    <td className="p-3 text-right space-x-1">
                      <Button size="icon" variant="ghost" title="Send password reset" onClick={async () => { await resetPwd({ data: { email: a.email } }); toast.success("Reset email queued"); }}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title={isAdmin ? "Revoke admin" : "Grant admin"} onClick={async () => { await grant({ data: { userId: a.id, grant: !isAdmin } }); toast.success("Updated"); refresh(); }}>
                        {isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" title="Delete agent" onClick={async () => {
                        if (!confirm(`Delete ${a.email}? This permanently removes their data.`)) return;
                        try { await del({ data: { userId: a.id } }); toast.success("Deleted"); refresh(); }
                        catch (e) { toast.error((e as Error).message); }
                      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
