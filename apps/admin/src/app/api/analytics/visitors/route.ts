import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Неавторизовано" }, { status: 401 });

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: events, error: eventsError } = await supabase
      .from("site_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (eventsError) throw eventsError;

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, visitor_id, session_id, customer_data, total_amount_cents, status, created_at")
      .order("created_at", { ascending: true });

    if (leadsError) throw leadsError;

    // Group events by visitor_id
    const visitorsMap = new Map<string, any>();

    for (const event of events || []) {
      if (!visitorsMap.has(event.visitor_id)) {
        visitorsMap.set(event.visitor_id, {
          visitor_id: event.visitor_id,
          last_active: event.created_at,
          first_seen: event.created_at,
          events: [],
          leads: [],
          pageviews: 0,
          sessions: new Set(),
          started_cart: false,
          completed_cart: false,
        });
      }
      const v = visitorsMap.get(event.visitor_id);
      v.events.push(event);
      
      if (event.event_type === "pageview") v.pageviews++;
      if (event.event_type === "customize_start") v.started_cart = true;
      if (event.event_type === "customize_complete") v.completed_cart = true;
      
      v.sessions.add(event.session_id);
      
      const eDate = new Date(event.created_at).getTime();
      if (eDate > new Date(v.last_active).getTime()) v.last_active = event.created_at;
      if (eDate < new Date(v.first_seen).getTime()) v.first_seen = event.created_at;
    }

    // Attach leads to visitors
    for (const lead of leads || []) {
      if (lead.visitor_id && visitorsMap.has(lead.visitor_id)) {
        const v = visitorsMap.get(lead.visitor_id);
        v.leads.push(lead);
      }
    }

    const visitors = Array.from(visitorsMap.values()).map(v => {
      const is_converted = v.leads.length > 0 || v.events.some((e: any) => e.event_type === "form_submit");
      const dropped_cart = v.started_cart && !v.completed_cart && !is_converted;
      
      let conversion_time_ms = null;
      if (v.leads.length > 0) {
        // Time from first seen event to first lead
        const firstLeadAt = new Date(v.leads[0].created_at).getTime();
        const firstSeenAt = new Date(v.first_seen).getTime();
        if (firstLeadAt > firstSeenAt) {
          conversion_time_ms = firstLeadAt - firstSeenAt;
        }
      }

      return {
        ...v,
        sessions_count: v.sessions.size,
        is_converted,
        dropped_cart,
        conversion_time_ms,
        is_new: v.sessions.size === 1, // Rough estimate
      };
    }).sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime());

    return NextResponse.json({ visitors });
  } catch (error: any) {
    console.error("[visitors] API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
