import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_household",
  title: "Get household detail",
  description:
    "Fetch one household with its family members and policies. Sensitive PII (SSN, Medicare ID) is never returned.",
  inputSchema: {
    household_id: z.string().uuid().describe("Household UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ household_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [household, members, policies] = await Promise.all([
      supabase.from("households").select("*").eq("id", household_id).maybeSingle(),
      supabase.from("family_members").select("id, first_name, last_name, date_of_birth, relationship, phone, email, doctor_name, medications").eq("household_id", household_id),
      supabase.from("policies").select("id, contact_id, policy_type, carrier, policy_number, effective_date, status, premium, premium_frequency, face_amount").eq("household_id", household_id),
    ]);
    if (household.error) return { content: [{ type: "text", text: household.error.message }], isError: true };
    if (!household.data) return { content: [{ type: "text", text: "Not found" }], isError: true };
    const result = {
      household: household.data,
      family_members: members.data ?? [],
      policies: policies.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
