/**
 * Builds the URL Supabase sends users back to after an email link or OAuth step.
 *
 * Uses NEXT_PUBLIC_APP_URL (the real site) instead of window.location.origin, so a
 * link requested from any other origin (localhost, a preview host) still lands on the
 * production domain. The PKCE verifier is stored on the origin that started the flow,
 * so starting and finishing on the same origin also keeps code exchange working.
 * For local development, set NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env.local.
 */
export function authCallbackUrl(next: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = (configured || window.location.origin).replace(/\/+$/, "");
  return `${base}/auth/callback?next=${next}`;
}
