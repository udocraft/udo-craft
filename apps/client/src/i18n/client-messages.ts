import type { AbstractIntlMessages } from "next-intl";

/**
 * Message namespaces read by client components (`useTranslations`) that render
 * on every page. Server components use `getTranslations`, which reads the
 * catalog on the server, so they never need to be shipped to the browser.
 * `client-messages.test.ts` fails when a client component asks for a namespace
 * that is not provided here or by its route.
 */
export const BASE_CLIENT_NAMESPACES = [
  "nav",
  "footer",
  "consent",
  "cart",
  "checkout",
  "checkoutErrors",
  "contactForm",
  "collections",
  "hero",
] as const;

/** Extra namespaces a route subtree adds on top of the base set. */
export const CABINET_NAMESPACES = ["cabinet"] as const;
/** Order page only: the customizer's drawing studio and share dialog. */
export const ORDER_NAMESPACES = ["drawing", "share"] as const;

export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const ns of namespaces) {
    if (messages[ns] !== undefined) picked[ns] = messages[ns];
  }
  return picked;
}
