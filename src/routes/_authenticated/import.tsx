import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "CSV Import — AgentLifeline" }] }),
  component: ImportPage,
});

const TEMPLATE_HEADERS = [
  "household_name", "primary_street", "primary_city", "primary_state", "primary_zip",
  "household_income",
  "first_name", "last_name", "relationship", "date_of_birth", "gender",
  "email", "phone_mobile", "phone_home", "occupation", "annual_income",
];

function ImportPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number; errors: string[] } | null>(null);

  function downloadTemplate() {
    const csv = TEMPLATE_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "agentlifeline-import-template.csv"; a.click();
  }

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = parseRow(lines[0]);
    return lines.slice(1).map((line) => {
      const cells = parseRow(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h.trim()] = (cells[i] ?? "").trim(); });
      return obj;
    });
  }
  function parseRow(line: string): string[] {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
      else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else { cur += c; }
    }
    out.push(cur); return out;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    const text = await file.text();
    const rows = parseCSV(text);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }

    let ok = 0; let failed = 0; const errors: string[] = [];
    for (const row of rows) {
      if (!row.household_name) { failed++; errors.push(`Skipped row: missing household_name`); continue; }
      try {
        const { data: hh, error: hhErr } = await supabase.from("households").insert({
          agent_id: user.id,
          household_name: row.household_name,
          primary_street: row.primary_street || null,
          primary_city: row.primary_city || null,
          primary_state: row.primary_state || null,
          primary_zip: row.primary_zip || null,
          household_income: row.household_income ? Number(row.household_income) : null,
        }).select().single();
        if (hhErr) throw hhErr;
        if (row.first_name && row.last_name) {
          await supabase.from("family_members").insert({
            agent_id: user.id, household_id: hh.id,
            first_name: row.first_name, last_name: row.last_name,
            relationship: row.relationship || null,
            date_of_birth: row.date_of_birth || null,
            gender: row.gender || null,
            email: row.email || null,
            phone_mobile: row.phone_mobile || null,
            phone_home: row.phone_home || null,
            occupation: row.occupation || null,
            annual_income: row.annual_income ? Number(row.annual_income) : null,
            is_primary: true,
          });
        }
        ok++;
      } catch (err) {
        failed++; errors.push(`${row.household_name}: ${(err as Error).message}`);
      }
    }
    setBusy(false);
    setResult({ ok, failed, errors: errors.slice(0, 10) });
    qc.invalidateQueries({ queryKey: ["households"] });
    toast.success(`Imported ${ok} households`);
    e.target.value = "";
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">CSV Import</h1>
        <p className="text-sm text-muted-foreground">Bring your existing client list into AgentLifeline.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Step 1 — Download template</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Use this template so the columns match. One row per household; if first_name/last_name are filled, they're saved as the primary insured.</p>
          <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Download template</Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Step 2 — Upload your CSV</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label className="cursor-pointer">
            <div className="rounded-md border-2 border-dashed border-input p-8 text-center hover:border-primary transition-colors">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">{busy ? "Importing…" : "Click to select a .csv file"}</p>
            </div>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" disabled={busy} />
          </Label>
          {result && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>✅ Imported: <strong>{result.ok}</strong></p>
              {result.failed > 0 && <p>❌ Failed: <strong>{result.failed}</strong></p>}
              {result.errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
