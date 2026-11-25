import { canTransitionLead, leadStatusLabel } from "@udo-craft/shared";

/**
 * The one client-side path for changing an order status. The server checks the
 * transition, guards against concurrent edits and writes the audit message, so
 * callers only update local state from the result.
 */
export async function updateLeadStatus<T = unknown>(leadId: string, from: string, to: string): Promise<T> {
  if (!canTransitionLead(from, to)) {
    throw new Error(`Не можна змінити статус: ${leadStatusLabel(from)} → ${leadStatusLabel(to)}`);
  }
  const res = await fetch(`/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: to }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body?.error === "string" ? body.error : `Не вдалося оновити статус (HTTP ${res.status})`;
    throw new Error(message);
  }
  return body as T;
}
