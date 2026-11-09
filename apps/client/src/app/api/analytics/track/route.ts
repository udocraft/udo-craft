import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { TrackEventRequestSchema } from "@udo-craft/shared";
import { parseJsonBody } from "@/lib/api/request";

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
  if (!(await rateLimit(request, { scope: "analytics", limit: 120, window: 60 })).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsedBody = await parseJsonBody(request, TrackEventRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  try {
    const metadata = {
      ...(body.metadata ?? {}),
      geo: {
        ip: clientIp(request),
        city: firstHeader(request, "x-vercel-ip-city"),
        region: firstHeader(request, "x-vercel-ip-country-region"),
        country: firstHeader(request, "x-vercel-ip-country"),
        timezone: firstHeader(request, "x-vercel-ip-timezone"),
      },
      device: {
        user_agent: body.user_agent || request.headers.get("user-agent") || "",
        language: request.headers.get("accept-language"),
      },
    };

    const service = createServiceClient();
    const { error } = await service.from("site_events").insert({
      event_type: body.event_type,
      session_id: body.session_id,
      visitor_id: body.visitor_id,
      page: body.page ? body.page.slice(0, 512) : null,
      referrer: body.referrer ? body.referrer.slice(0, 1024) : null,
      user_agent: body.user_agent ? body.user_agent.slice(0, 1024) : request.headers.get("user-agent"),
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
