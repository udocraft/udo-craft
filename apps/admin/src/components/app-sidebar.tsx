"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3, Users, MessageCircle, ShoppingBag, ImagePlus,
  Settings, ChevronRight, UserCog, ShelvingUnit,
  FileEdit, Globe, Search, Tag, Plus, Boxes,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { NavUser } from "@/components/nav-user";
import { createClient } from "@/lib/supabase/client";
import { playNotificationTone } from "@/lib/notifications";
import { toast } from "sonner";
import { CommandMenu } from "@/components/command-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// ── Nav structure ─────────────────────────────────────────────────────────────

interface NavSubItem {
  title: string;
  url: string;
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badgeKey?: "orders" | "messages";
  children?: NavSubItem[];
}

type AdminRole = "admin" | "manager" | "viewer" | "seamstress" | "sewer";

const CRM_NAV: NavItem[] = [
  {
    title: "Замовлення",
    url: "/orders",
    icon: ShoppingBag,
    badgeKey: "orders",
    children: [
      { title: "Всі замовлення", url: "/orders" },
      { title: "Нове замовлення", url: "/orders/new" },
    ],
  },
  { title: "Клієнти", url: "/clients", icon: Users },
  { title: "Повідомлення", url: "/messages", icon: MessageCircle, badgeKey: "messages" },
];

const ANALYTICS_NAV: NavItem[] = [
  { title: "Аналітика", url: "/analytics", icon: BarChart3 },
  { title: "Відвідувачі", url: "/visitors", icon: Globe },
];

const CATALOG_NAV: NavItem[] = [
  {
    title: "Каталог",
    url: "/catalog",
    icon: Tag,
    children: [
      { title: "Товари", url: "/catalog?tab=products" },
      { title: "Категорії", url: "/catalog?tab=categories" },
      { title: "Кольори та матеріали", url: "/catalog?tab=colors" },
      { title: "Розмірна сітка", url: "/catalog?tab=sizes" },
    ],
  },
  {
    title: "Принти",
    url: "/prints",
    icon: ImagePlus,
    children: [
      { title: "Бібліотека принтів", url: "/prints?tab=prints" },
      { title: "Технології друку", url: "/prints?tab=types" },
      { title: "Формати друку", url: "/prints?tab=sizes" },
    ],
  },
  {
    title: "Склад",
    url: "/warehouse",
    icon: ShelvingUnit,
    children: [
      { title: "Залишки", url: "/warehouse?tab=stock" },
      { title: "Постачання", url: "/warehouse?tab=receipts" },
      { title: "Виробництво", url: "/warehouse?tab=production" },
      { title: "Акти пошиття", url: "/warehouse?tab=acts" },
      { title: "Переміщення", url: "/warehouse?tab=transfers" },
    ],
  },
  {
    title: "ERP",
    url: "/erp",
    icon: Boxes,
  },
];

const SYSTEM_NAV: NavItem[] = [
  {
    title: "Контент (CMS)",
    url: "/cms",
    icon: FileEdit,
    children: [
      { title: "Сторінки", url: "/cms" },
      { title: "Умови та правила", url: "/cms/terms" },
      { title: "Конфіденційність", url: "/cms/privacy" },
    ],
  },
  {
    title: "Користувачі",
    url: "/users",
    icon: UserCog,
    children: [
      { title: "Всі", url: "/users?role=all" },
      { title: "Адміни", url: "/users?role=admin" },
      { title: "Менеджери", url: "/users?role=manager" },
      { title: "Швеї", url: "/users?role=sewer" },
    ],
  },
  {
    title: "Налаштування",
    url: "/settings",
    icon: Settings,
    children: [
      { title: "Профіль", url: "/settings?tab=profile" },
      { title: "Безпека", url: "/settings?tab=security" },
      { title: "Сповіщення", url: "/settings?tab=notifications" },
      { title: "Система", url: "/settings?tab=system" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  user: { name: string; email: string; avatar: string; role?: string };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;
  const supabase = React.useMemo(() => createClient(), []);
  const [badges, setBadges] = React.useState({ orders: 0, messages: 0 });
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [pendingUrl, setPendingUrl] = React.useState<string | null>(null);
  const role = (user.role || "manager") as AdminRole;
  const isSeamstress = role === "seamstress" || role === "sewer";

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    "/orders": pathname.startsWith("/orders"),
    "/catalog": pathname.startsWith("/catalog"),
    "/prints": pathname.startsWith("/prints"),
    "/warehouse": pathname.startsWith("/warehouse"),
    "/cms": pathname.startsWith("/cms"),
    "/settings": pathname.startsWith("/settings"),
    "/users": pathname.startsWith("/users"),
  });

  React.useEffect(() => {
    if (pathname.startsWith("/messages")) setUnreadMessages(0);
  }, [pathname]);

  React.useEffect(() => {
    let mounted = true;
    const fetchBadges = async () => {
      try {
        const res = await fetch("/api/dashboard/badges");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setBadges({ orders: Number(data?.orders || 0), messages: Number(data?.messages || 0) });
      } catch { /* noop */ }
    };

    fetchBadges();

    const channel = supabase
      .channel("admin-sidebar-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, fetchBadges)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {
        if (localStorage.getItem("notif_enabled") !== "false") {
          router.push("/orders");
        }
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: { sender?: string; sender_email?: string; body?: string; lead_id?: string } }) => {
          const msg = payload.new;
          if (msg.sender !== "client") return;
          playNotificationTone();
          if (!window.location.pathname.startsWith("/messages")) setUnreadMessages((n) => n + 1);
          if (localStorage.getItem("notif_enabled") !== "false") {
            toast.info(msg.sender_email || "Client", {
              description: msg.body || "New message",
              action: { label: "Open", onClick: () => router.push(`/messages?leadId=${msg.lead_id || ""}`) },
            });
          }
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [supabase, router]);

  const handleNavClick = (url: string, isActive: boolean) => {
    if (isMobile) setOpenMobile(false);
    const hasDraft = typeof sessionStorage !== "undefined" && !!sessionStorage.getItem("new-order-draft");
    if (hasDraft && !isActive) {
      setPendingUrl(url);
      return false;
    }
    return true;
  };

  const handleConfirmLeave = () => {
    if (pendingUrl) {
      sessionStorage.removeItem("new-order-draft");
      router.push(pendingUrl);
    }
    setPendingUrl(null);
  };

  const renderSimpleItem = (item: NavItem) => {
    const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
    const count = item.badgeKey === "messages" ? unreadMessages : item.badgeKey === "orders" ? badges.orders : 0;
    const suppress =
      (item.badgeKey === "messages" && pathname.startsWith("/messages")) ||
      (item.badgeKey === "orders" && pathname.startsWith("/orders"));
    const showBadge = !!item.badgeKey && count > 0 && !suppress;

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          render={<Link href={item.url} />}
          isActive={isActive}
          tooltip={item.title}
          aria-current={isActive ? "page" : undefined}
          onClick={(e) => {
            const ok = handleNavClick(item.url, isActive);
            if (!ok) e.preventDefault();
          }}
          className="h-8 gap-2.5 px-2.5 text-[13px] transition-colors group-data-[collapsible=icon]:mx-auto rounded-lg"
        >
          <item.icon
            className={`size-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/70"}`}
          />
          <span
            className={`truncate ${isActive ? "font-medium text-foreground" : "text-muted-foreground"} group-data-[collapsible=icon]:hidden`}
          >
            {item.title}
          </span>
        </SidebarMenuButton>
        {showBadge && (
          <SidebarMenuBadge className="bg-primary text-primary-foreground rounded-full text-[9px] font-bold min-w-[1.125rem] h-[1.125rem] flex items-center justify-center border border-sidebar">
            {count > 99 ? "99+" : count}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  };

  const renderCollapsibleItem = (item: NavItem) => {
    const isGroupActive = pathname.startsWith(item.url);
    const isOpen = openGroups[item.url] ?? isGroupActive;
    const firstChildUrl = item.children?.[0]?.url ?? item.url;

    return (
      <Collapsible
        key={item.title}
        open={isOpen}
        onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [item.url]: open }))}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isGroupActive}
            aria-current={isGroupActive ? "page" : undefined}
            aria-expanded={isOpen}
            onClick={(e) => {
              if (isGroupActive) {
                setOpenGroups((prev) => ({ ...prev, [item.url]: !prev[item.url] }));
                return;
              }
              const ok = handleNavClick(firstChildUrl, isGroupActive);
              if (!ok) {
                e.preventDefault();
                return;
              }
              setOpenGroups((prev) => ({ ...prev, [item.url]: true }));
              router.push(firstChildUrl);
            }}
            className="h-8 gap-2.5 px-2.5 text-[13px] transition-colors group-data-[collapsible=icon]:mx-auto rounded-lg"
          >
            <item.icon
              className={`size-4 shrink-0 transition-colors ${isGroupActive ? "text-primary" : "text-muted-foreground/70"}`}
            />
            <span
              className={`truncate ${isGroupActive ? "font-medium text-foreground" : "text-muted-foreground"} group-data-[collapsible=icon]:hidden`}
            >
              {item.title}
            </span>
            <ChevronRight
              className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground/40 group-data-[collapsible=icon]:hidden"
            />
          </SidebarMenuButton>
          <CollapsibleContent className="data-[state=closed]:animate-none">
            <SidebarMenuSub className="ml-5 mt-0.5 border-l border-border/50 pl-2 gap-0">
              {item.children?.map((child) => {
                let childActive = false;
                if (child.url.includes("?")) {
                  const [basePath, query] = child.url.split("?");
                  if (pathname === basePath) {
                    const paramName = query.split("=")[0];
                    const paramVal = query.split("=")[1];
                    const currentVal = searchParams.get(paramName) || item.children?.[0]?.url.split("?")[1].split("=")[1];
                    childActive = currentVal === paramVal;
                  }
                } else {
                  childActive = pathname === child.url || pathname.startsWith(child.url + "/");
                }
                return (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton
                      render={<Link href={child.url} />}
                      isActive={childActive}
                      onClick={(e) => {
                        const ok = handleNavClick(child.url, childActive);
                        if (!ok) e.preventDefault();
                      }}
                      className={`h-7 py-1 text-[12px] rounded-md transition-colors ${
                        childActive
                          ? "font-medium text-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {child.title}
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar">
        {/* Brand header */}
        <SidebarHeader className="px-3 py-3 border-b border-border/40">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/" />}
                className="h-9 gap-2.5 px-2 rounded-lg hover:bg-sidebar-accent"
              >
                <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                  <BrandLogo className="size-3.5" />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold tracking-tight">U:DO Craft</span>
                  <span className="truncate text-[10px] text-muted-foreground">Admin</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2 gap-1 group-data-[collapsible=icon]:px-1.5">
          {/* Quick search */}
          <SidebarGroup className="p-0 mb-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <CommandMenu
                  trigger={
                    <SidebarMenuButton
                      tooltip="Швидкий пошук (⌘K)"
                      className="h-8 gap-2 border border-border/60 bg-background/60 px-2.5 hover:bg-muted/80 rounded-lg group-data-[collapsible=icon]:mx-auto"
                    >
                      <Search className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                        Пошук...
                      </span>
                      {!isCollapsed && (
                        <kbd className="ml-auto pointer-events-none hidden h-4 select-none items-center rounded border bg-background/80 px-1 font-mono text-[9px] font-semibold opacity-60 md:flex">
                          ⌘K
                        </kbd>
                      )}
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* CRM & Sales */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-0.5">
              CRM
            </SidebarGroupLabel>
            <SidebarMenu className="gap-px">
              {(isSeamstress ? CRM_NAV.filter((item) => item.url !== "/clients") : CRM_NAV).map((item) =>
                item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)
              )}
            </SidebarMenu>
          </SidebarGroup>

          {/* Analytics */}
          {!isSeamstress && (
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-0.5">
                Аналітика
              </SidebarGroupLabel>
              <SidebarMenu className="gap-px">
                {ANALYTICS_NAV.map(renderSimpleItem)}
              </SidebarMenu>
            </SidebarGroup>
          )}

          {/* Catalog & Production */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-0.5">
              Виробництво
            </SidebarGroupLabel>
            <SidebarMenu className="gap-px">
              {(isSeamstress ? CATALOG_NAV.filter((item) => item.url === "/warehouse") : CATALOG_NAV).map((item) =>
                item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)
              )}
            </SidebarMenu>
          </SidebarGroup>

          {/* System */}
          {!isSeamstress && (
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-0.5">
                Система
              </SidebarGroupLabel>
              <SidebarMenu className="gap-px">
                {SYSTEM_NAV.map((item) =>
                  item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)
                )}
              </SidebarMenu>
            </SidebarGroup>
          )}

          {/* Quick new order shortcut */}
          {!isCollapsed && !isSeamstress && (
            <div className="mt-auto pt-2 px-1">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full h-8 gap-2 text-xs border-dashed text-muted-foreground hover:text-primary hover:border-primary/40 rounded-lg"
              >
                <Link href="/orders/new">
                  <Plus className="size-3.5" />
                  Нове замовлення
                </Link>
              </Button>
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-border/40 px-2 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <NavUser user={user} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <AlertDialog open={!!pendingUrl} onOpenChange={(open) => { if (!open) setPendingUrl(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Покинути сторінку?</AlertDialogTitle>
            <AlertDialogDescription>
              У вас є незбережене замовлення. Якщо ви покинете сторінку, всі зміни буде втрачено.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Залишитись</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Покинути
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
