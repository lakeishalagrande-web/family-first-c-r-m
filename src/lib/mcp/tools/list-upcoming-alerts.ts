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
  name: "list_upcoming_alerts",
  title: "List upcoming alerts",
  description:
    "List the signed-in agent's open alerts (policy lapses, reinstatement deadlines, annual reviews). Ordered by due date ascending.",
  inputSchema: {
    within_days: z.number().int().min(1).max(365).optional().describe("Only alerts due within this many days (default 30)."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ within_days, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + (within_days ?? 30));
    const { data, error } = await supabaseForUser(ctx)
      .from("alerts")
      .select("*")
      .lte("due_date", cutoff.toISOString().slice(0, 10))
      .order("due_date", { ascending: true })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { alerts: data ?? [] },
    };
  },
});
