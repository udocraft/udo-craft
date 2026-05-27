export declare const ADMIN_PERMISSIONS: readonly [
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

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export declare const ROLE_PERMISSIONS: Record<string, AdminPermission[]>;

export declare function isAdminPermission(value: string): value is AdminPermission;

export declare function permissionsForRoles(roles: Iterable<string>): Set<AdminPermission>;

export declare function hasPermission(
  permissions: Iterable<AdminPermission>,
  required: AdminPermission,
): boolean;
