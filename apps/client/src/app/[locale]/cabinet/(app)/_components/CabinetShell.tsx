"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Menu, MessageCircle, Package, Settings } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandLogoFull } from "@/components/brand-logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CabinetProvider, useCabinet } from "../_lib/cabinet";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("cabinet");
  const pathname = usePathname();
  const { user, totalUnread, logout } = useCabinet();

  const items = [
    { href: "/cabinet", label: t("nav.orders"), icon: Package, active: pathname === "/cabinet" || pathname.startsWith("/cabinet/orders"), badge: 0 },
    { href: "/cabinet/messages", label: t("nav.messages"), icon: MessageCircle, active: pathname.startsWith("/cabinet/messages"), badge: totalUnread },
    { href: "/cabinet/settings", label: t("settings"), icon: Settings, active: pathname.startsWith("/cabinet/settings"), badge: 0 },
  ];

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Link href="/" aria-label="U:DO CRAFT" onClick={onNavigate}>
          <BrandLogoFull className="h-6 w-auto text-primary" color="var(--color-primary)" />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label={t("breadcrumb")}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.active ? "bg-primary/5 font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-4 shrink-0", item.active ? "text-primary" : "text-muted-foreground/70")} />
            <span className="truncate">{item.label}</span>
            {item.badge > 0 && (
              <span className="ml-auto flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-border p-2">
        <p className="truncate px-2.5 py-1 text-xs text-muted-foreground" title={user.email}>{user.email}</p>
        <button
          type="button"
          onClick={logout}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4 shrink-0 text-muted-foreground/70" />
          {t("logout")}
        </button>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("cabinet");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex overflow-hidden bg-background" style={{ height: "100dvh" }}>
      <aside className="hidden w-60 shrink-0 border-r border-border md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("nav.menu")}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" aria-label="U:DO CRAFT">
            <BrandLogoFull className="h-5 w-auto text-primary" color="var(--color-primary)" />
          </Link>
        </header>
        <main id="main" className="min-h-0 flex-1">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 gap-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Shared account layout: sidebar on desktop, drawer on mobile. */
export function CabinetShell({ children }: { children: React.ReactNode }) {
  return (
    <CabinetProvider fallback={<Spinner />}>
      <Frame>{children}</Frame>
    </CabinetProvider>
  );
}
