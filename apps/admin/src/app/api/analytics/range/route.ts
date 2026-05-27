import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");

    if (!fromParam || !toParam) {
      return NextResponse.json({ error: "Missing from/to parameters" }, { status: 400 });
    }

    const from = new Date(fromParam);
    const to = new Date(toParam);
    const rangeMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - rangeMs);
    const prevTo = from;

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [
      { data: events },
      { data: prevEvents },
      { data: leads },
      { data: prevLeads },
      { data: messages },
      { data: items },
      { data: materials },
      { data: authUsers },
    ] = await Promise.all([
      supabase.from("site_events").select("event_type, session_id, visitor_id, created_at")
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      supabase.from("site_events").select("event_type, session_id, visitor_id, created_at")
        .gte("created_at", prevFrom.toISOString()).lt("created_at", prevTo.toISOString()),
      supabase.from("leads").select("id, status, total_amount_cents, customer_data, created_at")
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      supabase.from("leads").select("id, status, total_amount_cents, customer_data, created_at")
        .gte("created_at", prevFrom.toISOString()).lt("created_at", prevTo.toISOString()),
      supabase.from("messages").select("sender, lead_id, created_at")
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      supabase.from("order_items").select("id, quantity, lead_id, created_at")
        .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      supabase.from("erp_materials").select("id, unit_cost_cents, stock_quantity, reserved_quantity, reorder_point"),
      supabase.auth.admin.listUsers({ perPage: 200 }),
    ]);

    const ev = events || [];
    const pev = prevEvents || [];
    const lds = leads || [];
    const plds = prevLeads || [];
    const msgs = messages || [];
    const its = items || [];
    const mats = materials || [];
    const users = authUsers?.users || [];
    const { data: memberships } = await supabase
      .from("memberships")
      .select("user_id, roles(name)")
      .eq("status", "active")
      .in("user_id", users.map((user) => user.id));
    const rolesByUser = new Map(
      ((memberships || []) as Array<{ user_id: string; roles?: { name?: string } | null }>)
        .filter((membership) => membership.roles?.name)
        .map((membership) => [membership.user_id, membership.roles!.name!]),
    );
    const staffByRole = Array.from(rolesByUser.values()).reduce<Record<string, number>>((acc, role) => {
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    const externalAccounts = users.filter((user) => !rolesByUser.has(user.id));

    const sessions = new Set(ev.filter((e) => e.event_type === "session_start").map((e) => e.session_id)).size;
    const sessionsPrev = new Set(pev.filter((e) => e.event_type === "session_start").map((e) => e.session_id)).size;
    const uniqueVisitors = new Set(ev.map((e) => e.visitor_id)).size;
    const uniqueVisitorsPrev = new Set(pev.map((e) => e.visitor_id)).size;
    const pageViews = ev.filter((e) => e.event_type === "pageview").length;
    const pageViewsPrev = pev.filter((e) => e.event_type === "pageview").length;
    const formSubmissions = ev.filter((e) => e.event_type === "form_submit").length;
    const formSubmissionsPrev = pev.filter((e) => e.event_type === "form_submit").length;
    const customStarts = ev.filter((e) => e.event_type === "customize_start").length;
    const customCompletes = ev.filter((e) => e.event_type === "customize_complete").length;
    const conversionRate = sessions > 0 ? (formSubmissions / sessions) * 100 : 0;
    const conversionRatePrev = sessionsPrev > 0 ? (formSubmissionsPrev / sessionsPrev) * 100 : 0;
    const totalOrders = lds.length;
    const totalOrdersPrev = plds.length;
    const totalRevenue = lds.reduce((s, l) => s + (l.total_amount_cents || 0), 0);
    const totalRevenuePrev = plds.reduce((s, l) => s + (l.total_amount_cents || 0), 0);
    const completed = lds.filter((l) => l.status === "completed");
    const completedPrev = plds.filter((l) => l.status === "completed");
    const paidRevenue = completed.reduce((s, l) => s + (l.total_amount_cents || 0), 0);
    const paidRevenuePrev = completedPrev.reduce((s, l) => s + (l.total_amount_cents || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const avgOrderValuePrev = totalOrdersPrev > 0 ? Math.round(totalRevenuePrev / totalOrdersPrev) : 0;
    const itemsSold = its.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalClients = new Set(lds.map((l) => l.customer_data?.email).filter(Boolean)).size;
    const totalClientsPrev = new Set(plds.map((l: any) => l.customer_data?.email).filter(Boolean)).size;
    const clientEmails = new Set(lds.map((l) => String(l.customer_data?.email || "").toLowerCase()).filter(Boolean));
    const leadsById = new Map(lds.map((lead) => [lead.id, lead]));
    msgs
      .filter((message) => message.sender === "manager")
      .forEach((message) => {
        const email = String(leadsById.get(message.lead_id)?.customer_data?.email || "").toLowerCase();
        if (email) clientEmails.add(email);
      });
    const registeredProspects = externalAccounts.filter((user) => {
      const email = String(user.email || "").toLowerCase();
      return email && !clientEmails.has(email);
    }).length;
    const accountClients = externalAccounts.filter((user) => {
      const email = String(user.email || "").toLowerCase();
      return email && clientEmails.has(email);
    }).length;
    const anonymousVisitors = uniqueVisitors;
    const visitorToAccountRate = anonymousVisitors > 0 ? (externalAccounts.length / anonymousVisitors) * 100 : 0;
    const accountToClientRate = externalAccounts.length > 0 ? (accountClients / externalAccounts.length) * 100 : 0;
    const warehouseItems = mats.length;
    const warehouseStockValue = mats.reduce((s, m) => s + Number(m.stock_quantity || 0) * Number(m.unit_cost_cents || 0), 0);
    const warehouseReservedValue = mats.reduce((s, m) => s + Number(m.reserved_quantity || 0) * Number(m.unit_cost_cents || 0), 0);
    const warehouseLowStock = mats.filter((m) => Number(m.reorder_point || 0) > 0 && Number(m.stock_quantity || 0) <= Number(m.reorder_point || 0)).length;

    const dailyMap = new Map<string, { sessions: number; pageViews: number; forms: number; revenue: number }>();
    ev.forEach((e) => {
      const key = new Date(e.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
      if (!dailyMap.has(key)) dailyMap.set(key, { sessions: 0, pageViews: 0, forms: 0, revenue: 0 });
      const d = dailyMap.get(key)!;
      if (e.event_type === "session_start") d.sessions++;
      if (e.event_type === "pageview") d.pageViews++;
      if (e.event_type === "form_submit") d.forms++;
    });
    lds.forEach((l) => {
      const key = new Date(l.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
      if (!dailyMap.has(key)) dailyMap.set(key, { sessions: 0, pageViews: 0, forms: 0, revenue: 0 });
      dailyMap.get(key)!.revenue += (l.total_amount_cents || 0) / 100;
    });

    return NextResponse.json({
      sessions, sessionsPrev, uniqueVisitors, uniqueVisitorsPrev,
      pageViews, pageViewsPrev,
      pagesPerSession: sessions > 0 ? pageViews / sessions : 0,
      formSubmissions, formSubmissionsPrev,
      customizationStarts: customStarts, customizationCompletions: customCompletes,
      conversionRate, conversionRatePrev,
      totalOrders, totalOrdersPrev, totalRevenue, totalRevenuePrev,
      paidRevenue, paidRevenuePrev, avgOrderValue, avgOrderValuePrev,
      itemsSold, totalClients, totalClientsPrev,
      anonymousVisitors,
      registeredAccounts: externalAccounts.length,
      registeredProspects,
      accountClients,
      visitorToAccountRate,
      accountToClientRate,
      staffTotal: Object.values(staffByRole).reduce((sum, count) => sum + count, 0),
      staffByRole: {
        admins: staffByRole.admin || 0,
        managers: staffByRole.manager || 0,
        production: (staffByRole.seamstress || 0) + (staffByRole.sewer || 0),
      },
      completedOrders: completed.length, completedOrdersPrev: completedPrev.length,
      warehouseItems,
      warehouseStockValue,
      warehouseReservedValue,
      warehouseLowStock,
      dailyStats: Array.from(dailyMap.entries()).map(([date, s]) => ({ date, ...s })),
    });
  } catch (err) {
    console.error("Analytics range fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
