import { NextResponse } from "next/server";
import type { AdminPermission } from "@udo-craft/authz";
import { requireAdminPermission } from "@/lib/authz/guard";
import { createServiceClient } from "@/lib/supabase/service";

export async function requireErpUser(permission: AdminPermission = "erp.read") {
  const authz = await requireAdminPermission(permission);
  if (!authz.ok) return { user: null, service: null, error: authz.response };
  return { user: authz.user, service: createServiceClient(), error: null };
}

export function apiError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status });
}

export function moneyToCents(value: unknown) {
  return Math.round(Number(value || 0) * 100);
}
