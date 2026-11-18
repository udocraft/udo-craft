"use client";

// Full-screen sign-in page. Also used for the header "Увійти" link.

import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";

export default function CabinetLoginPage() {
  return (
    <Suspense>
      <AuthPage initialScreen="login" />
    </Suspense>
  );
}
