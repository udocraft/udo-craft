import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { requireAdminPermissionForRequest } from "@/lib/authz/guard";
import { permissionForAdminApi } from "@/lib/authz/permissions";

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

  const apiPermission = permissionForAdminApi(request);
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (!apiPermission) return supabaseResponse;

    const authz = await requireAdminPermissionForRequest(request, apiPermission);
    return authz.ok ? supabaseResponse : authz.response;
  }

  const isPublicPath =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  const authz = user
    ? await requireAdminPermissionForRequest(request, "admin.access")
    : null;
  const isAdminUser = !!authz?.ok;

  if (!isPublicPath && (!user || !isAdminUser)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminUser && request.nextUrl.pathname.startsWith("/login")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
