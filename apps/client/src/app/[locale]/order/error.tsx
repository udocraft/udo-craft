"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";

export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Order page error:", error);
    if (error.digest) console.error("Error digest:", error.digest);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold">Помилка завантаження каталогу</h2>
        <p className="text-muted-foreground">
          Не вдалося завантажити сторінку замовлення. Спробуйте ще раз або поверніться на головну.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center bg-primary hover:bg-primary/90 text-white font-bold text-sm px-6 py-3 rounded-full transition-all"
          >
            Спробувати знову
          </button>
          <Link
            href="/"
            className="inline-flex items-center border border-border hover:bg-accent text-foreground font-medium text-sm px-6 py-3 rounded-full transition-all"
          >
            На головну
          </Link>
        </div>
      </div>
    </div>
  );
}
