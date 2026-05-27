import { createServiceClient } from "@/lib/supabase/service";

type AuditEvent = {
  actorUserId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAdminAuditEvent(event: AuditEvent) {
  const service = createServiceClient();
  const { error } = await service.from("admin_audit_events").insert({
    actor_user_id: event.actorUserId,
    action: event.action,
    resource_type: event.resourceType ?? null,
    resource_id: event.resourceId ?? null,
    metadata: event.metadata ?? {},
  });

  if (error) {
    console.error("[audit] failed to write admin event", {
      action: event.action,
      actorUserId: event.actorUserId,
      message: error.message,
    });
  }
}
