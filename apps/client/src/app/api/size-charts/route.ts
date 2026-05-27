import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// Public read endpoint for the order customizer. It exposes only configured
// size-chart rows needed to render product sizing hints for unauthenticated users.
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("size_charts")
      .select("id, name, rows, image_url")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
