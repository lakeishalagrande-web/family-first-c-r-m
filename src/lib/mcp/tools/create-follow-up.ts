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
  name: "create_follow_up",
  title: "Create follow-up",
  description:
    "Create a follow-up task for the signed-in agent, optionally linked to a household. Use this to log next steps from a conversation.",
  inputSchema: {
    household_id: z.string().uuid().optional().describe("Optional household to link the follow-up to."),
    note: z.string().trim().min(1).describe("Follow-up description."),
    due_date: z.string().optional().describe("Optional ISO date (YYYY-MM-DD) when the follow-up is due."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ household_id, note, due_date }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("follow_ups")
      .insert({
        agent_id: ctx.getUserId(),
        household_id: household_id ?? null,
        note,
        due_date: due_date ?? null,
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Follow-up created (id ${data?.id}).` }],
      structuredContent: { follow_up: data },
    };
  },
});
