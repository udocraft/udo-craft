"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { BrandLogoFull } from "@/components/brand-logo";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

/** Full-screen login / sign-up page: form on the left, customer showcase on the right (lg+). */
export function AuthPage({ initialScreen = "login" }: { initialScreen?: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/cabinet";

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-2">
      <section className="flex min-h-dvh flex-col px-4 py-6 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="U:DO CRAFT" className="inline-block">
            <BrandLogoFull className="h-7 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            ← На сайт
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <AuthForm initialScreen={initialScreen} onAuthSuccess={() => router.push(returnTo)} />
          </div>
        </div>
      </section>

      {/* Phones: showcase sits below the form. Desktop: full-height side panel. */}
      <aside className="px-4 pb-8 sm:px-10 lg:p-4 lg:pb-4">
        <AuthShowcase />
      </aside>
    </main>
  );
}
