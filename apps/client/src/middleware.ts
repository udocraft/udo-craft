import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { rateLimit } from "./lib/rate-limit";
import { routing } from "@/i18n/routing";

// Country to locale mapping
const countryToLocale: Record<string, string> = {
  // French-speaking countries
  FR: "fr", BE: "fr", LU: "fr", CH: "fr", MC: "fr", CD: "fr", CI: "fr", MG: "fr", ML: "fr", SN: "fr",
  // German-speaking countries
  DE: "de", AT: "de", LI: "de",
  // Spanish-speaking countries
  ES: "es", AR: "es", MX: "es", CO: "es", PE: "es", VE: "es", CL: "es", EC: "es", GT: "es", CU: "es",
  // Italian-speaking countries
  IT: "it", SM: "it", VA: "it",
  // Polish-speaking countries
  PL: "pl",
  // Dutch-speaking countries
  NL: "nl", BE: "nl",
  // Portuguese-speaking countries
  PT: "pt", BR: "pt",
  // Czech-speaking countries
  CZ: "cs",
  // Swedish-speaking countries
  SE: "sv",
  // Ukrainian-speaking
  UA: "uk",
};

async function getLocaleFromIP(ip: string): Promise<string> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: { "User-Agent": "next-intl-middleware" },
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    if (!response.ok) return routing.defaultLocale;
    
    const country = await response.text();
    const locale = countryToLocale[country.trim()];
    return locale || routing.defaultLocale;
  } catch {
    return routing.defaultLocale;
  }
}

function getClientIP(request: NextRequest): string {
  // Check various headers for the real client IP
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
    "forwarded",
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(",")[0].trim();
      if (ip && ip !== "unknown") return ip;
    }
  }
  
  // Fallback to remote address
  return request.ip || "unknown";
}

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

  // 2. Protect /cabinet routes (strip potential locale prefix first)
  const localePattern = new RegExp(`^\\/(${routing.locales.join("|")})`);
  const strippedPath = pathname.replace(localePattern, "");
  if (strippedPath.startsWith("/cabinet")) {
    return await updateSession(request);
  }

  // 3. Apply i18n routing with IP-based locale detection for root path
  if (pathname === "/" || pathname === "") {
    const clientIP = getClientIP(request);
    const detectedLocale = await getLocaleFromIP(clientIP);
    
    // Redirect to detected locale if it's not the default (English)
    if (detectedLocale !== routing.defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedLocale}`;
      return NextResponse.redirect(url);
    }
  }

  // 4. Apply i18n routing for all other routes
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files & Next internals
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
};
