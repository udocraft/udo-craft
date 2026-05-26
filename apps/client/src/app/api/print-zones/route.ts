import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// This is a public endpoint that serves print zone configuration to unauthenticated
// visitors using the order customizer. There is no user session, so the session-based
// createClient() cannot be used. The service role key is required to read print_zones
// without an authenticated user context.
// Note: if RLS policies allow public SELECT on the print_zones table via the anon key,
// this could be replaced with the anon client.

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const productId = new URL(request.url).searchParams.get("product_id");

    let query = supabase.from("print_zones").select("*");
    if (productId) query = query.eq("product_id", productId);

    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
