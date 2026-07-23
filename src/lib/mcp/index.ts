import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listHouseholds from "./tools/list-households";
import getHousehold from "./tools/get-household";
import listUpcomingAlerts from "./tools/list-upcoming-alerts";
import createFollowUp from "./tools/create-follow-up";

// OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "agentlifeline-mcp",
  title: "AgentLifeline",
  version: "0.1.0",
  instructions:
    "Tools for AgentLifeline, a CRM for independent insurance agents. Each caller is authenticated as an agent; all reads and writes are scoped to that agent's own households, family members, policies, alerts, and follow-ups via RLS. Use list_households to find a client, get_household for details, list_upcoming_alerts for deadlines, and create_follow_up to log next steps.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listHouseholds, getHousehold, listUpcomingAlerts, createFollowUp],
});
