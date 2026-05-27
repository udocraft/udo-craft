export const ADMIN_PERMISSIONS = [
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
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
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
  sewer: ["admin.access", "erp.read", "erp.manage", "messages.read"],
  seamstress: ["admin.access", "erp.read", "erp.manage", "messages.read"],
};

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export function permissionsForRoles(roles: Iterable<string>): Set<AdminPermission> {
  const permissions = new Set<AdminPermission>();

  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      permissions.add(permission);
    }
  }

  return permissions;
}

export function hasPermission(
  permissions: Set<AdminPermission> | AdminPermission[],
  required: AdminPermission,
): boolean {
  const permissionSet = permissions instanceof Set ? permissions : new Set(permissions);
  return permissionSet.has(required);
}
