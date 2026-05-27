const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  ADMIN_PERMISSIONS,
  ROLE_PERMISSIONS,
} = require("./index.js");

test("admin role includes every declared permission", () => {
  assert.deepEqual(new Set(ROLE_PERMISSIONS.admin), new Set(ADMIN_PERMISSIONS));
});

test("regular manager cannot manage users or hard reset", () => {
  assert.equal(ROLE_PERMISSIONS.manager.includes("users.manage"), false);
  assert.equal(ROLE_PERMISSIONS.manager.includes("system.hard_reset"), false);
});
