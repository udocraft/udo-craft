import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// This is a public endpoint that serves the product catalog to unauthenticated
// visitors browsing the store and the order customizer. There is no user session,
// so the session-based createClient() cannot be used. The service role key is
// required to read products without an authenticated user context.
// Note: if RLS policies are configured to allow public SELECT on the products
// table (e.g. using the anon key), this could be replaced with the anon client.

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    let query = supabase
      .from("products")
      .select("*, discount_grid, category_id, size_chart_id, marketing_meta, product_images")
      .order("created_at", { ascending: false });

    if (active === "true") query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
