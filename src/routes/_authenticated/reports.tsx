import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Printer, Download } from "lucide-react";
import { fmtCurrency, fmtDate, PRODUCT_TYPE_LABEL, POLICY_STATUS_LABEL } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — AgentLifeline" }] }),
  component: Reports,
});

function Reports() {
  const [product, setProduct] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [carrier, setCarrier] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: policies = [] } = useQuery({
    queryKey: ["report-policies"],
    queryFn: async () => (await supabase.from("policies").select("*, households(household_name), family_members:insured_member_id(first_name, last_name)").order("issue_date", { ascending: false })).data ?? [],
  });

  const filtered = policies.filter((p) => {
    if (product !== "all" && p.product_type !== product) return false;
    if (status !== "all" && p.status !== status) return false;
    if (carrier && !p.carrier?.toLowerCase().includes(carrier.toLowerCase())) return false;
    if (from && (!p.issue_date || p.issue_date < from)) return false;
    if (to && (!p.issue_date || p.issue_date > to)) return false;
    return true;
  });

  const totalPremium = filtered.reduce((s, p) => s + (Number(p.monthly_premium) || 0), 0);
  const totalFace = filtered.reduce((s, p) => s + (Number(p.face_amount) || 0), 0);

  function exportCSV() {
    const rows = [
      ["Household", "Insured", "Carrier", "Policy #", "Product", "Status", "Face", "Monthly Premium", "Issue Date"],
      ...filtered.map((p) => [
        (p.households as { household_name?: string } | null)?.household_name || "",
        p.family_members ? `${(p.family_members as { first_name: string }).first_name} ${(p.family_members as { last_name: string }).last_name}` : "",
        p.carrier || "", p.policy_number || "",
        p.product_type ? PRODUCT_TYPE_LABEL[p.product_type] : "",
        p.status ? POLICY_STATUS_LABEL[p.status] : "",
        p.face_amount ?? "", p.monthly_premium ?? "",
        p.issue_date || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `agentlifeline-report-${Date.now()}.csv`; a.click();
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Filter, print, and export your book of business.</p>
      </div>

      <Card className="shadow-card print:hidden">
        <CardHeader><CardTitle className="font-display text-lg">Filters</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div><Label>Product</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(PRODUCT_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(POLICY_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Carrier contains</Label><Input value={carrier} onChange={(e) => setCarrier(e.target.value)} /></div>
          <div><Label>Issued from</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Issued to</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex gap-2 print:hidden">
        <Button onClick={() => window.print()} variant="outline"><Printer className="h-4 w-4 mr-1" /> Print / Save PDF</Button>
        <Button onClick={exportCSV} variant="outline"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Results ({filtered.length})</CardTitle>
          <div className="text-sm text-right text-muted-foreground">
            <p>Total face: <span className="font-medium text-foreground">{fmtCurrency(totalFace)}</span></p>
            <p>Monthly premium: <span className="font-medium text-foreground">{fmtCurrency(totalPremium)}</span></p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground"><th className="py-2">Household</th><th>Insured</th><th>Carrier</th><th>Policy #</th><th>Product</th><th>Status</th><th className="text-right">Face</th><th className="text-right">Premium</th><th>Issued</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{(p.households as { household_name?: string } | null)?.household_name || "—"}</td>
                    <td>{p.family_members ? `${(p.family_members as { first_name: string }).first_name} ${(p.family_members as { last_name: string }).last_name}` : "—"}</td>
                    <td>{p.carrier || "—"}</td>
                    <td>{p.policy_number || "—"}</td>
                    <td>{p.product_type ? PRODUCT_TYPE_LABEL[p.product_type] : "—"}</td>
                    <td><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status ? POLICY_STATUS_LABEL[p.status] : "—"}</Badge></td>
                    <td className="text-right">{fmtCurrency(Number(p.face_amount))}</td>
                    <td className="text-right">{fmtCurrency(Number(p.monthly_premium))}</td>
                    <td>{fmtDate(p.issue_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
