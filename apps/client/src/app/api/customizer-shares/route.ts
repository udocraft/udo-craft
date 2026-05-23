import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ACCESS = new Set(["view", "comment", "edit"]);

function makeToken() {
  return randomBytes(16).toString("base64url");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required to create a share link" }, { status: 401 });
  }

  const body = await request.json();
  const productId = typeof body.productId === "string" ? body.productId : "";
  const access = typeof body.access === "string" && ACCESS.has(body.access) ? body.access : "view";
  const payload = body.payload && typeof body.payload === "object" ? body.payload : null;

  if (!productId || !payload) {
    return NextResponse.json({ error: "productId and payload are required" }, { status: 400 });
  }

  const { data, error } = await service
    .from("customizer_shares")
    .insert({
      token: makeToken(),
      product_id: productId,
      created_by: user.id,
      owner_email: user.email,
      access,
      payload,
    })
    .select("token, access, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = new URL(request.url);
  const shareUrl = `${url.origin}/order?share=${data.token}`;

  return NextResponse.json({ ...data, url: shareUrl }, { status: 201 });
}
