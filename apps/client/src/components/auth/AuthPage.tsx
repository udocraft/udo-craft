"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { BrandLogoFull } from "@/components/brand-logo";
import { AuthForm } from "@/components/auth/AuthForm";
import { AUTH_SHOWCASE, AuthShowcase } from "@/components/auth/AuthShowcase";
import { cn } from "@/lib/utils";
import { safeReturnPath } from "@/lib/auth/redirect";

/** Full-screen login / sign-up page: form, plus a customer showcase on the right (lg+) once AUTH_SHOWCASE has real entries. */
export function AuthPage({ initialScreen = "login" }: { initialScreen?: "login" | "register" }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("returnTo"));
  const initialEmail = (searchParams.get("email") ?? "").slice(0, 254);
  const showcase = AUTH_SHOWCASE.length > 0;

  return (
    <main id="main" className={cn("grid min-h-dvh bg-background", showcase && "lg:grid-cols-2")}>
      <section className="flex min-h-dvh flex-col px-4 py-6 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="U:DO CRAFT" className="inline-block">
            <BrandLogoFull className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link href="/" className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              ← {t("backToSite")}
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <AuthForm initialScreen={initialScreen} initialEmail={initialEmail} onAuthSuccess={() => router.push(returnTo)} />
          </div>
        </div>
      </section>

      {/* Phones: showcase sits below the form. Desktop: full-height side panel. Hidden until real testimonials exist. */}
      {showcase && (
        <aside className="px-4 pb-8 sm:px-10 lg:p-4 lg:pb-4">
          <AuthShowcase />
        </aside>
      )}
    </main>
  );
}
