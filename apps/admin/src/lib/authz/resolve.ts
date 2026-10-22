import {
  isAdminPermission,
  permissionsForRoles,
  type AdminPermission,
} from "@udo-craft/authz";

export type PermissionInput = {
  /** Role names from active memberships (server-owned). */
  membershipRoles: Iterable<string>;
  /** Permission keys attached directly to those memberships' roles. */
  directKeys: Iterable<string>;
  email?: string | null;
  /** Bootstrap access only applies once the email is verified. */
  emailConfirmed: boolean;
  bootstrapEmails: string[];
};

export function parseBootstrapEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Builds the admin permission set from server-owned sources only.
 * user_metadata is user-writable in Supabase, so it is never an input here.
 */
export function buildPermissionSet(input: PermissionInput): Set<AdminPermission> {
  const permissions = new Set<AdminPermission>();

  for (const key of input.directKeys) {
    if (isAdminPermission(key)) permissions.add(key);
  }

  for (const permission of permissionsForRoles(input.membershipRoles)) {
    permissions.add(permission);
  }

  const email = input.email?.toLowerCase();
  if (email && input.emailConfirmed && input.bootstrapEmails.includes(email)) {
    for (const permission of permissionsForRoles(["admin"])) {
      permissions.add(permission);
    }
  }

  return permissions;
}
