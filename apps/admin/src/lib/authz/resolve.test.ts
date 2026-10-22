import { describe, expect, test } from "vitest";
import { buildPermissionSet, parseBootstrapEmails } from "./resolve";

const base = {
  membershipRoles: [] as string[],
  directKeys: [] as string[],
  email: "customer@example.com",
  emailConfirmed: true,
  bootstrapEmails: [] as string[],
};

describe("buildPermissionSet", () => {
  test("customer with no membership gets no admin permissions", () => {
    expect(buildPermissionSet(base).size).toBe(0);
  });

  test("membership role grants that role's permissions only", () => {
    const set = buildPermissionSet({ ...base, membershipRoles: ["manager"] });
    expect(set.has("catalog.write")).toBe(true);
    expect(set.has("system.hard_reset")).toBe(false);
    expect(set.has("users.manage")).toBe(false);
  });

  test("unknown direct keys are dropped", () => {
    const set = buildPermissionSet({ ...base, directKeys: ["erp.read", "root.everything"] });
    expect([...set]).toEqual(["erp.read"]);
  });

  test("bootstrap email grants admin only when verified", () => {
    const bootstrapEmails = ["owner@example.com"];
    const verified = buildPermissionSet({
      ...base,
      email: "Owner@Example.com",
      emailConfirmed: true,
      bootstrapEmails,
    });
    const unverified = buildPermissionSet({
      ...base,
      email: "owner@example.com",
      emailConfirmed: false,
      bootstrapEmails,
    });
    expect(verified.has("system.hard_reset")).toBe(true);
    expect(unverified.size).toBe(0);
  });
});

describe("parseBootstrapEmails", () => {
  test("normalises and drops empties", () => {
    expect(parseBootstrapEmails(" A@x.com, ,b@x.com ")).toEqual(["a@x.com", "b@x.com"]);
    expect(parseBootstrapEmails(undefined)).toEqual([]);
  });
});
