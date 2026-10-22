import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * In production a webhook without its secret must not be accepted.
 * Development keeps working without secrets so local testing is possible.
 */
export function webhookSecretUnconfigured(): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;
  return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
}

export function secretsMatch(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
