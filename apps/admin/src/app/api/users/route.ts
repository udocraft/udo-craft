import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { requireAdminPermission } from "@/lib/authz/guard";
import { logAdminAuditEvent } from "@/lib/authz/audit";
import { listUserRoles, setUserRole } from "@/lib/authz/memberships";
import { createServiceClient } from "@/lib/supabase/service";
import { sendInviteEmail } from "@/lib/email/send";

// GET /api/users — list all admin users
export async function GET() {
  const authz = await requireAdminPermission("users.manage");
  if (!authz.ok) return authz.response;

  const service = createServiceClient();
  const [{ data, error }, { data: leads }, { data: messages }] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 200 }),
    service.from("leads").select("id, customer_data, total_amount_cents, created_at"),
    service.from("messages").select("lead_id, sender, created_at"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalizeRole = (role: string) => (role === "seamstress" ? "sewer" : role);
  const rolesByUser = await listUserRoles(data.users.map((u) => u.id));
  const leadsById = new Map((leads || []).map((lead) => [lead.id, lead]));
  const clientEmails = new Set<string>();
  const orderCountByEmail = new Map<string, number>();
  const revenueByEmail = new Map<string, number>();
  const lastActivityByEmail = new Map<string, string>();

  for (const lead of leads || []) {
    const email = String(lead.customer_data?.email || "").toLowerCase();
    if (!email) continue;
    clientEmails.add(email);
    orderCountByEmail.set(email, (orderCountByEmail.get(email) || 0) + 1);
    revenueByEmail.set(email, (revenueByEmail.get(email) || 0) + (lead.total_amount_cents || 0));
    const previous = lastActivityByEmail.get(email);
    if (!previous || new Date(lead.created_at) > new Date(previous)) lastActivityByEmail.set(email, lead.created_at);
  }

  for (const message of messages || []) {
    if (message.sender !== "manager") continue;
    const lead = leadsById.get(message.lead_id);
    const email = String(lead?.customer_data?.email || "").toLowerCase();
    if (!email) continue;
    clientEmails.add(email);
    const previous = lastActivityByEmail.get(email);
    if (!previous || new Date(message.created_at) > new Date(previous)) lastActivityByEmail.set(email, message.created_at);
  }

  const users = data.users.map((u) => {
    const accessRole = rolesByUser.get(u.id) ?? null;
    const email = String(u.email || "").toLowerCase();

    return {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name ?? "",
      role: normalizeRole(accessRole || ""),
      access_role: accessRole ? normalizeRole(accessRole) : null,
      lifecycle_stage: accessRole
      ? "internal_staff"
      : clientEmails.has(email)
        ? "client"
        : "registered_lead",
      order_count: orderCountByEmail.get(email) || 0,
      lifetime_value_cents: revenueByEmail.get(email) || 0,
      last_customer_activity_at: lastActivityByEmail.get(email) || null,
      avatar_url: u.user_metadata?.avatar_url ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at,
    };
  });

  return NextResponse.json({ users });
}

// POST /api/users — create user with temp password + send invite email
export async function POST(req: NextRequest) {
  try {
    const authz = await requireAdminPermission("users.manage");
    if (!authz.ok) return authz.response;

    const body = await req.json();
    const { email, full_name, role = "manager" } = body;
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const normalizedRole = role === "seamstress" ? "sewer" : role;

    // Generate a secure temp password
    const tempPassword = generateTempPassword();

    const service = createServiceClient();

    // Create the user with confirmed email + temp password
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name ?? "",
        must_change_password: true, // flag for first-login redirect
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await setUserRole({
      userId: data.user.id,
      email,
      fullName: full_name ?? "",
      role: normalizedRole,
    });

    await logAdminAuditEvent({
      actorUserId: authz.user.id,
      action: "users.create",
      resourceType: "auth.users",
      resourceId: data.user?.id,
      metadata: { email, role: normalizedRole },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://admin.u-do-craft.store";
    const inviterName = authz.user.email?.split("@")[0];

    // Send invite email via Resend
    try {
      await sendInviteEmail({
        to: email,
        tempPassword,
        loginUrl: `${appUrl}/login`,
        inviterName,
      });
    } catch (emailErr) {
      console.error("[invite] email send failed:", emailErr);
      // Don't fail the whole request — user is created, email is best-effort
    }

    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (err) {
    console.error("[users] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars[randomInt(chars.length)];
  }
  return pass;
}
