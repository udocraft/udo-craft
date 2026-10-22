import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { secretsMatch, webhookSecretUnconfigured } from "./webhook-auth";

const env = process.env as Record<string, string | undefined>;
const original = env.NODE_ENV;

beforeEach(() => {
  env.NODE_ENV = "production";
});
afterEach(() => {
  env.NODE_ENV = original;
});

describe("secretsMatch", () => {
  test("requires an exact match", () => {
    expect(secretsMatch("s3cret", "s3cret")).toBe(true);
    expect(secretsMatch("s3cre", "s3cret")).toBe(false);
    expect(secretsMatch("s3cretX", "s3cret")).toBe(false);
    expect(secretsMatch(null, "s3cret")).toBe(false);
  });
});

describe("webhookSecretUnconfigured", () => {
  test("returns 503 in production", async () => {
    const res = webhookSecretUnconfigured();
    expect(res?.status).toBe(503);
  });

  test("allows missing secret outside production", () => {
    env.NODE_ENV = "development";
    expect(webhookSecretUnconfigured()).toBeNull();
  });
});
