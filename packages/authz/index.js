const ADMIN_PERMISSIONS = [
  "admin.access",
  "users.manage",
  "system.hard_reset",
  "system.health",
  "catalog.read",
  "catalog.write",
  "erp.read",
  "erp.manage",
  "messages.read",
  "messages.manage",
  "analytics.read",
  "uploads.manage",
  "cms.read",
  "cms.manage",
  "ai.generate",
];

const ROLE_PERMISSIONS = {
  admin: [...ADMIN_PERMISSIONS],
  manager: [
    "admin.access",
    "catalog.read",
    "catalog.write",
    "erp.read",
    "erp.manage",
    "messages.read",
    "messages.manage",
    "analytics.read",
    "uploads.manage",
    "cms.read",
    "cms.manage",
    "ai.generate",
    "system.health",
  ],
  viewer: [
    "admin.access",
    "catalog.read",
    "erp.read",
    "messages.read",
    "analytics.read",
    "cms.read",
    "system.health",
  ],
  sewer: ["admin.access", "erp.read", "erp.manage", "messages.read"],
  seamstress: ["admin.access", "erp.read", "erp.manage", "messages.read"],
};

function isAdminPermission(value) {
  return ADMIN_PERMISSIONS.includes(value);
}

function permissionsForRoles(roles) {
  const permissions = new Set();

  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      permissions.add(permission);
    }
  }

  return permissions;
}

function hasPermission(permissions, required) {
  const permissionSet = permissions instanceof Set ? permissions : new Set(permissions);
  return permissionSet.has(required);
}

module.exports = {
  ADMIN_PERMISSIONS,
  ROLE_PERMISSIONS,
  isAdminPermission,
  permissionsForRoles,
  hasPermission,
};
