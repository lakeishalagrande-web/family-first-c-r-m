import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AgentLifeline" },
      { name: "description", content: "Sign in to AgentLifeline, the CRM for independent insurance agents." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [remember, setRemember] = useState(true);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPwd, setSignupPwd] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPwd,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: signupName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you can sign in now");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("If that account exists, a reset link is on its way.");
    setShowForgot(false);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold">
            <Shield className="h-7 w-7 text-gold-foreground" />
          </div>
          <span className="font-display text-2xl font-semibold">AgentLifeline</span>
        </div>
        <div className="space-y-6">
          <h1 className="font-display text-5xl font-bold leading-tight">
            Every household.<br />Every policy.<br /><span className="text-gold">Every deadline.</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            The client intelligence platform built for independent insurance agents who refuse to
            lose another reinstatement deadline to a spreadsheet.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© AgentLifeline. Built for serious agents.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <Card className="w-full max-w-md shadow-card-hover border-border">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 lg:hidden mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <Shield className="h-5 w-5 text-gold" />
              </div>
              <span className="font-display text-xl font-semibold">AgentLifeline</span>
            </div>
            <CardTitle className="font-display text-2xl">
              {showForgot ? "Reset your password" : "Welcome"}
            </CardTitle>
            <CardDescription>
              {showForgot
                ? "Enter your email and we'll send a reset link."
                : "Sign in to your agent account or create a new one."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showForgot ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <button type="button" onClick={() => setShowForgot(false)} className="block w-full text-center text-sm text-muted-foreground hover:text-primary">
                  Back to sign in
                </button>
              </form>
            ) : (
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-pwd">Password</Label>
                      <Input id="login-pwd" type="password" required value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 text-muted-foreground">
                        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-input" />
                        Remember me
                      </label>
                      <button type="button" onClick={() => setShowForgot(true)} className="text-primary hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="mt-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input id="signup-name" required value={signupName} onChange={(e) => setSignupName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-pwd">Password</Label>
                      <Input id="signup-pwd" type="password" required minLength={8} value={signupPwd} onChange={(e) => setSignupPwd(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account…" : "Create agent account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
