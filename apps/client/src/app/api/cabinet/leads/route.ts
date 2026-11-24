import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ilikeExact } from "@/lib/auth/email-match";

// This route reads leads that belong to the currently authenticated user.
// We use the session-based createClient() so that Supabase RLS policies
// (which filter leads by customer_data->>'email' = auth.email()) scope the
// query automatically. No service role is required here.

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS limits rows to the customer's own orders (case-insensitive email, see
  // 20261124000000_customer_cabinet_policies.sql). The explicit filter keeps staff
  // accounts, which RLS lets read every order, to their own orders here too.
  if (!user.email) return NextResponse.json([]);
  const { data, error } = await supabase
    .from("leads")
    .select("*, order_items!order_items_lead_id_fkey(*)")
    .ilike("customer_data->>email", ilikeExact(user.email))
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
