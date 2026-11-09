import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md text-center space-y-6">
        <p className="text-8xl font-bold text-muted-foreground/30">404</p>
        <h1 className="text-3xl font-bold">Сторінку не знайдено</h1>
        <p className="text-muted-foreground text-lg">
          На жаль, сторінка, яку ви шукаєте, не існує або була переміщена.
        </p>
        <Link href="/" className={buttonVariants({ variant: "primary" })}>
          На головну
        </Link>
      </div>
    </main>
  );
}
