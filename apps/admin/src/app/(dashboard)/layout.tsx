import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { createClient } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sidebarUser = {
    name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin",
    email: user?.email || "",
    avatar: user?.user_metadata?.avatar_url || "",
    role: user?.user_metadata?.role || "manager",
  };

  return (
    <SidebarProvider className="bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-(--z-toast) focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
      >
        До основного вмісту
      </a>
      <AppSidebar user={sidebarUser} />
      {/* SidebarInset renders the page's single <main> landmark. tabular-nums: prices,
          quantities, dates and order numbers line up across the ops screens. */}
      <SidebarInset id="main-content" tabIndex={-1} className="overflow-hidden flex flex-col bg-background tabular-nums outline-none">
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
