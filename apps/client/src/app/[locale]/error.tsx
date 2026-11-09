"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
    if (error.digest) console.error("Error digest:", error.digest);
  }, [error]);

  return (
    <main id="main" className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold">Щось пішло не так</h1>
        <p className="text-muted-foreground text-lg">
          Виникла неочікувана помилка. Спробуйте оновити сторінку або поверніться пізніше.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-all duration-200"
        >
          Спробувати знову
        </button>
      </div>
    </main>
  );
}
