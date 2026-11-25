"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Error boundary for every dashboard page. It renders inside the dashboard
 * layout, so the sidebar stays usable and staff can retry or move on.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] page error", error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <div className="max-w-md space-y-1.5">
        <h1 className="text-lg font-semibold">Сторінку не вдалося показати</h1>
        <p className="text-sm text-muted-foreground">
          Спробуйте ще раз. Якщо помилка повторюється, передайте розробникам код нижче.
        </p>
        {error.digest && <p className="font-mono text-xs text-muted-foreground select-all">{error.digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Спробувати знову</Button>
        <Link href="/orders" className={buttonVariants({ variant: "outline" })}>До замовлень</Link>
      </div>
    </div>
  );
}
