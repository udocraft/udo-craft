import { requireAdminPermission } from "@/lib/authz/guard";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "product-images";
const FALLBACK_BUCKET = "attachments";

export async function POST(request: NextRequest) {
  const authz = await requireAdminPermission("uploads.manage");
  if (!authz.ok) return authz.response;
  try {
    const supabase = createServiceClient();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const tags = formData.getAll("tags") as string[];

    if (!files.length) {
      return NextResponse.json({ urls: [], results: [] });
    }

    const results: { tag: string; url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tag = tags[i] || "front";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${crypto.randomUUID()}/${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Try primary bucket first, fall back to attachments
      let uploadError = null;
      let usedBucket = BUCKET;

      const { error: err1 } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false });

      if (err1) {
        console.warn(`Primary bucket "${BUCKET}" failed: ${err1.message}, trying fallback`);
        const { error: err2 } = await supabase.storage
          .from(FALLBACK_BUCKET)
          .upload(path, buffer, { contentType: file.type, upsert: false });
        if (err2) {
          uploadError = err2;
        } else {
          usedBucket = FALLBACK_BUCKET;
        }
      }

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data } = supabase.storage.from(usedBucket).getPublicUrl(path);
      results.push({ tag, url: data.publicUrl });
    }

    return NextResponse.json({ results, urls: results.map((r) => r.url) });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
