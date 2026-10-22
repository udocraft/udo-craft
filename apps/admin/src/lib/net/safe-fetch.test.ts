import { describe, expect, test } from "vitest";
import { assertSafeImageUrl, hostMatches, isPrivateIp } from "./safe-fetch";

describe("isPrivateIp", () => {
  test.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:10.0.0.1",
  ])("blocks %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  test.each(["8.8.8.8", "172.32.0.1", "2606:4700::1111"])("allows %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

describe("hostMatches", () => {
  test("matches exact hosts and wildcard subdomains only", () => {
    const patterns = ["cdn.example.com", "*.keycrm.app"];
    expect(hostMatches("cdn.example.com", patterns)).toBe(true);
    expect(hostMatches("x.keycrm.app", patterns)).toBe(true);
    expect(hostMatches("keycrm.app", patterns)).toBe(false);
    expect(hostMatches("evil-keycrm.app", patterns)).toBe(false);
  });

  test("empty allowlist allows nothing", () => {
    expect(hostMatches("cdn.example.com", [])).toBe(false);
  });
});

describe("assertSafeImageUrl", () => {
  test("rejects hosts outside the allowlist", async () => {
    await expect(assertSafeImageUrl("https://evil.test/a.png", ["cdn.example.com"])).rejects.toMatchObject({
      status: 403,
    });
  });

  test("rejects private IP literals even if allowlisted", async () => {
    await expect(assertSafeImageUrl("http://169.254.169.254/latest", ["169.254.169.254"])).rejects.toMatchObject({
      status: 403,
    });
  });

  test("rejects non-http protocols", async () => {
    await expect(assertSafeImageUrl("file:///etc/passwd", ["localhost"])).rejects.toMatchObject({
      status: 400,
    });
  });
});
