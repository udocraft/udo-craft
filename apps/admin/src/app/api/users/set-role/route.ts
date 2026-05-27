import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listUserRoles, setUserRole } from "@/lib/authz/memberships";

// POST /api/users/set-role
// Bootstrap endpoint — grants the first admin role through server-owned
// memberships. It is gated by BOOTSTRAP_SECRET and should be removed after setup.
export async function POST(req: NextRequest) {
  const { email, secret } = await req.json();

  // Require a bootstrap secret from env to prevent abuse
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret || secret !== bootstrapSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const service = createServiceClient();

  // Find user by email
  const { data: list, error: listErr } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const user = list.users.find((u) => u.email === email);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const rolesByUser = await listUserRoles([user.id]);
  if (rolesByUser.has(user.id)) {
    return NextResponse.json({ error: "User already has an app role" }, { status: 400 });
  }

  await setUserRole({
    userId: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name ?? "",
    role: "admin",
  });

  return NextResponse.json({ ok: true, user });
}
