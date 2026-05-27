import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/authz/guard";
import { logAdminAuditEvent } from "@/lib/authz/audit";
import { setUserRole } from "@/lib/authz/memberships";
import { createServiceClient } from "@/lib/supabase/service";

// PATCH /api/users/[id] — update role / name
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authz = await requireAdminPermission("users.manage");
  if (!authz.ok) return authz.response;

  const { id } = await params;
  const body = await req.json();
  const { full_name, role } = body;
  const normalizedRole = role === "seamstress" ? "sewer" : role;

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.updateUserById(id, {
    user_metadata: { full_name },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await setUserRole({
    userId: id,
    email: data.user.email,
    fullName: full_name,
    role: normalizedRole,
  });
  await logAdminAuditEvent({
    actorUserId: authz.user.id,
    action: "users.update",
    resourceType: "auth.users",
    resourceId: id,
    metadata: { role: normalizedRole, full_name },
  });
  return NextResponse.json({ user: data.user });
}

// DELETE /api/users/[id] — remove user
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authz = await requireAdminPermission("users.manage");
  if (!authz.ok) return authz.response;

  const { id } = await params;

  // Prevent self-deletion
  if (authz.user.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAuditEvent({
    actorUserId: authz.user.id,
    action: "users.delete",
    resourceType: "auth.users",
    resourceId: id,
  });

  return NextResponse.json({ success: true });
}
