import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, User } from "lucide-react";
import { fmtCurrency, fmtDate, calcAge } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/households/")({
  head: () => ({ meta: [{ title: "Contacts — AgentLifeline" }] }),
  component: Households,
});

function Households() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"households" | "contacts">("households");

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

  const { data: members = [] } = useQuery({
    queryKey: ["all-family-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("id, first_name, last_name, relationship, date_of_birth, email, phone_mobile, is_primary, household_id, households(household_name)")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const filteredHH = households.filter((h) =>
    !q || h.household_name.toLowerCase().includes(q.toLowerCase()) ||
    h.primary_city?.toLowerCase().includes(q.toLowerCase())
  );
  const filteredM = members.filter((m) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return `${m.first_name} ${m.last_name}`.toLowerCase().includes(s) ||
      (m.relationship ?? "").toLowerCase().includes(s) ||
      (m.households?.household_name ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Clients & Households</h1>
          <p className="text-sm text-muted-foreground">Every household and every family member, in one place.</p>
        </div>
        <Button onClick={() => navigate({ to: "/households/new" })} className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Plus className="h-4 w-4 mr-1" /> New household
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border p-1 text-sm">
          <button
            onClick={() => setView("households")}
            className={`px-3 py-1 rounded ${view === "households" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >Households ({households.length})</button>
          <button
            onClick={() => setView("contacts")}
            className={`px-3 py-1 rounded ${view === "contacts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >All Contacts ({members.length})</button>
        </div>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={view === "households" ? "Search households…" : "Search contacts…"} className="pl-9" />
        </div>
      </div>

      {view === "households" ? (
        filteredHH.length === 0 ? (
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
            {filteredHH.map((h) => {
              const memberCount = (h.family_members as { count: number }[] | null)?.[0]?.count ?? 0;
              const policyCount = (h.policies as { count: number }[] | null)?.[0]?.count ?? 0;
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
                        <span><strong className="text-foreground">{memberCount}</strong> members</span>
                        <span><strong className="text-foreground">{policyCount}</strong> policies</span>
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
        )
      ) : filteredM.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">No contacts found.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredM.map((m) => (
            <Link key={m.id} to="/households/$id" params={{ id: m.household_id }}>
              <Card className="shadow-card hover:shadow-card-hover transition-shadow h-full">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <p className="font-medium truncate">{m.first_name} {m.last_name}</p>
                        {m.is_primary && <Badge className="bg-gold text-gold-foreground">Primary</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.relationship || "—"}{m.date_of_birth && ` · age ${calcAge(m.date_of_birth)}`}
                      </p>
                    </div>
                  </div>
                  {m.households?.household_name && !m.is_primary && (
                    <Badge variant="secondary" className="text-xs">Family of: {m.households.household_name}</Badge>
                  )}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {m.email && <p className="truncate">📧 {m.email}</p>}
                    {m.phone_mobile && <p>📱 {m.phone_mobile}</p>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
