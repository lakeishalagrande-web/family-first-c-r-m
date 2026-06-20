import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { platformAuditLog } from "@/lib/admin.functions";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "PII Audit Log — AgentLifeline" }] }),
  component: Audit,
});

function Audit() {
  const fn = useServerFn(platformAuditLog);
  const { data: rows = [] } = useQuery({ queryKey: ["admin-audit"], queryFn: () => fn() });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Shield className="h-7 w-7 text-gold" /> PII Access Log</h1>
        <p className="text-sm text-muted-foreground">Every time SSN or Medicare ID was decrypted, by whom.</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="p-3">When</th><th>Accessor</th><th>Owning agent</th><th>Record</th><th>Field</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No access events yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-3 font-mono text-xs">{new Date(r.accessed_at).toLocaleString()}</td>
                  <td className="font-mono text-xs">{r.accessor_id.slice(0, 8)}…</td>
                  <td className="font-mono text-xs">{r.agent_id?.slice(0, 8) || "—"}…</td>
                  <td>{r.record_type} {r.record_id.slice(0, 8)}…</td>
                  <td>{r.field_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
