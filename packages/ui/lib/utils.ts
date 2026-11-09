import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The type scale tokens (`text-h2`, `text-lede`...) are font sizes, not colours.
// Without this, twMerge reads `text-h2 text-foreground` as two colours and drops the size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "h4", "lede", "eyebrow"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
