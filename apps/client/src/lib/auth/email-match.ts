/**
 * Case-insensitive exact match for a JSON email column with PostgREST `ilike`.
 * Escapes the LIKE wildcards, so "a_b@x.com" cannot match "axb@x.com".
 */
export function ilikeExact(email: string): string {
  return email.trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`);
}
