import { NextResponse } from "next/server";

/** Structural subset of a zod schema, so route files need not depend on zod directly. */
interface Schema<T> {
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

function badRequest(error: string, issues: { path: string; message: string }[] = []) {
  return NextResponse.json({ error, issues }, { status: 400 });
}

/**
 * Parse a JSON request body with a shared zod schema. Malformed JSON or a body
 * that fails the schema becomes a 400 whose `error` is the first issue message
 * (the forms already show `error` to the user).
 */
export async function parseJsonBody<T>(request: Request, schema: Schema<T>): Promise<Parsed<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest("Invalid JSON body") };
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  return { ok: false, response: badRequest(issues[0]?.message ?? "Invalid request body", issues) };
}

/** Read `files` from a multipart body. Anything that is not a list of File parts is a 400. */
export async function parseFilesBody(request: Request, schema: Schema<File[]>): Promise<Parsed<File[]>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, response: badRequest("Expected multipart/form-data") };
  }
  const result = schema.safeParse(form.getAll("files"));
  if (result.success) return { ok: true, data: result.data };
  const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  return { ok: false, response: badRequest(issues[0]?.message ?? "files must be file uploads", issues) };
}
