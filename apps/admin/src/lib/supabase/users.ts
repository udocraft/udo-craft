import type { createServiceClient } from "./service";

type ServiceClient = ReturnType<typeof createServiceClient>;

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

/**
 * Finds an auth user by email across all pages. listUsers returns at most one
 * page at a time, so a single call misses users beyond the first 1000.
 */
export async function findUserByEmail(service: ServiceClient, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < PAGE_SIZE) return null;
  }
  return null;
}
