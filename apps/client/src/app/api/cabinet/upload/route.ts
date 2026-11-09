import { createClient } from "@/lib/supabase/server";
import { validateFile } from "@/lib/validate-file";
import { parseFilesBody } from "@/lib/api/request";
import { UploadFilesRequestSchema } from "@udo-craft/shared";
import { NextRequest, NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// Authentication is verified via the session-based createClient() above — only
// authenticated users can reach the upload logic. However, the "attachments"
// storage bucket requires the service role key for write operations because
// Supabase Storage RLS policies for this bucket are not configured to allow
// per-user writes via the anon/session key. The service role is used only for
// the storage.upload() call; all auth checks use the session-based client.

const BUCKET = "attachments";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsedBody = await parseFilesBody(request, UploadFilesRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const files = parsedBody.data;

  try {
    const service = await createClient();

    if (!files.length) return NextResponse.json({ results: [] });

    const results: { url: string }[] = [];
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `messages/${crypto.randomUUID()}/${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await service.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false });
      if (error) {
        console.error("[cabinet/upload] storage error:", JSON.stringify(error));
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const { data } = service.storage.from(BUCKET).getPublicUrl(path);
      results.push({ url: data.publicUrl });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[cabinet/upload] unexpected error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
