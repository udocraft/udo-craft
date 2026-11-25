"use client";

// Full-screen sign-up page (same form as /cabinet/login, opened on the register tab).

import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";

export default function CabinetRegisterPage() {
  return (
    <Suspense>
      <AuthPage initialScreen="register" />
    </Suspense>
  );
}
