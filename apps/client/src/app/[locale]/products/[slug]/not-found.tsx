import { Link } from "@/i18n/navigation";
import { Button } from "@udo-craft/ui";

export default function ProductNotFound() {
  return (
    <main id="main" className="min-h-[60vh] flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md text-center space-y-6">
        <p className="text-6xl font-bold text-muted-foreground/30">404</p>
        <h1 className="text-2xl font-bold">Товар не знайдено</h1>
        <p className="text-muted-foreground">
          На жаль, цей товар не існує або більше не доступний.
        </p>
        <Button asChild variant="primary">
          <Link href="/order">
            Переглянути каталог
          </Link>
        </Button>
      </div>
    </main>
  );
}
