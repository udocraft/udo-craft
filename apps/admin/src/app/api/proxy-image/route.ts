import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/authz/guard";
import { fetchImageBytes, ProxyError } from "@/lib/net/safe-fetch";

function allowedHosts(): string[] {
  return (process.env.IMAGE_PROXY_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const authz = await requireAdminPermission("uploads.manage");
  if (!authz.ok) return authz.response;

  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("Missing url", { status: 400 });

  try {
    const { contentType, body } = await fetchImageBytes(rawUrl, allowedHosts());
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof ProxyError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[proxy-image] request failed", error);
    return new NextResponse("Proxy error", { status: 400 });
  }
}
