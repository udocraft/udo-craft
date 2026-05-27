import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listUserRoles } from "@/lib/authz/memberships";

type SearchResult = {
  id: string;
  type: "order" | "client" | "product" | "category" | "user" | "page";
  title: string;
  subtitle?: string;
  url: string;
  actionLabel?: string;
};

const PAGE_RESULTS: SearchResult[] = [
  { id: "page:orders", type: "page", title: "Замовлення", subtitle: "Канбан виробництва", url: "/orders", actionLabel: "Відкрити" },
  { id: "page:new-order", type: "page", title: "Нове замовлення", subtitle: "Створити замовлення вручну", url: "/orders/new", actionLabel: "Створити" },
  { id: "page:clients", type: "page", title: "Клієнти", subtitle: "CRM база", url: "/clients", actionLabel: "Відкрити" },
  { id: "page:messages", type: "page", title: "Повідомлення", subtitle: "Чати з клієнтами", url: "/messages", actionLabel: "Відкрити" },
  { id: "page:catalog", type: "page", title: "Каталог", subtitle: "Товари, категорії, кольори", url: "/catalog", actionLabel: "Відкрити" },
  { id: "page:prints", type: "page", title: "Принти та друк", subtitle: "Бібліотека і тарифи", url: "/prints", actionLabel: "Відкрити" },
  { id: "page:analytics", type: "page", title: "Аналітика", subtitle: "Звіти і метрики", url: "/analytics", actionLabel: "Відкрити" },
  { id: "page:users", type: "page", title: "Користувачі", subtitle: "Адмін-доступи", url: "/users", actionLabel: "Відкрити" },
  { id: "page:settings", type: "page", title: "Налаштування", subtitle: "Профіль і система", url: "/settings", actionLabel: "Відкрити" },
  { id: "page:cms", type: "page", title: "CMS", subtitle: "Контент сайту", url: "/cms", actionLabel: "Відкрити" },
];

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function haystack(...values: unknown[]) {
  return values
    .filter((value) => value !== null && value !== undefined)
    .map(String)
    .join(" ")
    .toLowerCase();
}

function matches(query: string, ...values: unknown[]) {
  if (!query) return true;
  return haystack(...values).includes(query);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = (new URL(request.url).searchParams.get("q") || "").trim().toLowerCase();
  const service = createServiceClient();

  const [leadsRes, productsRes, categoriesRes, usersRes] = await Promise.all([
    service.from("leads").select("id,status,customer_data,total_amount_cents,created_at").order("created_at", { ascending: false }).limit(80),
    service.from("products").select("id,name,slug,is_active").order("created_at", { ascending: false }).limit(80),
    service.from("categories").select("id,name,slug,is_active").order("sort_order", { ascending: true }).limit(80),
    service.auth.admin.listUsers({ perPage: 80 }),
  ]);

  if (leadsRes.error) return NextResponse.json({ error: leadsRes.error.message }, { status: 500 });
  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
  if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });
  if (usersRes.error) return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
  const rolesByUser = await listUserRoles(usersRes.data.users.map((adminUser) => adminUser.id));

  const leads = leadsRes.data || [];
  const orderResults: SearchResult[] = leads
    .filter((lead) => {
      const customer = lead.customer_data as Record<string, unknown> | null;
      return matches(query, lead.id, shortId(lead.id), lead.status, customer?.name, customer?.email, customer?.phone, customer?.company);
    })
    .slice(0, 8)
    .map((lead) => {
      const customer = (lead.customer_data || {}) as Record<string, string>;
      return {
        id: `order:${lead.id}`,
        type: "order",
        title: `#${shortId(lead.id)} · ${customer.name || "Без імені"}`,
        subtitle: [customer.company, customer.email, lead.status].filter(Boolean).join(" · "),
        url: `/orders?leadId=${lead.id}`,
        actionLabel: "Відкрити",
      };
    });

  const clientMap = new Map<string, SearchResult>();
  for (const lead of leads) {
    const customer = (lead.customer_data || {}) as Record<string, string>;
    const key = customer.email || customer.phone || customer.name || lead.id;
    if (!matches(query, customer.name, customer.email, customer.phone, customer.company)) continue;
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        id: `client:${key}`,
        type: "client",
        title: customer.name || customer.company || "Клієнт",
        subtitle: [customer.company, customer.email || customer.phone].filter(Boolean).join(" · "),
        url: `/clients?search=${encodeURIComponent(customer.email || customer.phone || customer.name || "")}`,
        actionLabel: "Переглянути",
      });
    }
  }

  const productResults: SearchResult[] = (productsRes.data || [])
    .filter((product) => matches(query, product.id, product.name, product.slug))
    .slice(0, 6)
    .map((product) => ({
      id: `product:${product.id}`,
      type: "product",
      title: product.name,
      subtitle: [product.slug, product.is_active ? "Активний" : "Неактивний"].filter(Boolean).join(" · "),
      url: `/products/${product.id}`,
      actionLabel: "Редагувати",
    }));

  const categoryResults: SearchResult[] = (categoriesRes.data || [])
    .filter((category) => matches(query, category.id, category.name, category.slug))
    .slice(0, 5)
    .map((category) => ({
      id: `category:${category.id}`,
      type: "category",
      title: category.name,
      subtitle: category.is_active ? "Активна категорія" : "Неактивна категорія",
      url: "/catalog?tab=categories",
      actionLabel: "До категорій",
    }));

  const userResults: SearchResult[] = usersRes.data.users
    .filter((adminUser) => matches(query, adminUser.email, adminUser.user_metadata?.full_name, rolesByUser.get(adminUser.id)))
    .slice(0, 6)
    .map((adminUser) => ({
      id: `user:${adminUser.id}`,
      type: "user",
      title: adminUser.user_metadata?.full_name || adminUser.email || "Користувач",
      subtitle: [adminUser.email, rolesByUser.get(adminUser.id) || "client"].filter(Boolean).join(" · "),
      url: "/users",
      actionLabel: "Керувати",
    }));

  const pageResults = PAGE_RESULTS
    .filter((page) => matches(query, page.title, page.subtitle))
    .slice(0, query ? 5 : 10);

  return NextResponse.json({
    results: [...orderResults, ...clientMap.values()].slice(0, 12).concat(productResults, categoryResults, userResults, pageResults).slice(0, 30),
  });
}
