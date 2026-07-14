import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, useCurrentUser } from "@/components/app-sidebar";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function getEnvLabel(origin: string) {
  if (origin.includes("localhost")) return { label: "Local", variant: "dev" as const };
  if (origin.includes("id-preview--") || origin.includes("-dev.lovable.app")) return { label: "Preview", variant: "preview" as const };
  return { label: "Production", variant: "prod" as const };
}

function AuthedLayout() {
  const { data, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!isLoading && data?.profile?.account_status === "suspended") {
      supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
    }
  }, [isLoading, data, navigate]);

  const env = getEnvLabel(origin);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar isAdmin={data.isAdmin} email={data.user.email ?? ""} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            {origin && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    env.variant === "prod"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : env.variant === "preview"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {env.label}
                </span>
                <span className="font-mono text-muted-foreground">{origin}</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {data.profile?.full_name || data.user.email}
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
