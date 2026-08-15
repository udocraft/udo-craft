"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Global error caught in global-error.tsx:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black p-8 font-sans">
          <div className="max-w-md text-center space-y-6">
            <h1 className="text-4xl font-bold">Критична помилка</h1>
            <p className="opacity-60 text-lg">
              Виникла системна помилка. Ми вже працюємо над її виправленням.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}