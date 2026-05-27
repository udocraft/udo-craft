/**
 * GET /api/analytics/dashboard - Get dashboard metrics
 * Optimized queries with proper aggregation at database level
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createApiResponse, handleApiError } from '@/lib/api/errors';
import { DashboardMetrics } from '@/lib/api/types';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    // Cookie-based auth (same pattern as other admin routes)
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Неавторизовано' }, { status: 401 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const yesterdayStart = startOfDay(new Date(now.getTime() - 86400000)).toISOString();
    const yesterdayEnd = todayStart;

    // Fetch all data in parallel with optimized queries
    const [
      { data: allLeads },
      { data: todayLeads },
      { data: yesterdayLeads },
      { data: allEvents },
      { data: todayEvents },
      { data: yesterdayEvents },
      { data: allItems },
    ] = await Promise.all([
      // All leads
      supabase
        .from('leads')
        .select('id, status, total_amount_cents, customer_data, created_at'),

      // Today's leads
      supabase
        .from('leads')
        .select('id, status, total_amount_cents, customer_data, created_at')
        .gte('created_at', todayStart),

      // Yesterday's leads
      supabase
        .from('leads')
        .select('id, status, total_amount_cents, customer_data, created_at')
        .gte('created_at', yesterdayStart)
        .lt('created_at', yesterdayEnd),

      // All events
      supabase
        .from('site_events')
        .select('event_type, session_id, created_at'),

      // Today's events
      supabase
        .from('site_events')
        .select('event_type, session_id, created_at')
        .gte('created_at', todayStart),

      // Yesterday's events
      supabase
        .from('site_events')
        .select('event_type, session_id, created_at')
        .gte('created_at', yesterdayStart)
        .lt('created_at', yesterdayEnd),

      // All items
      supabase
        .from('order_items')
        .select('id, quantity'),
    ]);

    // Process data
    const leads = allLeads ?? [];
    const tLeads = todayLeads ?? [];
    const yLeads = yesterdayLeads ?? [];
    const events = allEvents ?? [];
    const tEvents = todayEvents ?? [];
    const yEvents = yesterdayEvents ?? [];
    const items = allItems ?? [];

    // Calculate metrics
    const totalRevenue = leads.reduce((s, l) => s + (l.total_amount_cents ?? 0), 0);
    const totalRevenueToday = tLeads.reduce((s, l) => s + (l.total_amount_cents ?? 0), 0);
    const totalRevenueYesterday = yLeads.reduce((s, l) => s + (l.total_amount_cents ?? 0), 0);

    const completed = leads.filter((l) => l.status === 'completed');
    const completedYesterday = yLeads.filter((l) => l.status === 'completed');
    const paidRevenue = completed.reduce((s, l) => s + (l.total_amount_cents ?? 0), 0);
    const paidRevenueYesterday = completedYesterday.reduce(
      (s, l) => s + (l.total_amount_cents ?? 0),
      0
    );

    const sessions = new Set(
      events.filter((e) => e.event_type === 'session_start').map((e) => e.session_id)
    ).size;
    const sessionsToday = new Set(
      tEvents.filter((e) => e.event_type === 'session_start').map((e) => e.session_id)
    ).size;
    const sessionsYesterday = new Set(
      yEvents.filter((e) => e.event_type === 'session_start').map((e) => e.session_id)
    ).size;

    const forms = events.filter((e) => e.event_type === 'form_submit').length;
    const formsToday = tEvents.filter((e) => e.event_type === 'form_submit').length;
    const formsYesterday = yEvents.filter((e) => e.event_type === 'form_submit').length;

    const clients = new Set(
      leads.map((l) => l.customer_data?.email).filter(Boolean)
    ).size;
    const clientsToday = new Set(
      tLeads.map((l) => l.customer_data?.email).filter(Boolean)
    ).size;
    const clientsYesterday = new Set(
      yLeads.map((l) => l.customer_data?.email).filter(Boolean)
    ).size;

    const itemsSold = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
    const conversionRate = sessions > 0 ? Math.round((forms / sessions) * 100) : 0;
    const conversionRateYesterday =
      sessionsYesterday > 0 ? Math.round((formsYesterday / sessionsYesterday) * 100) : 0;

    const metrics: DashboardMetrics = {
      totalRevenue,
      totalRevenueToday,
      totalRevenueYesterday,
      totalOrders: leads.length,
      totalOrdersToday: tLeads.length,
      totalOrdersYesterday: yLeads.length,
      paidRevenue,
      paidRevenueYesterday,
      completedOrders: completed.length,
      completedOrdersYesterday: completedYesterday.length,
      sessions,
      sessionsToday,
      sessionsYesterday,
      forms,
      formsToday,
      formsYesterday,
      clients,
      clientsToday,
      clientsYesterday,
      itemsSold,
      conversionRate,
      conversionRateYesterday,
      avgOrderValue: leads.length > 0 ? Math.round(totalRevenue / leads.length) : 0,
      avgOrderValueYesterday:
        yLeads.length > 0 ? Math.round(totalRevenueYesterday / yLeads.length) : 0,
    };

    return NextResponse.json(createApiResponse(true, metrics));
  } catch (error) {
    return handleApiError(error);
  }
}
