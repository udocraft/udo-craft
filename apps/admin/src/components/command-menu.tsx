"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Clock,
  CornerDownLeft,
  FileEdit,
  FolderTree,
  Globe,
  Hash,
  ImagePlus,
  Loader2,
  MessageCircle,
  PackageSearch,
  Plus,
  Search,
  Settings,
  ShelvingUnit,
  ShoppingBag,
  Tag,
  User,
  UserCog,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CommandMenuProps {
  trigger?: React.ReactNode;
}

type ResultType = "order" | "client" | "product" | "category" | "user" | "page";

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  url: string;
  actionLabel?: string;
};

type LocalCommand = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ElementType;
  keywords?: string;
};

const TYPE_META: Record<ResultType, { label: string; icon: React.ElementType; tile: string }> = {
  order: { label: "Замовлення", icon: Hash, tile: "bg-blue-50 text-blue-700" },
  client: { label: "Клієнти", icon: User, tile: "bg-emerald-50 text-emerald-700" },
  product: { label: "Товари", icon: PackageSearch, tile: "bg-violet-50 text-violet-700" },
  category: { label: "Категорії", icon: FolderTree, tile: "bg-amber-50 text-amber-700" },
  user: { label: "Користувачі", icon: UserCog, tile: "bg-slate-100 text-slate-700" },
  page: { label: "Сторінки", icon: ArrowRight, tile: "bg-muted text-muted-foreground" },
};

const SERVER_GROUPS: ResultType[] = ["order", "client", "product", "category", "user"];

const ACTIONS: LocalCommand[] = [
  { id: "act:new-order", title: "Створити замовлення", subtitle: "Відкрити редактор нового замовлення", url: "/orders/new", icon: Plus, keywords: "нове new order додати" },
];

const PAGES: LocalCommand[] = [
  { id: "nav:orders", title: "Замовлення", subtitle: "Канбан і список", url: "/orders", icon: ShoppingBag, keywords: "orders ліди leads" },
  { id: "nav:clients", title: "Клієнти", subtitle: "CRM база", url: "/clients", icon: Users, keywords: "clients crm" },
  { id: "nav:messages", title: "Повідомлення", subtitle: "Чати з клієнтами", url: "/messages", icon: MessageCircle, keywords: "messages chat чат" },
  { id: "nav:analytics", title: "Аналітика", subtitle: "Звіти і метрики", url: "/analytics", icon: BarChart3, keywords: "analytics звіти" },
  { id: "nav:visitors", title: "Відвідувачі", subtitle: "Поведінка на сайті", url: "/visitors", icon: Globe, keywords: "visitors трафік" },
  { id: "nav:catalog", title: "Каталог", subtitle: "Товари, категорії, кольори", url: "/catalog?tab=products", icon: Tag, keywords: "catalog products товари" },
  { id: "nav:prints", title: "Принти", subtitle: "Бібліотека і технології друку", url: "/prints?tab=prints", icon: ImagePlus, keywords: "prints друк" },
  { id: "nav:prices", title: "Ціни", subtitle: "Ціни друку і знижки за кількість", url: "/prices", icon: BadgeDollarSign, keywords: "prices ціни тарифи знижки" },
  { id: "nav:stock", title: "Склад", subtitle: "Залишки, постачання, виробництво", url: "/erp/stock", icon: ShelvingUnit, keywords: "erp warehouse склад залишки" },
  { id: "nav:cms", title: "Контент (CMS)", subtitle: "Сторінки сайту", url: "/cms", icon: FileEdit, keywords: "cms content контент" },
  { id: "nav:users", title: "Користувачі", subtitle: "Доступи команди", url: "/users", icon: UserCog, keywords: "users admin доступ" },
  { id: "nav:settings", title: "Налаштування", subtitle: "Профіль і система", url: "/settings", icon: Settings, keywords: "settings профіль" },
];

const RECENT_KEY = "admin-cmd-recent";
const RECENT_MAX = 5;
const MIN_QUERY = 2;

function loadRecent(): SearchResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function matchesLocal(cmd: LocalCommand, q: string) {
  return `${cmd.title} ${cmd.subtitle ?? ""} ${cmd.keywords ?? ""}`.toLowerCase().includes(q);
}

export function CommandMenu({ trigger }: CommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recent, setRecent] = React.useState<SearchResult[]>([]);
  const router = useRouter();

  const q = query.trim().replace(/^#/, "").toLowerCase();
  const searching = q.length >= MIN_QUERY;

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (open) setRecent(loadRecent());
    else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Server search only for real queries — opening the palette costs nothing.
  React.useEffect(() => {
    if (!open || !searching) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results.filter((r: SearchResult) => r.type !== "page") : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, q, searching]);

  const go = React.useCallback(
    (url: string, remember?: SearchResult) => {
      if (remember) {
        const next = [remember, ...loadRecent().filter((r) => r.id !== remember.id)].slice(0, RECENT_MAX);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
      }
      setOpen(false);
      router.push(url);
    },
    [router],
  );

  const grouped = React.useMemo(() => {
    const map = {} as Record<ResultType, SearchResult[]>;
    for (const r of results) (map[r.type] ||= []).push(r);
    return map;
  }, [results]);

  const actions = q ? ACTIONS.filter((c) => matchesLocal(c, q)) : ACTIONS;
  const pages = q ? PAGES.filter((c) => matchesLocal(c, q)) : PAGES;
  const total = actions.length + pages.length + results.length + (q ? 0 : recent.length);

  const renderLocal = (cmd: LocalCommand) => (
    <PaletteItem
      key={cmd.id}
      value={cmd.id}
      icon={cmd.icon}
      tile="bg-muted text-foreground"
      title={cmd.title}
      subtitle={cmd.subtitle}
      onSelect={() => go(cmd.url)}
    />
  );

  const renderResult = (item: SearchResult, icon?: React.ElementType) => {
    const meta = TYPE_META[item.type] ?? TYPE_META.page;
    return (
      <PaletteItem
        key={item.id}
        value={`${item.type}:${item.id}`}
        icon={icon ?? meta.icon}
        tile={meta.tile}
        title={item.title}
        subtitle={item.subtitle}
        hint={item.actionLabel}
        onSelect={() => go(item.url, item)}
      />
    );
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="w-full">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="size-4" />
          <span className="hidden md:inline-block">Пошук…</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center rounded border bg-background px-1.5 font-mono text-[11px] font-medium md:inline-flex">⌘K</kbd>
        </button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        title="Пошук і команди"
        description="Знайдіть замовлення, клієнта, товар або перейдіть до розділу"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Пошук замовлень, клієнтів, товарів…"
          aria-label="Пошук"
          trailing={
            loading ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Шукаємо" />
            ) : (
              <kbd className="hidden h-6 shrink-0 select-none items-center rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground sm:inline-flex">
                Esc
              </kbd>
            )
          }
        />

        <CommandList className="max-h-[min(60vh,440px)] px-2 pb-2">
          {total === 0 && !loading && (
            <CommandEmpty className="py-12">
              <p className="text-sm font-medium text-foreground">Нічого не знайдено за «{query.trim()}»</p>
              <p className="mt-1 text-xs text-muted-foreground">Спробуйте номер замовлення, email, телефон або назву товару.</p>
            </CommandEmpty>
          )}

          {!q && recent.length > 0 && (
            <CommandGroup heading="Нещодавні">{recent.map((r) => renderResult(r, Clock))}</CommandGroup>
          )}

          {SERVER_GROUPS.map((type) =>
            grouped[type]?.length ? (
              <CommandGroup key={type} heading={TYPE_META[type].label}>
                {grouped[type].slice(0, 6).map((r) => renderResult(r))}
              </CommandGroup>
            ) : null,
          )}

          {searching && loading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground" aria-live="polite">Шукаємо в базі…</div>
          )}

          {actions.length > 0 && <CommandGroup heading="Дії">{actions.map(renderLocal)}</CommandGroup>}
          {pages.length > 0 && <CommandGroup heading="Перейти до">{pages.map(renderLocal)}</CommandGroup>}
        </CommandList>

        <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> навігація</span>
          <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft className="size-3" /></Kbd> відкрити</span>
          <span className="hidden items-center gap-1.5 sm:flex"><Kbd>Esc</Kbd> закрити</span>
          {!searching && q.length > 0 && <span className="ml-auto">Ще {MIN_QUERY - q.length} символ для пошуку в базі</span>}
        </div>
      </CommandDialog>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-background px-1 font-mono text-[11px] text-muted-foreground">
      {children}
    </kbd>
  );
}

function PaletteItem({
  value,
  icon: Icon,
  tile,
  title,
  subtitle,
  hint,
  onSelect,
}: {
  value: string;
  icon: React.ElementType;
  tile: string;
  title: string;
  subtitle?: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect} className="group min-h-12 gap-3 rounded-lg! px-2 py-2">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tile)}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <span
        data-slot="command-shortcut"
        className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100"
      >
        {hint ?? "Відкрити"}
        <CornerDownLeft className="size-3.5" />
      </span>
    </CommandItem>
  );
}
