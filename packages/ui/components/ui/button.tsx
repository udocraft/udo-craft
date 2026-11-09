"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"
import { buttonVariants } from "./button-variants"

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

export { Button }
export type { ButtonProps }
