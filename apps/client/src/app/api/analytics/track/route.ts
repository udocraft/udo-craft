import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const EVENT_TYPES = new Set([
  "pageview",
  "session_start",
  "form_submit",
  "customize_start",
  "customize_complete",
]);

function firstHeader(request: NextRequest, name: string) {
  const value = request.headers.get(name);
  return value ? decodeURIComponent(value) : null;
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = String(body.event_type || "");

    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }

    const visitorId = String(body.visitor_id || "");
    const sessionId = String(body.session_id || "");
    if (!visitorId || !sessionId) {
      return NextResponse.json({ error: "visitor_id and session_id required" }, { status: 400 });
    }

    const metadata = {
      ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
      geo: {
        ip: clientIp(request),
        city: firstHeader(request, "x-vercel-ip-city"),
        region: firstHeader(request, "x-vercel-ip-country-region"),
        country: firstHeader(request, "x-vercel-ip-country"),
        timezone: firstHeader(request, "x-vercel-ip-timezone"),
      },
      device: {
        user_agent: String(body.user_agent || request.headers.get("user-agent") || ""),
        language: request.headers.get("accept-language"),
      },
    };

    const service = createServiceClient();
    const { error } = await service.from("site_events").insert({
      event_type: eventType,
      session_id: sessionId,
      visitor_id: visitorId,
      page: typeof body.page === "string" ? body.page.slice(0, 512) : null,
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 1024) : null,
      user_agent: typeof body.user_agent === "string" ? body.user_agent.slice(0, 1024) : request.headers.get("user-agent"),
      metadata,
    });

    if (error) {
      console.error("[analytics/track]", error);
      return NextResponse.json({ ok: false }, { status: 202 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[analytics/track]", error);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
