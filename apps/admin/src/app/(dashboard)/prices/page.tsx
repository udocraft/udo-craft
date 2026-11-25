import { redirect } from "next/navigation";

/** Prices moved into Принти → Ціни. Old links and bookmarks keep working. */
export default async function PricesRedirect({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  redirect(type ? `/prints?tab=prices&type=${encodeURIComponent(type)}` : "/prints?tab=prices");
}
