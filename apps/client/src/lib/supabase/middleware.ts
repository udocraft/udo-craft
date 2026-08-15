import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function updateSession(
  request: NextRequest,
  response?: NextResponse
): Promise<NextResponse> {
  let supabaseResponse = response || NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabasePublicEnv();

  // When Supabase env vars are absent, allow the request through to avoid
  // infinite redirect loops (e.g. during build or misconfigured environments)
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        if (!response) {
          supabaseResponse = NextResponse.next({
            request,
          });
        }
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.endsWith("/cabinet/login");

  // Unauthenticated user trying to access a protected cabinet route → redirect to login
  if (!user && !isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    // Preserve locale prefix if present
    const parts = pathname.split("/");
    const cabinetIdx = parts.indexOf("cabinet");
    const prefix = cabinetIdx > 1 ? parts.slice(0, cabinetIdx).join("/") : "";
    redirectUrl.pathname = `${prefix}/cabinet/login`;
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated user visiting the login page → redirect to cabinet home
  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    const parts = pathname.split("/");
    const cabinetIdx = parts.indexOf("cabinet");
    const prefix = cabinetIdx > 1 ? parts.slice(0, cabinetIdx).join("/") : "";
    redirectUrl.pathname = `${prefix}/cabinet`;
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
