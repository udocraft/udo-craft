"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Admin Global error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">Системна помилка</h1>
        <p className="text-muted-foreground">
          Виникла неочікувана помилка в панелі управління. Наші спеціалісти вже повідомлені.
        </p>
        <div className="bg-muted p-4 rounded-md text-left overflow-auto max-h-32 text-xs text-muted-foreground">
          {error.message || "Невідома помилка"}
        </div>
        <Button
          onClick={reset}
          className="mt-4"
        >
          Спробувати знову
        </Button>
      </div>
    </div>
  );
}
