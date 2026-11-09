import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CreateShareRequestSchema } from "@udo-craft/shared";
import { parseJsonBody } from "@/lib/api/request";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

  const parsedBody = await parseJsonBody(request, CreateShareRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const { productId, access, payload } = parsedBody.data;

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
