import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { validateFile } from "@/lib/validate-file";
import { NextRequest, NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// This is a public upload endpoint used by unauthenticated customers to attach
// files (e.g. design references) before submitting an order. There is no user
// session available, so the session-based createClient() cannot be used.
// The service role key is required to write to the "attachments" storage bucket.
// Rate limiting (10 req/IP/60s) and MIME type + size validation mitigate abuse.

const BUCKET = "attachments";

export async function POST(request: NextRequest) {
  const { success } = await rateLimit(request, { limit: 10, window: 60 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const supabase = createServiceClient();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ urls: [] });
    }

    const urls: string[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false });

      if (error) {
        console.error("Storage upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
