import * as React from "react";
import { Input } from "@/components/ui/input";

export function formatPhone(value: string): string {
  const d = (value || "").replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

type Props = Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  value: string;
  onChange: (v: string) => void;
};

export function PhoneInput({ value, onChange, ...rest }: Props) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      placeholder="(555) 555-5555"
      value={formatPhone(value ?? "")}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      {...rest}
    />
  );
}
