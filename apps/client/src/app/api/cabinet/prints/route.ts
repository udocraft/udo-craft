import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateFile } from "@/lib/validate-file";

const BUCKET = "customer-prints";
const MAX_FILES_PER_USER = 50;
const SIGNED_URL_TTL_SEC = 60 * 60;

export interface CustomerPrintFile {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: "uploaded" | "approved" | "rejected";
  created_at: string;
  url: string | null;
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Lists the signed-in user's own print files with short-lived view URLs. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("customer_print_files")
    .select("id, file_name, mime_type, size_bytes, status, created_at, storage_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const files: CustomerPrintFile[] = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await service.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);
      return {
        id: row.id,
        file_name: row.file_name,
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        status: row.status,
        created_at: row.created_at,
        url: signed?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ files });
}

/** Uploads one print file (multipart field `file`) into the user's private folder. */
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const { count, error: countError } = await service
    .from("customer_print_files")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count ?? 0) >= MAX_FILES_PER_USER) {
    return NextResponse.json({ error: "Limit reached" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const validation = validateFile(file);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "print";
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("[cabinet/prints] storage error:", JSON.stringify(uploadError));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: row, error: insertError } = await service
    .from("customer_print_files")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select("id, file_name, mime_type, size_bytes, status, created_at")
    .single();

  if (insertError) {
    // Keep storage and table in sync: drop the orphaned object.
    await service.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ file: row }, { status: 201 });
}
