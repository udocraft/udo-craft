import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Agent console API. Admin access is enforced by the global API middleware
// (permissionForAdminApi -> admin.access). This route also requires a signed-in user.
// The local worker reads the queue with the service role; no browser ever gets that key.

const TOOL_ALLOWLIST = ["Read", "Grep", "Glob"] as const;

const definitionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/, "slug: lowercase letters, digits, dashes"),
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  model: z.enum(["opus", "sonnet", "haiku"]),
  system_prompt: z.string().max(20000).default(""),
  allowed_tools: z.array(z.enum(TOOL_ALLOWLIST)).min(1).default(["Read", "Grep", "Glob"]),
  is_active: z.boolean().default(true),
});

const jobSchema = z.object({
  definition_id: z.string().uuid().nullable().default(null),
  prompt: z.string().min(1).max(8000),
});

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/agents — definitions and the 50 most recent jobs
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const [defs, jobs] = await Promise.all([
    service.from("agent_definitions").select("*").order("name"),
    service
      .from("agent_jobs")
      .select("id, definition_id, prompt, status, result, error, created_at, started_at, finished_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (defs.error) return NextResponse.json({ error: defs.error.message }, { status: 500 });
  if (jobs.error) return NextResponse.json({ error: jobs.error.message }, { status: 500 });
  return NextResponse.json({ definitions: defs.data, jobs: jobs.data });
}

// POST /api/agents — { kind: "definition", ...fields } creates a definition
//                    { kind: "job", definition_id, prompt } queues a job
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const service = createServiceClient();

  if (body.kind === "job") {
    const parsed = jobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid job" }, { status: 400 });
    }
    const { data, error } = await service
      .from("agent_jobs")
      .insert({
        definition_id: parsed.data.definition_id,
        prompt: parsed.data.prompt,
        created_by: user.id,
      })
      .select("id, status")
      .single();
    if (error) return NextResponse.json({ error: "Could not queue job" }, { status: 500 });
    return NextResponse.json({ job: data }, { status: 201 });
  }

  const parsed = definitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid definition" }, { status: 400 });
  }
  const { data, error } = await service
    .from("agent_definitions")
    .insert(parsed.data)
    .select("*")
    .single();
  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? "Slug already exists" : "Could not create definition" },
      { status },
    );
  }
  return NextResponse.json({ definition: data }, { status: 201 });
}

// PUT /api/agents?id=<uuid> — update a definition and bump its version
export async function PUT(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const parsed = definitionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid definition" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: current, error: readErr } = await service
    .from("agent_definitions")
    .select("version")
    .eq("id", id)
    .single();
  if (readErr || !current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await service
    .from("agent_definitions")
    .update({ ...parsed.data, version: current.version + 1, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not update definition" }, { status: 500 });
  return NextResponse.json({ definition: data });
}
