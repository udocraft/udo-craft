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
    console.error("Global error caught in global-error.tsx:", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center bg-white text-black p-8 font-sans">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-4xl font-bold">Критична помилка</h1>
          <p className="opacity-60 text-lg">
            Виникла системна помилка. Ми вже працюємо над її виправленням.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 bg-black text-white font-bold text-sm px-8 py-3.5 rounded-full transition-all duration-200"
          >
            Спробувати знову
          </button>
        </div>
      </body>
    </html>
  );
}
