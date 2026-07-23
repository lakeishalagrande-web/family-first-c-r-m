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
  name: "list_households",
  title: "List households",
  description:
    "List the signed-in agent's households (CRM records). Supports optional case-insensitive name search and a row limit.",
  inputSchema: {
    search: z.string().trim().optional().describe("Optional case-insensitive substring to match household_name."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("households")
      .select("id, household_name, primary_contact_first_name, primary_contact_last_name, primary_phone, primary_email, city, state, annual_review_date, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (search) q = q.ilike("household_name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { households: data ?? [] },
    };
  },
});
