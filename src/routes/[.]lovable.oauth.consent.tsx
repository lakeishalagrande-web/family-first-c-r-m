import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

// Minimal typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string; client_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string;
  redirect_to?: string;
};
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
    approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
    denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  };
}).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Could not load this authorization request</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </CardContent>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";
  const redirectUri = details?.client?.redirect_uri;
  const scopes = (details?.scope ?? "").split(" ").filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Shield className="h-5 w-5 text-gold" />
            </div>
            <span className="font-display text-lg font-semibold">AgentLifeline</span>
          </div>
          <CardTitle>Connect {clientName} to your account</CardTitle>
          <CardDescription>
            This lets {clientName} use AgentLifeline as you. It can only see and act on your own households,
            family members, policies, alerts, and follow-ups. This does not bypass AgentLifeline's permissions
            or backend policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {redirectUri && (
            <div className="text-xs text-muted-foreground">
              Redirects to <code className="break-all">{redirectUri}</code>
            </div>
          )}
          {scopes.length > 0 && (
            <ul className="text-sm list-disc pl-5 space-y-1">
              {scopes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              {busy ? "Working…" : "Approve"}
            </Button>
            <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
              Deny
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
