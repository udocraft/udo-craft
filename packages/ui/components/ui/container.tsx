import * as React from "react"

import { cn } from "../../lib/utils"

/**
 * Page-width wrapper. `default` is max-w-6xl (the dominant width in the
 * storefront), `prose` is max-w-3xl for long-form text. Gutter is the
 * `--spacing-gutter` token (16px, 24px from md).
 */
const containerWidths = {
  default: "max-w-6xl",
  prose: "max-w-3xl",
} as const

type ContainerProps = React.ComponentProps<"div"> & {
  width?: keyof typeof containerWidths
}

function Container({ className, width = "default", ...props }: ContainerProps) {
  return (
    <div
      data-slot="container"
      className={cn("mx-auto w-full px-gutter", containerWidths[width], className)}
      {...props}
    />
  )
}

export { Container, containerWidths }
export type { ContainerProps }
