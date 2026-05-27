import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  hasPermission,
  isAdminPermission,
  permissionsForRoles,
  type AdminPermission,
} from "@udo-craft/authz";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

type AuthzUser = {
  id: string;
  email?: string | null;
  userMetadata?: Record<string, unknown>;
};

type AuthzResult =
  | { ok: true; user: AuthzUser; permissions: Set<AdminPermission> }
  | { ok: false; response: NextResponse };

function bootstrapPermissionsFor(email?: string | null): Set<AdminPermission> {
  const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (email && bootstrapEmails.includes(email.toLowerCase())) {
    return permissionsForRoles(["admin"]);
  }

  return new Set();
}

async function loadMembershipPermissions(
  user: AuthzUser,
): Promise<Set<AdminPermission>> {
  let data: unknown[] | null = null;
  let error: { code?: string; message?: string } | null = null;

  try {
    const service = createServiceClient();
    const result = await service
      .from("memberships")
      .select("roles(name, role_permissions(permissions(key)))")
      .eq("user_id", user.id)
      .eq("status", "active");

    data = result.data;
    error = result.error;
  } catch (err) {
    console.error("[authz] failed to initialize memberships client", {
      userId: user.id,
      message: err instanceof Error ? err.message : "Unknown error",
    });
    return new Set();
  }

  if (error) {
    console.error("[authz] failed to load memberships", {
      userId: user.id,
      code: error.code,
      message: error.message,
    });
    return new Set();
  }

  const roles = new Set<string>();
  const permissions = new Set<AdminPermission>();

  for (const membership of (data ?? []) as Array<{
    roles?: {
      name?: string;
      role_permissions?: Array<{ permissions?: { key?: string } }>;
    } | null;
  }>) {
    if (membership.roles?.name) roles.add(membership.roles.name);

    for (const rolePermission of membership.roles?.role_permissions ?? []) {
      const key = rolePermission.permissions?.key;
      if (key && isAdminPermission(key)) permissions.add(key);
    }
  }

  for (const permission of permissionsForRoles(roles)) {
    permissions.add(permission);
  }

  return permissions;
}

async function resolvePermissions(user: AuthzUser): Promise<Set<AdminPermission>> {
  const permissions = await loadMembershipPermissions(user);

  for (const permission of bootstrapPermissionsFor(user.email)) {
    permissions.add(permission);
  }

  const metadataRole = user.userMetadata?.role;
  if (typeof metadataRole === "string") {
    for (const permission of permissionsForRoles([metadataRole])) {
      permissions.add(permission);
    }
  }

  return permissions;
}

function authzError(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "Unauthorized" : "Forbidden" },
    { status },
  );
}

export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<AuthzResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { ok: false, response: authzError(401) };

  const authzUser = { id: user.id, email: user.email, userMetadata: user.user_metadata };
  const permissions = await resolvePermissions(authzUser);
  if (!hasPermission(permissions, permission)) {
    return { ok: false, response: authzError(403) };
  }

  return {
    ok: true,
    user: authzUser,
    permissions,
  };
}

export async function requireAdminPermissionForRequest(
  request: NextRequest,
  permission: AdminPermission,
): Promise<AuthzResult> {
  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabasePublicEnv());
  } catch {
    return { ok: false, response: authzError(401) };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Middleware refreshes cookies separately; authZ only needs to read.
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, response: authzError(401) };

  const authzUser = { id: user.id, email: user.email, userMetadata: user.user_metadata };
  const permissions = await resolvePermissions(authzUser);
  if (!hasPermission(permissions, permission)) {
    return { ok: false, response: authzError(403) };
  }

  return {
    ok: true,
    user: authzUser,
    permissions,
  };
}
