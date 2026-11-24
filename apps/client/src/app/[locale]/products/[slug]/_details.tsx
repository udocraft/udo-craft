import {
  Clock3, Droplets, Feather, Layers, Leaf, Package, Palette, Printer, RefreshCcw, ShieldCheck, Shirt, Sparkles, Thermometer, Truck, Wind,
  ArrowRight, type LucideIcon,
} from "lucide-react";
import { Container } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description?: string;
}

const ICON_RULES: [RegExp, LucideIcon][] = [
  [/dtg|dtf|друк|принт|нанесен/i, Printer],
  [/вишив|нитк|шов/i, Sparkles],
  [/контрол|макет|якіст|перевір/i, ShieldCheck],
  [/відповід|еко|органі|природ/i, Leaf],
  [/волог|вод[аи]|дихаюч/i, Droplets],
  [/повітр|легк|вентил/i, Wind],
  [/тепл|зим|фліс|утепл/i, Thermometer],
  [/форм|прання|догляд|стабіл|стійк|довг/i, RefreshCcw],
  [/посадк|комфорт|зручн|м.як/i, Feather],
  [/тканин|бавовн|матеріал|щільн|трикотаж/i, Shirt],
  [/кол[іь]р|палітр|відтін/i, Palette],
  [/доставк/i, Truck],
  [/тираж|упаков|одиниц|шт\b/i, Package],
  [/термін|днів|виробництв/i, Clock3],
];

/** Picks a line icon from the item title by keyword. */
export function iconFor(title: string): LucideIcon {
  return ICON_RULES.find(([re]) => re.test(title))?.[1] ?? Layers;
}

/** Label-left / content-right row with a hairline on top. */
export function DetailRow({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-40 border-t border-border">
      <Container className="grid max-w-[88rem] gap-6 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10 lg:py-20">
        <h2 id={`${id}-title`} className="text-h2 font-medium text-balance">{title}</h2>
        <div className="min-w-0">{children}</div>
      </Container>
    </section>
  );
}

/** Paragraphs and "- bullet" lines from admin-authored plain text. */
export function RichText({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-•]\s+/.test(l));
  const paragraphs = lines.filter((l) => !/^[-•]\s+/.test(l));
  return (
    <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-foreground/85">
      {paragraphs.map((l) => <p key={l}>{l}</p>)}
      {bullets.length > 0 && (
        <ul className="space-y-3">
          {bullets.map((l) => (
            <li key={l} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-foreground/40" />
              <span>{l.replace(/^[-•]\s+/, "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Icon grid: line icon, title, muted description. */
export function FeatureGrid({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
      {items.map(({ icon: Icon, title, description }) => (
        <li key={title} className="flex flex-col gap-2">
          <Icon className="mb-2 size-9 text-foreground" strokeWidth={1.3} aria-hidden="true" />
          <p className="text-base font-semibold">{title}</p>
          {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </li>
      ))}
    </ul>
  );
}

export function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-8 inline-flex min-h-11 items-center gap-2 text-base font-medium underline underline-offset-4 hover:no-underline">
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
