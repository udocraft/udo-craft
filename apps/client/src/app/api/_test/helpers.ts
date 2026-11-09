import { NextRequest } from "next/server";

const ORIGIN = "http://localhost:3100";

/** POST with a JSON body. Pass a string to send it verbatim (e.g. malformed JSON). */
export function jsonPost(path: string, body: unknown): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function jsonRequest(method: "PATCH" | "POST", path: string, body: unknown): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** POST multipart/form-data. */
export function formPost(path: string, form: FormData): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, { method: "POST", body: form });
}

/**
 * Supabase query-builder stand-in: every method returns the builder, and
 * `single`/`maybeSingle` resolve to `result`.
 */
export function queryStub(result: unknown): Record<string, unknown> {
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return undefined;
        if (prop === "single" || prop === "maybeSingle") return async () => result;
        return () => proxy;
      },
    },
  );
  return proxy as Record<string, unknown>;
}

export const signedInUser = { id: "user-1", email: "client@example.com" };
