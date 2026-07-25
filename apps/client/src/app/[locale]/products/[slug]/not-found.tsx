import { Link } from "@/i18n/navigation";

export default function ProductNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md text-center space-y-6">
        <p className="text-6xl font-bold text-muted-foreground/30">404</p>
        <h1 className="text-2xl font-bold">Товар не знайдено</h1>
        <p className="text-muted-foreground">
          На жаль, цей товар не існує або більше не доступний.
        </p>
        <Link
          href="/order"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-all duration-200"
        >
          Переглянути каталог
        </Link>
      </div>
    </div>
  );
}
