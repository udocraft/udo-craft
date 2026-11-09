import * as React from "react"

import { cn } from "../../lib/utils"

type SectionHeaderProps = Omit<React.ComponentProps<"div">, "title"> & {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  lede?: React.ReactNode
  /** Optional right-aligned action (e.g. a "View all" link). */
  action?: React.ReactNode
  /** Heading level. Home sections use h2; the page title is the only h1. */
  as?: "h1" | "h2" | "h3"
  align?: "start" | "center"
}

const titleSize = {
  h1: "text-h1",
  h2: "text-h2",
  h3: "text-h3",
} as const

function SectionHeader({
  className,
  eyebrow,
  title,
  lede,
  action,
  as: Heading = "h2",
  align = "start",
  ...props
}: SectionHeaderProps) {
  const centered = align === "center"
  return (
    <div
      data-slot="section-header"
      className={cn(
        "mb-10 flex flex-col gap-4 md:mb-14 md:flex-row md:items-end md:justify-between",
        centered && "items-center text-center md:flex-col md:items-center md:justify-start",
        className
      )}
      {...props}
    >
      <div className={cn("max-w-2xl space-y-3", centered && "mx-auto")}>
        {eyebrow ? <p className="text-eyebrow text-brand">{eyebrow}</p> : null}
        <Heading className={cn(titleSize[Heading], "font-semibold text-balance text-foreground")}>
          {title}
        </Heading>
        {lede ? <p className="text-lede text-muted-foreground">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export { SectionHeader }
export type { SectionHeaderProps }
