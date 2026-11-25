import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Container } from "@udo-craft/ui";

interface MaterialSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl?: string;
  properties: { icon: LucideIcon; label: string }[];
}

/**
 * Full-bleed material story: one dimmed image edge to edge, a centred title with a row of
 * property icons and a short paragraph bottom-left. Uses the `.inverse` scope, so text and
 * scrims come from tokens.
 */
export function MaterialSection({ id, eyebrow, title, body, imageUrl, properties }: MaterialSectionProps) {
  return (
    <section id={`${id}`} aria-labelledby={`${id}-title`} className="inverse relative isolate flex min-h-[80dvh] scroll-mt-40 flex-col overflow-hidden">
      {imageUrl && <Image src={imageUrl} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-50" />}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/30 to-background/80" />

      <Container className="flex flex-1 flex-col py-20 lg:py-28 max-w-[88rem]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-4 max-w-3xl text-balance text-h1 font-medium">{title}</h2>
          {properties.length > 0 && (
            <ul className="mt-14 grid w-full max-w-4xl grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {properties.map(({ icon: Icon, label }) => (
                <li key={label} className="flex flex-col items-center gap-4 px-2">
                  <Icon className="size-11" strokeWidth={1.3} aria-hidden="true" />
                  <span className="text-sm text-foreground/90">{label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {body && <p className="mt-16 max-w-xl text-lg leading-relaxed text-foreground/90">{body}</p>}
      </Container>
    </section>
  );
}
