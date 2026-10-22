import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { findUserByEmail } from "@/lib/supabase/users";

// Check if an email is already registered in Supabase Auth.
// Returns { exists: boolean } — never exposes user data.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

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
