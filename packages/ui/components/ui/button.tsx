"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-control border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-fast ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // `default` and `primary` are the same style; `primary` is the name used in the design system.
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        // For dark sections: light pill on the `.inverse` surface.
        inverse: "bg-foreground text-background hover:bg-foreground/90",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // md (44) is the default; sm 36 and lg 52 per the design system.
        default:
          "h-11 min-h-[44px] gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        md: "h-11 min-h-[44px] gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-2.5 text-xs in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-sm in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-13 gap-2 px-7 text-base has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6",
        icon: "size-11 min-h-[44px] min-w-[44px]",
        "icon-xs":
          "size-11 min-h-[44px] min-w-[44px] in-data-[slot=button-group]:rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-11 min-h-[44px] min-w-[44px] in-data-[slot=button-group]:rounded-full",
        "icon-lg": "size-13 min-h-[52px] min-w-[52px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * Render the single child element (e.g. a `next/link`) as the button
     * instead of a `<button>`. Maps to base-ui's `render` prop and sets
     * `nativeButton={false}` so keyboard and ARIA semantics stay correct.
     */
    asChild?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }))

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ children?: React.ReactNode }>
    return (
      <ButtonPrimitive
        data-slot="button"
        className={classes}
        render={child}
        nativeButton={false}
        {...props}
      >
        {child.props.children}
      </ButtonPrimitive>
    )
  }

  return (
    <ButtonPrimitive data-slot="button" className={classes} {...props}>
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
