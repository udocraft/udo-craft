import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { rateLimit } from "./lib/rate-limit";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate-limit public APIs
  if (pathname.startsWith("/api")) {
    const result = await rateLimit(request, { limit: 100, window: 60 });
    if (!result.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    return NextResponse.next();
  }

  // 2. Apply i18n routing first
  const response = intlMiddleware(request);

  // 3. Protect /cabinet routes (strip potential locale prefix first)
  const localePattern = new RegExp(`^\\/(${routing.locales.join("|")})`);
  const strippedPath = pathname.replace(localePattern, "");
  if (strippedPath.startsWith("/cabinet")) {
    return await updateSession(request, response);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files & Next internals
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
};
