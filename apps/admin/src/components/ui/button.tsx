"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "border-border bg-background hover:bg-muted text-foreground",
      },
      size: {
        default: "h-11 min-h-[44px] gap-2 px-5",
        xs: "h-11 min-h-[44px] gap-1 px-4 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 min-h-[44px] gap-1.5 px-5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 min-h-[48px] gap-2 px-6 text-sm",
        icon: "size-11 min-w-[44px] min-h-[44px]",
        "icon-xs": "size-11 min-w-[44px] min-h-[44px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-11 min-w-[44px] min-h-[44px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-12 min-w-[48px] min-h-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}


export { Button, buttonVariants }
