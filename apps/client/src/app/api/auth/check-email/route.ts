import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { findUserByEmail } from "@/lib/supabase/users";
import { CheckEmailRequestSchema } from "@udo-craft/shared";
import { parseJsonBody } from "@/lib/api/request";

// Check if an email is already registered in Supabase Auth.
// Returns { exists: boolean } — never exposes user data.
export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, { scope: "check-email", limit: 10, window: 60 })).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsedBody = await parseJsonBody(req, CheckEmailRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const { email } = parsedBody.data;

  try {

    // auth.admin needs the service role; the anon session client cannot call it
    // and previously always reported "not registered".
    const exists = (await findUserByEmail(createServiceClient(), email)) !== null;

    return NextResponse.json({ exists });
  } catch (err) {
    console.error("[check-email] error:", err);
    // Fail open
    return NextResponse.json({ exists: false });
  }
}
