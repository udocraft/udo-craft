"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3, Users, MessageCircle, ShoppingBag, ImagePlus,
  Settings, ChevronRight, UserCog, ShelvingUnit,
  FileEdit, Globe, Search, Tag, Plus, BadgeDollarSign, ChevronDown,
} from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
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
} from "@udo-craft/ui";
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
  /** Extra path prefixes that mark this group as active. */
  match?: string[];
  children?: NavSubItem[];
}

type AdminRole = "admin" | "manager" | "viewer" | "seamstress" | "sewer";

const CRM_NAV: NavItem[] = [
  { title: "Замовлення", url: "/orders", icon: ShoppingBag, badgeKey: "orders" },
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
      { title: "Бібліотека", url: "/prints?tab=prints" },
      { title: "Типи друку", url: "/prints?tab=types" },
    ],
  },
  { title: "Ціни", url: "/prices", icon: BadgeDollarSign },
  {
    title: "Склад",
    url: "/erp",
    match: ["/erp", "/warehouse"],
    icon: ShelvingUnit,
    children: [
      { title: "Залишки", url: "/erp/stock" },
      { title: "Постачання", url: "/erp/receipts" },
      { title: "Виробництво", url: "/erp/production" },
      { title: "Акти пошиття", url: "/erp/acts" },
      { title: "Переміщення", url: "/erp/transfers" },
    ],
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
    "/catalog": pathname.startsWith("/catalog"),
    "/prints": pathname.startsWith("/prints"),
    "/erp": pathname.startsWith("/erp") || pathname.startsWith("/warehouse"),
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

  const itemH = isMobile ? "h-11" : "h-9";

  const renderSection = (label: string, items: NavItem[]) => (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="h-8 px-3 text-xs font-medium text-muted-foreground">{label}</SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => (item.children ? renderCollapsibleItem(item) : renderSimpleItem(item)))}
      </SidebarMenu>
    </SidebarGroup>
  );

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
          className={cn(itemH, "gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground data-active:text-sidebar-foreground")}
        >
          <item.icon className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
          <span>{item.title}</span>
        </SidebarMenuButton>
        {showBadge && (
          <SidebarMenuBadge
            aria-label={`${count} нових`}
            className="top-1/2! right-2 h-5 min-w-5 -translate-y-1/2 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground"
          >
            {count > 99 ? "99+" : count}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  };

  const renderCollapsibleItem = (item: NavItem) => {
    const isGroupActive = (item.match ?? [item.url]).some((prefix) => pathname.startsWith(prefix));
    const isOpen = openGroups[item.url] ?? isGroupActive;

    if (isCollapsed) {
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            render={<Link href={item.url} />}
            isActive={isGroupActive}
            tooltip={item.title}
            onClick={(e) => { if (!handleNavClick(item.url, isGroupActive)) e.preventDefault(); }}
          >
            <item.icon className={isGroupActive ? "text-primary" : "text-muted-foreground"} />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

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
            isActive={isGroupActive && !isOpen}
            aria-expanded={isOpen}
            onClick={() =>
              setOpenGroups((prev) => ({ ...prev, [item.url]: !(prev[item.url] ?? isGroupActive) }))
            }
            className={cn(itemH, "gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground data-active:text-sidebar-foreground", isGroupActive && "font-medium text-sidebar-foreground")}
          >
            <item.icon className={cn("transition-colors", isGroupActive ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 truncate">{item.title}</span>
            <ChevronRight
              aria-hidden="true"
              className={cn("ml-auto size-4! text-muted-foreground transition-transform duration-200", isOpen && "rotate-90")}
            />
          </SidebarMenuButton>
          <CollapsibleContent className="data-[state=closed]:animate-none">
            <SidebarMenuSub className="mx-0 ml-5 mt-0.5 gap-0.5 border-l border-sidebar-border py-0.5 pl-2 pr-0">
              {item.children?.map((child) => {
                let childActive = false;
                if (child.url.includes("?")) {
                  const [basePath, query] = child.url.split("?");
                  if (pathname === basePath) {
                    const paramName = query.split("=")[0];
                    const paramVal = query.split("=")[1];
                    const currentVal = searchParams.get(paramName) || item.children?.[0]?.url.split("?")[1]?.split("=")[1];
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
                      aria-current={childActive ? "page" : undefined}
                      onClick={(e) => {
                        const ok = handleNavClick(child.url, childActive);
                        if (!ok) e.preventDefault();
                      }}
                      className={cn(
                        isMobile ? "h-10" : "h-8",
                        "rounded-lg px-3 text-sm transition-colors",
                        childActive
                          ? "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary data-active:bg-primary/10 data-active:text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
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
        {/* Brand header: U:DO mark + Admin label */}
        {/* Brand header: logo + Admin label and the collapse button. Collapsed, the logo
            gives way to the open button. */}
        <SidebarHeader className="h-16 shrink-0 flex-row items-center justify-between gap-2 border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <Link
            href="/"
            aria-label="U:DO Admin — на головну"
            className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg px-2 outline-hidden ring-sidebar-ring focus-visible:ring-2 group-data-[collapsible=icon]:hidden"
          >
            <BrandLogoFull className="h-5 w-auto shrink-0 text-primary" color="var(--color-primary)" />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Admin
            </span>
          </Link>
          <SidebarTrigger className="size-9 min-h-0 min-w-0 shrink-0 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" />
        </SidebarHeader>

        <SidebarContent id="admin-sidebar-nav" role="navigation" aria-label="Основна навігація" className="gap-4 px-3 py-3 group-data-[collapsible=icon]:px-2.5">
          {/* Primary action + search */}
          <SidebarGroup className="gap-2 p-0">
            {!isSeamstress && (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/orders/new" />}
                    tooltip="Нове замовлення"
                    onClick={(e) => { if (!handleNavClick("/orders/new", pathname === "/orders/new")) e.preventDefault(); }}
                    className={cn(
                      itemH,
                      "justify-center gap-2 rounded-lg bg-primary px-3 font-medium text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground group-data-[collapsible=icon]:justify-center",
                    )}
                  >
                    <Plus />
                    <span className="group-data-[collapsible=icon]:hidden">Нове замовлення</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
            <SidebarMenu>
              <SidebarMenuItem>
                <CommandMenu
                  trigger={
                    <SidebarMenuButton
                      tooltip="Пошук (⌘K)"
                      variant="outline"
                      aria-keyshortcuts="Meta+K Control+K"
                      className={cn(itemH, "gap-3 rounded-lg px-3 text-muted-foreground hover:text-foreground")}
                    >
                      <Search />
                      <span className="flex-1 text-sm group-data-[collapsible=icon]:hidden">Пошук…</span>
                      {!isCollapsed && (
                        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground md:inline-flex">
                          ⌘K
                        </kbd>
                      )}
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {renderSection("CRM", isSeamstress ? CRM_NAV.filter((item) => item.url !== "/clients") : CRM_NAV)}
          {!isSeamstress && renderSection("Аналітика", ANALYTICS_NAV)}
          {renderSection("Виробництво", isSeamstress ? CATALOG_NAV.filter((item) => item.url === "/erp") : CATALOG_NAV)}
          {!isSeamstress && renderSection("Система", SYSTEM_NAV)}
        </SidebarContent>

        <SidebarFooter className="relative border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
          <SidebarScrollHint targetId="admin-sidebar-nav" />
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

/**
 * Small chevron above the sidebar footer while nav items are hidden below.
 * Fades out at the bottom; updates on scroll, resize and content changes.
 */
function SidebarScrollHint({ targetId }: { targetId: string }) {
  const [more, setMore] = React.useState(false);

  React.useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const update = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [targetId]);

  return (
    <div
      aria-hidden={!more}
      className={cn(
        "pointer-events-none absolute inset-x-0 -top-12 flex h-12 items-end justify-center bg-gradient-to-t from-sidebar to-transparent pb-1.5 transition-opacity duration-200",
        more ? "opacity-100" : "opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={more ? 0 : -1}
        onClick={() => {
          const el = document.getElementById(targetId);
          el?.scrollBy({ top: el.clientHeight * 0.7, behavior: "smooth" });
        }}
        aria-label="Прокрутити меню вниз"
        className={cn(
          "flex size-7 items-center justify-center rounded-full border border-sidebar-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground",
          more ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}
