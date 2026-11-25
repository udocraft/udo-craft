import { canTransitionLead, leadStatusLabel, type LeadStatusValue } from "@udo-craft/shared";
import type { createServiceClient } from "@/lib/supabase/service";

type Service = ReturnType<typeof createServiceClient>;

/**
 * Server-side status change triggered by another workflow (ERP production).
 * Moves the order only if the shared transition rules allow it and nobody changed
 * the status meanwhile, and always leaves a note in the order chat so staff can
 * see what happened. Never throws: production documents must not fail because
 * the linked order could not be updated.
 */
export async function syncLeadFromWorkflow(
  service: Service,
  leadId: string,
  opts: { to?: LeadStatusValue; note: string; actorEmail?: string | null },
): Promise<void> {
  try {
    const { data: lead, error } = await service.from("leads").select("id, status").eq("id", leadId).maybeSingle();
    if (error || !lead) return;

    let body = opts.note;
    if (opts.to && lead.status !== opts.to && canTransitionLead(lead.status, opts.to)) {
      const { data: moved } = await service
        .from("leads")
        .update({ status: opts.to })
        .eq("id", leadId)
        .eq("status", lead.status)
        .select("id")
        .maybeSingle();
      if (moved) body = `${opts.note}. Статус змінено: ${leadStatusLabel(lead.status)} → ${leadStatusLabel(opts.to)}`;
    }

    await service.from("messages").insert({
      lead_id: leadId,
      body,
      sender: "manager",
      sender_email: opts.actorEmail ?? null,
      attachments: [],
      channel: "web",
    });
  } catch (err) {
    console.error("[leads] workflow sync failed", err);
  }
}
