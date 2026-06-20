import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — AgentLifeline" }] }),
  component: Settings,
});

function Settings() {
  const { data } = useCurrentUser();
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNewPwd("");
    toast.success("Password updated");
  }

  if (!data) return null;
  const tierLabel = { starter: "Starter — up to 100 clients", professional: "Professional — unlimited", agency: "Agency / Team" }[data.profile?.subscription_tier ?? "starter"];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Account, security, and subscription.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Account</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Email:</strong> {data.user.email}</p>
          <p><strong>Role:</strong> <Badge>{data.isAdmin ? "Admin" : "Agent"}</Badge></p>
          <p><strong>Status:</strong> <Badge variant={data.profile?.account_status === "active" ? "default" : "destructive"}>{data.profile?.account_status}</Badge></p>
        </CardContent>
      </Card>

      <Card className="shadow-card border-gold/30">
        <CardHeader><CardTitle className="font-display text-lg">Subscription</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Current plan: <strong>{tierLabel}</strong></p>
          <p className="text-xs text-muted-foreground">Subscription billing will be enabled in a future release. Contact your administrator to change tiers.</p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={updatePassword} className="space-y-3">
            <div><Label>New password</Label><Input type="password" minLength={8} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></div>
            <Button type="submit" disabled={saving || newPwd.length < 8}>{saving ? "Updating…" : "Update password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
