import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ACCESS = new Set(["view", "comment", "edit"]);

async function loadShare(token: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("customizer_shares")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const service = createServiceClient();
  const share = await loadShare(params.token);
  if (!share) return NextResponse.json({ error: "Share link not found" }, { status: 404 });

  const { data: comments, error } = await service
    .from("customizer_share_comments")
    .select("id, body, author_email, created_at")
    .eq("share_id", share.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    token: share.token,
    productId: share.product_id,
    access: share.access,
    ownerEmail: share.owner_email,
    payload: share.payload,
    comments: comments ?? [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required to edit this shared customizer" }, { status: 401 });

  const share = await loadShare(params.token);
  if (!share) return NextResponse.json({ error: "Share link not found" }, { status: 404 });

  const isOwner = share.created_by === user.id;
  if (share.access !== "edit" && !isOwner) {
    return NextResponse.json({ error: "This link is not editable" }, { status: 403 });
  }

  const body = await request.json();
  const payload = body.payload && typeof body.payload === "object" ? body.payload : null;
  const nextAccess = typeof body.access === "string" && ACCESS.has(body.access) ? body.access : null;

  if (!payload && !nextAccess) {
    return NextResponse.json({ error: "payload or access required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (payload) patch.payload = payload;
  if (nextAccess && isOwner) patch.access = nextAccess;

  const { data, error } = await service
    .from("customizer_shares")
    .update(patch)
    .eq("id", share.id)
    .select("token, access, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required to comment" }, { status: 401 });

  const share = await loadShare(params.token);
  if (!share) return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  if (share.access !== "comment" && share.access !== "edit") {
    return NextResponse.json({ error: "Comments are disabled for this link" }, { status: 403 });
  }

  const body = await request.json();
  const comment = typeof body.body === "string" ? body.body.trim() : "";
  if (!comment) return NextResponse.json({ error: "Comment is required" }, { status: 400 });

  const { data, error } = await service
    .from("customizer_share_comments")
    .insert({
      share_id: share.id,
      body: comment,
      author_id: user.id,
      author_email: user.email,
    })
    .select("id, body, author_email, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
