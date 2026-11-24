/**
 * Public contact details shown in the site menu.
 * Keep in sync with the defaults used on the homepage contact section.
 * Leave `tiktok` empty to hide the TikTok link.
 */
export const CONTACT = {
  phone: "+380 63 070 33 072",
  instagram: "https://www.instagram.com/u.do.craft/",
  telegram: "https://t.me/udostore",
  tiktok: "",
};

/** Digits and leading "+" only, for tel: links. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
