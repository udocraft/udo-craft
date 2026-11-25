import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { contactsFromCms, DEFAULT_CONTACTS, type SiteContacts } from "@/lib/contacts";

export type { SiteContacts } from "@/lib/contacts";

/** Cached for a minute, like the ISR pages that render the header. Never throws. */
export const getSiteContacts = unstable_cache(
  async (): Promise<SiteContacts> => {
    try {
      const { data } = await createServiceClient()
        .from("cms_published")
        .select("body")
        .eq("slug", "home_contact")
        .eq("is_active", true)
        .maybeSingle();
      return contactsFromCms(data?.body as Record<string, unknown> | undefined);
    } catch {
      return DEFAULT_CONTACTS;
    }
  },
  ["site-contacts"],
  { revalidate: 60 },
);
