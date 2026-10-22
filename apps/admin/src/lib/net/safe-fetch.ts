import { lookup } from "dns/promises";
import { isIP } from "net";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

export class ProxyError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** True for loopback, private, link-local, CGNAT, unspecified and their IPv6 forms. */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (version === 6) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  }
  return false;
}

/** Exact host, or "*.example.com" for any subdomain. */
export function hostMatches(hostname: string, patterns: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return patterns.some((pattern) => {
    const p = pattern.toLowerCase();
    if (p.startsWith("*.")) return host.endsWith(p.slice(1)) && host.length > p.length - 1;
    return host === p;
  });
}

export async function assertSafeImageUrl(rawUrl: string, allowedHosts: readonly string[]) {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProxyError(400, "Unsupported URL protocol");
  }
  // Fail closed: an empty allowlist allows nothing.
  if (!hostMatches(url.hostname, allowedHosts)) {
    throw new ProxyError(403, "Image host is not allowed");
  }
  if (isIP(url.hostname) && isPrivateIp(url.hostname)) {
    throw new ProxyError(403, "Private network targets are not allowed");
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.some(({ address }) => isPrivateIp(address))) {
    throw new ProxyError(403, "Private network targets are not allowed");
  }
  return url;
}

async function fetchFollowingRedirects(
  rawUrl: string,
  allowedHosts: readonly string[],
  redirects = 0,
): Promise<Response> {
  const url = await assertSafeImageUrl(rawUrl, allowedHosts);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "UdoCraftImageProxy/1.0" },
      redirect: "manual",
      signal: controller.signal,
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects >= MAX_REDIRECTS) throw new ProxyError(502, "Too many redirects");
      const location = response.headers.get("location");
      if (!location) throw new ProxyError(502, "Redirect missing location");
      return fetchFollowingRedirects(new URL(location, url).toString(), allowedHosts, redirects + 1);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches an allowlisted image with redirect, type and size checks. Throws ProxyError. */
export async function fetchImageBytes(rawUrl: string, allowedHosts: readonly string[]) {
  const response = await fetchFollowingRedirects(rawUrl, allowedHosts);
  if (!response.ok) throw new ProxyError(502, "Fetch failed");

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new ProxyError(415, "Unsupported content type");
  }
  if (Number(response.headers.get("content-length") ?? "0") > MAX_IMAGE_BYTES) {
    throw new ProxyError(413, "Image too large");
  }

  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_IMAGE_BYTES) throw new ProxyError(413, "Image too large");

  return { contentType, body };
}
