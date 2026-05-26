import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// This is a public endpoint that serves material/color swatch data to unauthenticated
// visitors using the order customizer. There is no user session, so the session-based
// createClient() cannot be used. The service role key is required to read materials
// without an authenticated user context.
// Note: if RLS policies allow public SELECT on the materials table via the anon key,
// this could be replaced with the anon client.

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
