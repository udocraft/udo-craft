import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  hasPermission,
  isAdminPermission,
  type AdminPermission,
} from "@udo-craft/authz";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { buildPermissionSet, parseBootstrapEmails } from "./resolve";

type AuthzUser = {
  id: string;
  email?: string | null;
  emailConfirmed: boolean;
};

type AuthzResult =
  | { ok: true; user: AuthzUser; permissions: Set<AdminPermission> }
  | { ok: false; response: NextResponse };

type MembershipRows = Array<{
  roles?: {
    name?: string;
    role_permissions?: Array<{ permissions?: { key?: string } }>;
  } | null;
}>;

async function loadMembershipRows(user: AuthzUser): Promise<MembershipRows | null> {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("memberships")
      .select("roles(name, role_permissions(permissions(key)))")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (error) {
      console.error("[authz] failed to load memberships", {
        userId: user.id,
        code: error.code,
        message: error.message,
      });
      return null;
    }
    return (data ?? []) as MembershipRows;
  } catch (err) {
    console.error("[authz] failed to initialize memberships client", {
      userId: user.id,
      message: err instanceof Error ? err.message : "Unknown error",
    });
    return null;
  }
}

async function resolvePermissions(user: AuthzUser): Promise<Set<AdminPermission>> {
  const rows = await loadMembershipRows(user);
  // Fail closed: if memberships cannot be read, grant nothing.
  if (!rows) return new Set();

  const membershipRoles = new Set<string>();
  const directKeys = new Set<string>();

  for (const membership of rows) {
    if (membership.roles?.name) membershipRoles.add(membership.roles.name);
    for (const rolePermission of membership.roles?.role_permissions ?? []) {
      const key = rolePermission.permissions?.key;
      if (key && isAdminPermission(key)) directKeys.add(key);
    }
  }

  return buildPermissionSet({
    membershipRoles,
    directKeys,
    email: user.email,
    emailConfirmed: user.emailConfirmed,
    bootstrapEmails: parseBootstrapEmails(process.env.ADMIN_BOOTSTRAP_EMAILS),
  });
}

function authzError(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "Unauthorized" : "Forbidden" },
    { status },
  );
}

function toAuthzUser(user: { id: string; email?: string | null; email_confirmed_at?: string | null }): AuthzUser {
  return {
    id: user.id,
    email: user.email,
    emailConfirmed: !!user.email_confirmed_at,
  };
}

export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<AuthzResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { ok: false, response: authzError(401) };

  const authzUser = toAuthzUser(user);
  const permissions = await resolvePermissions(authzUser);
  if (!hasPermission(permissions, permission)) {
    return { ok: false, response: authzError(403) };
  }

  return { ok: true, user: authzUser, permissions };
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

  const authzUser = toAuthzUser(user);
  const permissions = await resolvePermissions(authzUser);
  if (!hasPermission(permissions, permission)) {
    return { ok: false, response: authzError(403) };
  }

  return { ok: true, user: authzUser, permissions };
}
