import { getSiteContacts } from "@/lib/site-contacts";
import { SiteHeaderClient } from "./SiteHeaderClient";

/** Server wrapper: reads the public contacts for the header's top bar, then renders the client header. */
export async function SiteHeader() {
  const contacts = await getSiteContacts();
  return <SiteHeaderClient contacts={contacts} />;
}
