"use client";

// This page handles direct visits to /cabinet/login (bookmarks, email links).
// The primary auth flow is via AuthModal (inline, no page navigation).

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { BrandLogoFull } from "@/components/brand-logo";
import { AuthModal } from "@/components/AuthModal";

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/cabinet";

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f0ff] via-background to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" aria-label="U:DO CRAFT" className="inline-block">
            <BrandLogoFull className="h-8 w-auto mx-auto" />
          </Link>
        </div>
        {/* AuthModal rendered as a static overlay on this page */}
        <AuthModal
          open={true}
          onClose={() => router.push("/")}
          initialScreen="login"
          onAuthSuccess={() => router.push(returnTo)}
        />
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">← Повернутись на сайт</Link>
        </p>
      </div>
    </main>
  );
}

export default function CabinetLoginPage() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
