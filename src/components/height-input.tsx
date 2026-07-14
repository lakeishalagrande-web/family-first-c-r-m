import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function inchesToFtIn(total: number | null | undefined): { ft: string; inch: string } {
  if (total == null || Number.isNaN(Number(total))) return { ft: "", inch: "" };
  const t = Math.max(0, Math.round(Number(total)));
  return { ft: String(Math.floor(t / 12)), inch: String(t % 12) };
}

export function ftInToInches(ft: string, inch: string): number | null {
  const f = ft === "" ? null : Number(ft);
  const i = inch === "" ? null : Number(inch);
  if (f == null && i == null) return null;
  return (f ?? 0) * 12 + (i ?? 0);
}

export function formatHeight(total: number | null | undefined): string {
  if (total == null) return "—";
  const { ft, inch } = inchesToFtIn(total);
  return `${ft}'${inch}"`;
}

export function HeightInput({
  totalInches,
  onChange,
}: {
  totalInches: string; // stringified inches, source of truth
  onChange: (totalInches: string) => void;
}) {
  const t = totalInches === "" ? null : Number(totalInches);
  const { ft, inch } = inchesToFtIn(t);
  function update(nextFt: string, nextInch: string) {
    const v = ftInToInches(nextFt, nextInch);
    onChange(v == null ? "" : String(v));
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-xs">Feet</Label>
        <Input
          type="number"
          min={0}
          max={8}
          value={ft}
          onChange={(e) => update(e.target.value, inch)}
        />
      </div>
      <div>
        <Label className="text-xs">Inches</Label>
        <Input
          type="number"
          min={0}
          max={11}
          value={inch}
          onChange={(e) => update(ft, e.target.value)}
        />
      </div>
    </div>
  );
}
