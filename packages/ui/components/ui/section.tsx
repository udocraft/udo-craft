import * as React from "react"

import { cn } from "../../lib/utils"
import { Container, type ContainerProps } from "./container"

/**
 * Page band with the section rhythm (`--spacing-section`) applied as vertical
 * padding. `tone="inverse"` switches to the dark `.inverse` scope, so children
 * keep using bg-background / text-foreground / text-muted-foreground.
 *
 * Content is wrapped in a Container unless `width="full"`.
 */
const sectionTones = {
  default: "",
  muted: "bg-surface-muted",
  inverse: "inverse",
} as const

type SectionProps = Omit<React.ComponentProps<"section">, "ref"> & {
  tone?: keyof typeof sectionTones
  width?: ContainerProps["width"] | "full"
  /** Class names for the inner Container (ignored when `width="full"`). */
  containerClassName?: string
}

function Section({
  className,
  tone = "default",
  width = "default",
  containerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      data-slot="section"
      data-tone={tone}
      className={cn("py-section", sectionTones[tone], className)}
      {...props}
    >
      {width === "full" ? (
        children
      ) : (
        <Container width={width} className={containerClassName}>
          {children}
        </Container>
      )}
    </section>
  )
}

export { Section, sectionTones }
export type { SectionProps }
