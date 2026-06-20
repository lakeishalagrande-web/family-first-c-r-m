import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText } from "lucide-react";
import { fmtCurrency, fmtDate, PRODUCT_TYPE_LABEL, POLICY_STATUS_LABEL } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/policies/")({
  head: () => ({ meta: [{ title: "Policies — AgentLifeline" }] }),
  component: PoliciesList,
});

function PoliciesList() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: rows = [] } = useQuery({
    queryKey: ["policies-list"],
    queryFn: async () => {
      const { data } = await supabase.from("policies").select("*, households(household_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = rows.filter((p) =>
    !q || p.policy_number?.toLowerCase().includes(q.toLowerCase()) ||
    p.carrier?.toLowerCase().includes(q.toLowerCase()) ||
    (p.households as { household_name?: string } | null)?.household_name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Policies</h1>
          <p className="text-sm text-muted-foreground">Every policy you've written, across all households.</p>
        </div>
        <Button onClick={() => navigate({ to: "/policies/new" })} className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Plus className="h-4 w-4 mr-1" /> New policy
        </Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search policies…" className="pl-9" />
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="shadow-card"><CardContent className="py-12 text-center text-sm text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2" /> No policies yet.
          </CardContent></Card>
        )}
        {filtered.map((p) => (
          <Link key={p.id} to="/policies/$id" params={{ id: p.id }}>
            <Card className="shadow-card hover:shadow-card-hover">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="font-medium truncate">{p.carrier || "—"} · {p.policy_number || "no #"}</p>
                    <Badge variant={p.status === "active" ? "default" : p.status === "lapsed" ? "destructive" : "secondary"}>{p.status ? POLICY_STATUS_LABEL[p.status] : "—"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(p.households as { household_name?: string } | null)?.household_name || "—"} · {p.product_type ? PRODUCT_TYPE_LABEL[p.product_type] : "—"} · Face {fmtCurrency(Number(p.face_amount))} · {fmtCurrency(Number(p.monthly_premium))}/mo
                  </p>
                </div>
                <p className="text-xs text-muted-foreground hidden md:block">{fmtDate(p.issue_date)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
