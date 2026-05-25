import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { createClient } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sidebarUser = {
    name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin",
    email: user?.email || "",
    avatar: user?.user_metadata?.avatar_url || "",
    role: user?.user_metadata?.role || "viewer",
  };

  return (
    <SidebarProvider className="bg-muted/40">
      <AppSidebar user={sidebarUser} />
      <SidebarInset className="overflow-hidden flex flex-col bg-muted/40">
        <MobileHeader />
        <main className="flex-1 flex flex-col overflow-hidden bg-muted/40">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
