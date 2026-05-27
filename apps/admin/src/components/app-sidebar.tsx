"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart2, Users, MessageCircleHeart, ShoppingBag, ImagePlus,
  Settings, ChevronRight, UserCog, ShelvingUnit,
  FileEdit, Globe, Search, Tag,
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
  SidebarTrigger,
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

const SALES_NAV: NavItem[] = [
  { title: "Замовлення",   url: "/orders",    icon: ShoppingBag,    badgeKey: "orders" },
  { title: "Клієнти",      url: "/clients",   icon: Users },
  { title: "Повідомлення", url: "/messages",  icon: MessageCircleHeart, badgeKey: "messages" },
];

const INVENTORY_NAV: NavItem[] = [
  { title: "Склад CRM-ERP", url: "/warehouse", icon: ShelvingUnit },
  {
    title: "Каталог",
    url: "/catalog",
    icon: Tag,
    children: [
      { title: "Всі товари",          url: "/catalog?tab=products" },
      { title: "Категорії",           url: "/catalog?tab=categories" },
      { title: "Кольори та матеріали", url: "/catalog?tab=colors" },
      { title: "Розмірна сітка",      url: "/catalog?tab=sizes" },
    ],
  },
  {
    title: "Принти",
    url: "/prints",
    icon: ImagePlus,
    children: [
      { title: "Бібліотека принтів", url: "/prints?tab=prints" },
      { title: "Технології друку",    url: "/prints?tab=types" },
      { title: "Формати друку",      url: "/prints?tab=sizes" },
    ],
  },
];

const INSIGHTS_NAV: NavItem[] = [
  { title: "Аналітика",    url: "/analytics", icon: BarChart2 },
  { title: "Відвідувачі",  url: "/visitors",  icon: Globe },
];

const SYSTEM_NAV: NavItem[] = [
  {
    title: "Контент (CMS)",
    url: "/cms",
    icon: FileEdit,
    children: [
      { title: "Сторінки",        url: "/cms" },
      { title: "Умови та правила", url: "/cms/terms" },
      { title: "Конфіденційність", url: "/cms/privacy" },
    ],
  },
  {
    title: "Користувачі",
    url: "/users",
    icon: UserCog,
    children: [
      { title: "Всі",        url: "/users?role=all" },
      { title: "Адміни",     url: "/users?role=admin" },
      { title: "Менеджери",  url: "/users?role=manager" },
      { title: "Швеї",       url: "/users?role=sewer" },
      { title: "Перегляд",   url: "/users?role=viewer" },
    ],
  },
  {
    title: "Налаштування",
    url: "/settings",
    icon: Settings,
    children: [
      { title: "Профіль",     url: "/settings?tab=profile" },
      { title: "Безпека",     url: "/settings?tab=security" },
      { title: "Сповіщення",  url: "/settings?tab=notifications" },
      { title: "Система",     url: "/settings?tab=system" },
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

  // Track which collapsibles are open
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    "/catalog": pathname.startsWith("/catalog"),
    "/prints": pathname.startsWith("/prints"),
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
          className="h-8 gap-2 px-2.5 py-1.5 text-[13px] transition-colors group-data-[collapsible=icon]:mx-auto"
        >
          <item.icon className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`${isActive ? "font-medium leading-none text-foreground" : "leading-none text-muted-foreground"} group-data-[collapsible=icon]:hidden`}>{item.title}</span>
        </SidebarMenuButton>
        {showBadge && (
          <SidebarMenuBadge className="bg-primary text-primary-foreground rounded-full text-[10px] font-bold px-1.5 min-w-[1.25rem] h-5 border-2 border-background">
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
              const ok = handleNavClick(firstChildUrl, isGroupActive);
              if (!ok) {
                e.preventDefault();
                return;
              }
              setOpenGroups((prev) => ({ ...prev, [item.url]: true }));
              router.push(firstChildUrl);
            }}
            className="h-8 gap-2 px-2.5 py-1.5 text-[13px] transition-colors group-data-[collapsible=icon]:mx-auto"
        >
          <item.icon className={`transition-colors ${isGroupActive ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`${isGroupActive ? "font-medium leading-none text-foreground" : "leading-none text-muted-foreground"} group-data-[collapsible=icon]:hidden`}>{item.title}</span>
            <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
          <CollapsibleContent className="data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
            <SidebarMenuSub className="ml-4 mt-0.5 space-y-0 border-l border-border pl-2">
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
                      className={`h-6 py-1 text-[11px] transition-colors ${childActive ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}
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
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className="h-14 flex items-center px-3 border-b border-border bg-white">
        <div className={`flex items-center w-full ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {!isCollapsed && (
            <Link
              href="/"
              className="flex items-center rounded-md transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="U:DO CRAFT"
            >
              <BrandLogo className="h-6 w-auto" />
            </Link>
          )}
          <SidebarTrigger className="-mr-1" />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        {/* Search */}
        <SidebarGroup className="p-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <CommandMenu
                trigger={
                  <SidebarMenuButton tooltip="Швидкий пошук (⌘K)" className="group h-9 gap-2 border border-border bg-white px-2.5 py-1.5 hover:bg-muted group-data-[collapsible=icon]:mx-auto">
                    <Search className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">Швидкий пошук...</span>
                    {!isCollapsed && (
                      <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[9px] font-bold opacity-70 md:flex">
                        <span className="text-[10px]">⌘</span>K
                      </kbd>
                    )}
                  </SidebarMenuButton>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Sales */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="mb-1 h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">Продажі та CRM</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {(isSeamstress ? SALES_NAV.filter((item) => item.url !== "/clients") : SALES_NAV).map(renderSimpleItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Inventory */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="mb-1 h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">Інвентар</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {(isSeamstress ? INVENTORY_NAV.filter((item) => item.url === "/warehouse") : INVENTORY_NAV).map((item) =>
              item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Insights */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="mb-1 h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">Аналітика</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {!isSeamstress && INSIGHTS_NAV.map(renderSimpleItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="mb-1 h-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">Керування</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {!isSeamstress && SYSTEM_NAV.map((item) =>
              item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-white p-2">
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
          <AlertDialogAction onClick={handleConfirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Покинути
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
