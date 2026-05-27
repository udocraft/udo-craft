import { lookup } from "dns/promises";
import { isIP } from "net";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/authz/guard";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

function allowedHosts() {
  return new Set(
    (process.env.IMAGE_PROXY_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isPrivateIp(ip: string) {
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

async function assertSafeUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Unsupported URL protocol");
  }

  const allowlist = allowedHosts();
  if (allowlist.size > 0 && !allowlist.has(url.hostname.toLowerCase())) {
    throw new Error("Image host is not allowed");
  }

  if (isIP(url.hostname) && isPrivateIp(url.hostname)) {
    throw new Error("Private IPs are not allowed");
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("Private network targets are not allowed");
  }

  return url;
}

async function fetchImage(rawUrl: string, redirects = 0): Promise<Response> {
  const url = await assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "UdoCraftImageProxy/1.0" },
      redirect: "manual",
      signal: controller.signal,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects >= MAX_REDIRECTS) throw new Error("Too many redirects");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect missing location");
      return fetchImage(new URL(location, url).toString(), redirects + 1);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const authz = await requireAdminPermission("uploads.manage");
  if (!authz.ok) return authz.response;

  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("Missing url", { status: 400 });

  try {
    const response = await fetchImage(rawUrl);
    if (!response.ok) return new NextResponse("Fetch failed", { status: 502 });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Unsupported content type", { status: 415 });
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_IMAGE_BYTES) {
      return new NextResponse("Image too large", { status: 413 });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return new NextResponse("Image too large", { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[proxy-image] blocked request", error);
    return new NextResponse("Proxy error", { status: 400 });
  }
}
