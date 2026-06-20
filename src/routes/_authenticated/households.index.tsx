import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/households/")({
  head: () => ({ meta: [{ title: "Households — AgentLifeline" }] }),
  component: Households,
});

function Households() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: households = [] } = useQuery({
    queryKey: ["households"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("households")
        .select("*, family_members(count), policies(count)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = households.filter((h) =>
    !q || h.household_name.toLowerCase().includes(q.toLowerCase()) ||
    h.primary_city?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Clients & Households</h1>
          <p className="text-sm text-muted-foreground">Every household, every family member, in one place.</p>
        </div>
        <Button onClick={() => navigate({ to: "/households/new" })} className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Plus className="h-4 w-4 mr-1" /> New household
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search households…" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">No households yet</p>
            <p className="text-sm text-muted-foreground">Add your first client to get started.</p>
            <Button onClick={() => navigate({ to: "/households/new" })} className="mt-4">Add household</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => {
            const members = (h.family_members as { count: number }[] | null)?.[0]?.count ?? 0;
            const policies = (h.policies as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <Link key={h.id} to="/households/$id" params={{ id: h.id }}>
                <Card className="shadow-card hover:shadow-card-hover transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg">{h.household_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      {[h.primary_city, h.primary_state].filter(Boolean).join(", ") || "No address"}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span><strong className="text-foreground">{members}</strong> members</span>
                      <span><strong className="text-foreground">{policies}</strong> policies</span>
                    </div>
                    {h.household_income != null && (
                      <p className="text-xs text-muted-foreground">Income: {fmtCurrency(Number(h.household_income))}</p>
                    )}
                    <p className="text-xs text-muted-foreground pt-1">Updated {fmtDate(h.updated_at)}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
