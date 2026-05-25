import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabasePublicEnv());
  } catch {
    // Env vars missing — allow the request through so the login page can render
    // and show a proper error rather than an infinite redirect loop
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  // Only users explicitly granted an internal role may access the dashboard.
  // Regular client-side signups have no role set — they are rejected.
  const ALLOWED_ROLES = ["admin", "manager", "viewer", "seamstress"];
  const role: string | undefined = user?.user_metadata?.role;
  const isAdminUser = !!role && ALLOWED_ROLES.includes(role);

  if (!isPublicPath && (!user || !isAdminUser)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (role === "seamstress" && !request.nextUrl.pathname.startsWith("/api")) {
    const allowedForSeamstress = ["/warehouse", "/erp", "/orders", "/messages"];
    const canView = allowedForSeamstress.some((path) => request.nextUrl.pathname.startsWith(path));
    if (!isPublicPath && !canView) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/warehouse";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && isAdminUser && request.nextUrl.pathname.startsWith("/login")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
