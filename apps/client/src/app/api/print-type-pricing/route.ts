import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// This is a public endpoint that serves print type pricing tiers to unauthenticated
// visitors using the order customizer. There is no user session, so the session-based
// createClient() cannot be used. The service role key is required to read
// print_type_pricing without an authenticated user context.
// Note: if RLS policies allow public SELECT on the print_type_pricing table via the
// anon key, this could be replaced with the anon client.

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const printType = new URL(request.url).searchParams.get("print_type");

  let query = supabase.from("print_type_pricing").select("id,print_type,size_label,size_min_cm,size_max_cm,qty_tiers,sort_order").eq("is_active", true);
  if (printType) query = query.eq("print_type", printType);

  const { data, error } = await query.order("print_type").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
