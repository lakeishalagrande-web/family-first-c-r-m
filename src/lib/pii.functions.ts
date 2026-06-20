import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// AES-256-GCM encryption for SSN/Medicare IDs.
// Key derived from SUPABASE_SERVICE_ROLE_KEY (already a strong server-only secret).
async function getKey() {
  const { scryptSync } = await import("node:crypto");
  const src = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "agentlifeline-fallback";
  return scryptSync(src, "agentlifeline-pii-v1", 32);
}

async function encrypt(plain: string): Promise<Buffer> {
  const { randomBytes, createCipheriv } = await import("node:crypto");
  const key = await getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // layout: iv(12) | tag(16) | ciphertext
  return Buffer.concat([iv, tag, ct]);
}

async function decrypt(blob: Buffer): Promise<string> {
  const { createDecipheriv } = await import("node:crypto");
  const key = await getKey();
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

function digitsOnly(s: string) { return s.replace(/\D/g, ""); }

const encryptInput = z.object({
  recordType: z.enum(["family_member", "term_rider"]),
  recordId: z.string().uuid(),
  field: z.enum(["ssn", "medicare"]),
  value: z.string().min(1).max(64),
});

export const encryptAndStorePII = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => encryptInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const digits = digitsOnly(data.value);
    if (digits.length < 4) throw new Error("Invalid value");
    const last4 = digits.slice(-4);
    const ct = await encrypt(data.value);
    const b64 = ct.toString("base64");

    const table = data.recordType === "family_member" ? "family_members" : "term_riders";
    const encCol = data.field === "ssn" ? "ssn_encrypted" : "medicare_encrypted";
    const last4Col = data.field === "ssn" ? "ssn_last4" : "medicare_last4";

    // Use Supabase RPC-style update via the data API. Postgres accepts base64 in bytea via \x decoding -- easiest is hex.
    const hex = "\\x" + ct.toString("hex");
    const { error } = await supabase
      .from(table)
      .update({ [encCol]: hex, [last4Col]: last4 })
      .eq("id", data.recordId);
    if (error) throw new Error(error.message);
    void b64;
    return { ok: true, last4, accessor: userId };
  });

const revealInput = z.object({
  recordType: z.enum(["family_member", "term_rider"]),
  recordId: z.string().uuid(),
  field: z.enum(["ssn", "medicare"]),
});

export const revealPII = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => revealInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const table = data.recordType === "family_member" ? "family_members" : "term_riders";
    const encCol = data.field === "ssn" ? "ssn_encrypted" : "medicare_encrypted";

    // RLS ensures the caller is owning agent or admin
    const { data: row, error } = await supabase
      .from(table)
      .select(`id, agent_id, ${encCol}`)
      .eq("id", data.recordId)
      .maybeSingle();
    if (error || !row) throw new Error("Not found or unauthorized");

    const raw = (row as Record<string, unknown>)[encCol] as string | null;
    if (!raw) return { value: null };

    // Supabase returns bytea as \xHEX
    const hex = raw.startsWith("\\x") ? raw.slice(2) : raw;
    const buf = Buffer.from(hex, "hex");
    const value = await decrypt(buf);

    // Audit log
    await supabase.from("pii_access_log").insert({
      accessor_id: userId,
      record_type: data.recordType,
      record_id: data.recordId,
      field_name: data.field,
      agent_id: (row as { agent_id: string }).agent_id,
    });

    return { value };
  });
