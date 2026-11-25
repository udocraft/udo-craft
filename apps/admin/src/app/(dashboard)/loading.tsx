import { LogoLoader } from "@udo-craft/ui";

/** Route-level fallback for all dashboard pages: the logo loader centred in the content area. */
export default function DashboardLoading() {
  return <LogoLoader variant="block" className="min-h-[60vh]" />;
}
