// Browser-safe: types and helpers only. The CMS fetch lives in site-contacts.ts (server).

/** Public contact details from the admin CMS (`cms_published.home_contact`), with code fallbacks. */
export interface SiteContacts {
  phone: string;
  email: string;
  instagram: string;
  telegram: string;
  tiktok: string;
  threads: string;
}

export const DEFAULT_CONTACTS: SiteContacts = {
  phone: "+380 63 070 33 072",
  email: "info@udocraft.com",
  instagram: "https://www.instagram.com/u.do.craft/",
  telegram: "https://t.me/udostore",
  tiktok: "https://www.tiktok.com/@u.do.craft",
  threads: "https://www.threads.net/@u.do.craft",
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");

export function contactsFromCms(body: Record<string, unknown> | null | undefined): SiteContacts {
  const b = body ?? {};
  return {
    phone: str(b.phone) || DEFAULT_CONTACTS.phone,
    email: str(b.email) || DEFAULT_CONTACTS.email,
    instagram: str(b.instagram) || DEFAULT_CONTACTS.instagram,
    telegram: str(b.telegram) || DEFAULT_CONTACTS.telegram,
    tiktok: str(b.tiktok) || DEFAULT_CONTACTS.tiktok,
    threads: str(b.threads) || DEFAULT_CONTACTS.threads,
  };
}

/** Digits and a leading "+" only, for tel: links. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
