import { NextRequest, NextResponse } from "next/server";
import { fetchImageBytes, ProxyError } from "@/lib/net/safe-fetch";

// Same-origin image proxy used by the canvas (avoids tainted canvas exports).
// Only hosts we serve images from are allowed; anything else is rejected.
const ALLOWED_HOSTS = ["*.supabase.co", "images.unsplash.com", "*.keycrm.app"];

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("Missing url", { status: 400 });

  try {
    const { contentType, body } = await fetchImageBytes(rawUrl, ALLOWED_HOSTS);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    if (error instanceof ProxyError) {
      return new NextResponse(error.message, { status: error.status });
    }
    console.error("[proxy-image] request failed", error);
    return new NextResponse("Proxy error", { status: 500 });
  }
}
