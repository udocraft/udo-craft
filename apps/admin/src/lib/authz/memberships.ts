import { createServiceClient } from "@/lib/supabase/service";

export async function setUserRole(input: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  role: string;
}) {
  const service = createServiceClient();
  const normalizedRole = input.role === "seamstress" ? "sewer" : input.role;

  const { error: appUserError } = await service.from("app_users").upsert({
    id: input.userId,
    email: input.email ?? null,
    full_name: input.fullName ?? null,
    updated_at: new Date().toISOString(),
  });

  if (appUserError) throw new Error(appUserError.message);

  const { data: role, error: roleError } = await service
    .from("roles")
    .select("id")
    .eq("name", normalizedRole)
    .single();

  if (roleError || !role) {
    throw new Error(roleError?.message ?? `Unknown role: ${normalizedRole}`);
  }

  const { error: disableError } = await service
    .from("memberships")
    .update({ status: "disabled", updated_at: new Date().toISOString() })
    .eq("user_id", input.userId);

  if (disableError) throw new Error(disableError.message);

  const { error: membershipError } = await service.from("memberships").upsert({
    user_id: input.userId,
    role_id: role.id,
    status: "active",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,role_id" });

  if (membershipError) throw new Error(membershipError.message);

  return normalizedRole;
}

export async function listUserRoles(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();

  const service = createServiceClient();
  const { data, error } = await service
    .from("memberships")
    .select("user_id, roles(name)")
    .eq("status", "active")
    .in("user_id", userIds);

  if (error) throw new Error(error.message);

  const rolesByUser = new Map<string, string>();
  for (const membership of (data ?? []) as Array<{ user_id: string; roles?: { name?: string } | null }>) {
    if (membership.roles?.name && !rolesByUser.has(membership.user_id)) {
      rolesByUser.set(membership.user_id, membership.roles.name);
    }
  }

  return rolesByUser;
}
