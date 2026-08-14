import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { usePersonSearch, personSummary } from "@/components/person-search";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Find a Person — AgentLifeline" },
      { name: "description", content: "Instantly locate any client or family member by name, date of birth or phone number." },
      { property: "og:title", content: "Find a Person — AgentLifeline" },
      { property: "og:description", content: "Instantly locate any client or family member by name, date of birth or phone number." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GlobalSearch,
});

function GlobalSearch() {
  const [term, setTerm] = useState("");
  const { data: hits, isFetching } = usePersonSearch(term, 50);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Find a person</h1>
        <p className="text-sm text-muted-foreground">Search by first name, last name, date of birth (MM/DD/YYYY) or phone number.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          className="pl-9 h-12 text-base"
          placeholder="LaToya, 09/14/1982, (312) 555-0134…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      {term.trim().length < 2 && <p className="text-sm text-muted-foreground">Type at least 2 characters.</p>}
      {term.trim().length >= 2 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {isFetching ? "Searching…" : `${hits?.length ?? 0} result${(hits?.length ?? 0) === 1 ? "" : "s"}`}
          </p>
          {(hits ?? []).map((p) => (
            <Link key={p.id} to="/members/$id" params={{ id: p.id }}>
              <Card className="shadow-card hover:shadow-card-hover">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{personSummary(p) || "—"}</p>
                  </div>
                  {p.households?.household_name && <Badge variant="secondary" className="shrink-0">{p.households.household_name}</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
